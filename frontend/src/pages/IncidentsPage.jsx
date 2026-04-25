import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Zap, RefreshCw, ChevronRight, AlertTriangle } from "lucide-react";

import { fetchIncidents, fetchIncident, runCorrelation } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";
import InvestigationPanel from "../components/incident/InvestigationPanel";

function SeverityBadge({ severity }) {
  const colors = {
    low: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10",
    medium: "border-amber-400/30 text-amber-300 bg-amber-400/10",
    high: "border-rose-400/30 text-rose-300 bg-rose-400/10",
    critical: "border-fuchsia-400/30 text-fuchsia-300 bg-fuchsia-400/10",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${colors[severity] || colors.medium}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = {
    new: "border-slate-400/30 text-slate-300 bg-slate-400/10",
    in_progress: "border-brand-400/30 text-brand-300 bg-brand-400/10",
    investigating: "border-amber-400/30 text-amber-300 bg-amber-400/10",
    contained: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10",
    resolved: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10",
    closed: "border-slate-400/30 text-slate-300 bg-slate-400/10",
  };
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${colors[status] || colors.new}`}
    >
      {status.replace("_", " ")}
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
        No incidents yet. Run correlation or create incidents from alerts.
      </p>
    </motion.div>
  );
}

function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [correlating, setCorrelating] = useState(false);
  const [correlationMsg, setCorrelationMsg] = useState("");

  const load = (options = {}) => {
    setLoading(true);
    fetchIncidents({ limit: 20 }, options)
      .then((res) => setIncidents(res.items || []))
      .catch(() => setIncidents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedIncident(null);
      return;
    }
    setDetailLoading(true);
    fetchIncident(selectedId)
      .then(setSelectedIncident)
      .catch(() => setSelectedIncident(null))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleCorrelate = async () => {
    setCorrelating(true);
    try {
      const result = await runCorrelation(24);
      setCorrelationMsg(`Created ${result.length} new incidents from correlation.`);
      load({ force: true });
    } catch (err) {
      setCorrelationMsg(err.response?.data?.detail || "Correlation failed.");
    } finally {
      setCorrelating(false);
    }
  };

  const severityCount = (sev) => incidents.filter((i) => i.severity === sev).length;
  const activeCount = incidents.filter((i) =>
    ["new", "in_progress", "investigating"].includes(i.status)
  ).length;

  const refreshIncident = async () => {
    if (!selectedId) return;
    setDetailLoading(true);
    try {
      const updated = await fetchIncident(selectedId, { force: true });
      setSelectedIncident(updated);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Incidents"
        title="Investigation Center"
        description="Correlated security incidents with attack chains, timelines, and entity extraction."
        actions={
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCorrelate}
              disabled={correlating}
              className="flex items-center gap-2 rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300 disabled:opacity-70"
            >
              <Zap size={16} />
              {correlating ? "Correlating..." : "Run correlation"}
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

      <AnimatePresence>
        {correlationMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
          >
            <Panel className="py-4">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <ShieldAlert size={16} className="text-brand-300" />
                {correlationMsg}
                <button
                  onClick={() => setCorrelationMsg("")}
                  className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Dismiss
                </button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Incidents"
            value={incidents.length}
            helper="All incidents in the system"
            accent="brand"
          />
          <StatCard
            label="Active"
            value={activeCount}
            helper="Incidents awaiting action"
            accent="rose"
          />
          <StatCard
            label="Critical"
            value={severityCount("critical")}
            helper="Critical severity incidents"
            accent="fuchsia"
          />
          <StatCard
            label="High"
            value={severityCount("high")}
            helper="High severity incidents"
            accent="amber"
          />
        </div>
      )}

      <Panel>
        <div className="space-y-3">
          {loading ? (
            <SkeletonRows rows={5} />
          ) : incidents.length ? (
            incidents.map((incident, index) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.05,
                  type: "spring",
                  damping: 22,
                  stiffness: 260,
                }}
                whileHover={{
                  y: -2,
                  transition: { duration: 0.2 },
                }}
                onClick={() => setSelectedId(incident.id)}
                className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:border-brand-400/30 hover:bg-white/[0.06] hover:shadow-[0_12px_40px_rgba(34,211,238,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-[var(--text-primary)]">
                        {incident.title}
                      </p>
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 group-hover:translate-x-0.5"
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                      {incident.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert size={12} />
                    {incident.alerts?.length || 0} related alerts
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap size={12} />
                    {incident.attack_chain_json?.steps?.length || 0} attack steps
                  </span>
                  <span className="ml-auto">
                    {new Date(incident.created_at).toLocaleString()}
                  </span>
                </div>
              </motion.div>
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </Panel>

      {/* Investigation Panel */}
      <AnimatePresence>
        {selectedId && selectedIncident && !detailLoading && (
          <InvestigationPanel
            incident={selectedIncident}
            onClose={() => setSelectedId(null)}
            onIncidentUpdated={refreshIncident}
          />
        )}
      </AnimatePresence>

      {/* Loading state for panel */}
      <AnimatePresence>
        {selectedId && detailLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setSelectedId(null)}
          >
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-card)] px-8 py-6 shadow-glow">
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400/30 border-t-brand-400" />
                Loading investigation panel...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default IncidentsPage;

