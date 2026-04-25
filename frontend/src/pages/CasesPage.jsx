import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Plus,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  X,
  Link,
  Unlink,
  Trash2,
} from "lucide-react";

import {
  fetchCases,
  fetchCase,
  createCase,
  updateCase,
  deleteCase,
  addIncidentToCase,
  removeIncidentFromCase,
  fetchIncidents,
} from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";

function PriorityBadge({ priority }) {
  const colors = {
    low: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10",
    medium: "border-amber-400/30 text-amber-300 bg-amber-400/10",
    high: "border-rose-400/30 text-rose-300 bg-rose-400/10",
    critical: "border-fuchsia-400/30 text-fuchsia-300 bg-fuchsia-400/10",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${colors[priority] || colors.medium}`}
    >
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = {
    open: "border-brand-400/30 text-brand-300 bg-brand-400/10",
    closed: "border-slate-400/30 text-slate-300 bg-slate-400/10",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${colors[status] || colors.open}`}
    >
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-16 text-center"
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.05]">
        <AlertTriangle size={22} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        No cases yet. Create a case to group related incidents.
      </p>
    </motion.div>
  );
}

function CaseDetailPanel({ caseItem, onClose, onUpdated }) {
  const [incidents, setIncidents] = useState([]);
  const [allIncidents, setAllIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCase(caseItem.id, { force: true }), fetchIncidents({ limit: 50 }, { force: true })])
      .then(([caseData, incData]) => {
        setIncidents(caseData.incidents || []);
        setAllIncidents(incData.items || []);
      })
      .catch(() => {
        setIncidents(caseItem.incidents || []);
      })
      .finally(() => setLoading(false));
  }, [caseItem.id]);

  const handleLink = async (incidentId) => {
    setSaving(true);
    try {
      await addIncidentToCase(caseItem.id, incidentId);
      const updated = await fetchCase(caseItem.id, { force: true });
      setIncidents(updated.incidents || []);
      onUpdated?.();
    } finally {
      setSaving(false);
      setShowAdd(false);
    }
  };

  const handleUnlink = async (incidentId) => {
    setSaving(true);
    try {
      await removeIncidentFromCase(caseItem.id, incidentId);
      const updated = await fetchCase(caseItem.id, { force: true });
      setIncidents(updated.incidents || []);
      onUpdated?.();
    } finally {
      setSaving(false);
    }
  };

  const linkedIds = new Set(incidents.map((i) => i.id));
  const available = allIncidents.filter((i) => !linkedIds.has(i.id));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%", opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.5 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--surface-card)] shadow-glow"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-white/10 px-6 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">{caseItem.title}</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{caseItem.description}</p>
              </div>
              <button onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                <X size={16} className="inline" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={caseItem.priority} />
              <StatusBadge status={caseItem.status} />
              <span className="text-xs text-[var(--text-muted)]">
                {caseItem.incident_count} incident(s)
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                Linked Incidents
              </h3>
              <button
                onClick={() => setShowAdd((s) => !s)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[var(--text-primary)] transition hover:bg-white/10"
              >
                <Link size={12} />
                Link incident
              </button>
            </div>

            <AnimatePresence>
              {showAdd && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="mb-2 text-xs text-[var(--text-muted)]">Select an incident to link:</p>
                  {available.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No available incidents.</p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {available.map((inc) => (
                        <button
                          key={inc.id}
                          onClick={() => handleLink(inc.id)}
                          disabled={saving}
                          className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
                        >
                          <span className="truncate text-xs text-[var(--text-secondary)]">{inc.title}</span>
                          <Link size={12} className="shrink-0 text-[var(--text-muted)]" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <SkeletonRows rows={3} />
            ) : incidents.length ? (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <motion.div
                    key={inc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{inc.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{inc.severity} — {inc.status}</p>
                    </div>
                    <button
                      onClick={() => handleUnlink(inc.id)}
                      disabled={saving}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-rose-400/15 hover:text-rose-400"
                      title="Remove from case"
                    >
                      <Unlink size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No incidents linked to this case.</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  const load = (options = {}) => {
    setLoading(true);
    fetchCases({ limit: 20 }, options)
      .then((res) => setCases(res.items || []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim()) return;
    setCreating(true);
    try {
      await createCase({
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        incident_ids: [],
      });
      setNewTitle("");
      setNewDesc("");
      setNewPriority("medium");
      setShowCreate(false);
      load({ force: true });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this case?")) return;
    try {
      await deleteCase(id);
      load({ force: true });
      if (selectedId === id) setSelectedId(null);
    } catch {
      // ignore
    }
  };

  const openCount = cases.filter((c) => c.status === "open").length;
  const selectedCase = cases.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cases"
        title="Case Management"
        description="Group related incidents into cases for coordinated investigation and response."
        actions={
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300"
            >
              <Plus size={16} />
              New case
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => load({ force: true })}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10"
            >
              <RefreshCw size={14} />
              Refresh
            </motion.button>
          </div>
        }
      />

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-[var(--surface-card)] p-8 shadow-glow"
            >
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Create New Case</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-[var(--brand-muted)]">Title</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Case title..."
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[var(--brand-muted)]">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Describe the case..."
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-[var(--brand-muted)]">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim() || !newDesc.trim()}
                  className="rounded-xl bg-brand-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-300 disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create case"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Cases" value={cases.length} helper="All cases in the system" accent="brand" />
          <StatCard label="Open Cases" value={openCount} helper="Active investigations" accent="rose" />
          <StatCard label="Closed Cases" value={cases.length - openCount} helper="Resolved cases" accent="emerald" />
        </div>
      )}

      <Panel>
        <div className="space-y-3">
          {loading ? (
            <SkeletonRows rows={5} />
          ) : cases.length ? (
            cases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: "spring", damping: 22, stiffness: 260 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-all hover:border-brand-400/30 hover:bg-white/[0.06] hover:shadow-[0_12px_40px_rgba(34,211,238,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1" onClick={() => setSelectedId(caseItem.id)}>
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-[var(--text-primary)]">{caseItem.title}</p>
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 group-hover:translate-x-0.5"
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">{caseItem.description}</p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <PriorityBadge priority={caseItem.priority} />
                    <StatusBadge status={caseItem.status} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(caseItem.id);
                      }}
                      className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition hover:bg-rose-400/15 hover:text-rose-400 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={12} />
                    {caseItem.incident_count} incident(s)
                  </span>
                  <span className="ml-auto">{new Date(caseItem.created_at).toLocaleString()}</span>
                </div>
              </motion.div>
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </Panel>

      <AnimatePresence>
        {selectedId && selectedCase && (
          <CaseDetailPanel
            caseItem={selectedCase}
            onClose={() => setSelectedId(null)}
            onUpdated={() => load({ force: true })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default CasesPage;

