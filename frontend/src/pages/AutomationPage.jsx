import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  blockIp,
  disableUser,
  fetchSoarActions,
  fetchPlaybooks,
  createPlaybook,
  updatePlaybook,
  deletePlaybook,
  fetchPlaybookExecutions,
} from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";
import PlaybookEditor from "../components/automation/PlaybookEditor";
import PlaybookLogViewer from "../components/automation/PlaybookLogViewer";

const TABS = [
  { key: "manual", label: "Manual Actions" },
  { key: "playbooks", label: "Playbooks" },
  { key: "logs", label: "Execution Logs" },
];

function AutomationPage() {
  const [activeTab, setActiveTab] = useState("manual");
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockForm, setBlockForm] = useState({
    ip_address: "",
    reason: "",
    duration_minutes: 60,
  });
  const [disableForm, setDisableForm] = useState({
    username: "",
    reason: "",
  });
  const [status, setStatus] = useState("");

  // Playbook state
  const [playbooks, setPlaybooks] = useState([]);
  const [playbooksLoading, setPlaybooksLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [execLoading, setExecLoading] = useState(false);

  const loadActions = (options = {}) => {
    setLoading(true);
    fetchSoarActions({ limit: 10 }, options)
      .then((res) => setActions(res.items || []))
      .catch(() => setActions([]))
      .finally(() => setLoading(false));
  };

  const loadPlaybooks = (options = {}) => {
    setPlaybooksLoading(true);
    fetchPlaybooks({}, options)
      .then((res) => setPlaybooks(res.items || []))
      .catch(() => setPlaybooks([]))
      .finally(() => setPlaybooksLoading(false));
  };

  const loadExecutions = async (playbookId) => {
    setExecLoading(true);
    try {
      const res = await fetchPlaybookExecutions(playbookId);
      setExecutions(res.items || []);
    } catch {
      setExecutions([]);
    } finally {
      setExecLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
    loadPlaybooks();
  }, []);

  const handleBlockIp = async () => {
    if (!blockForm.ip_address || !blockForm.reason) {
      setStatus("IP address and reason are required.");
      return;
    }
    setStatus("Executing block IP...");
    try {
      await blockIp(blockForm);
      setStatus(`Blocked IP ${blockForm.ip_address} (simulated).`);
      setBlockForm({ ip_address: "", reason: "", duration_minutes: 60 });
      loadActions({ force: true });
    } catch (err) {
      setStatus(err.response?.data?.detail || "Block IP failed.");
    }
  };

  const handleDisableUser = async () => {
    if (!disableForm.username || !disableForm.reason) {
      setStatus("Username and reason are required.");
      return;
    }
    setStatus("Executing disable user...");
    try {
      await disableUser(disableForm);
      setStatus(`Disabled user ${disableForm.username} (simulated).`);
      setDisableForm({ username: "", reason: "" });
      loadActions({ force: true });
    } catch (err) {
      setStatus(err.response?.data?.detail || "Disable user failed.");
    }
  };

  const handleSavePlaybook = async (payload) => {
    try {
      if (editingPlaybook) {
        await updatePlaybook(editingPlaybook.id, payload);
      } else {
        await createPlaybook(payload);
      }
      setShowEditor(false);
      setEditingPlaybook(null);
      loadPlaybooks({ force: true });
      setStatus(editingPlaybook ? "Playbook updated." : "Playbook created.");
    } catch (err) {
      setStatus(err.response?.data?.detail || "Failed to save playbook.");
    }
  };

  const handleDeletePlaybook = async (id) => {
    if (!window.confirm("Delete this playbook?")) return;
    try {
      await deletePlaybook(id);
      loadPlaybooks({ force: true });
      setStatus("Playbook deleted.");
    } catch (err) {
      setStatus(err.response?.data?.detail || "Delete failed.");
    }
  };

  const handleTogglePlaybook = async (pb) => {
    try {
      await updatePlaybook(pb.id, { is_enabled: !pb.is_enabled });
      loadPlaybooks({ force: true });
    } catch (err) {
      setStatus("Toggle failed.");
    }
  };

  const blockCount = actions.filter((a) => a.action_type === "block_ip").length;
  const disableCount = actions.filter(
    (a) => a.action_type === "disable_user"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="SOAR & Playbooks"
        description="Execute manual response actions and manage automated playbook rules."
      />

      {loading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Total Actions"
            value={actions.length}
            helper="Executed SOAR actions"
            accent="brand"
          />
          <StatCard
            label="Block IPs"
            value={blockCount}
            helper="IP blocking actions"
            accent="rose"
          />
          <StatCard
            label="Disable Users"
            value={disableCount}
            helper="Account disable actions"
            accent="amber"
          />
          <StatCard
            label="Playbooks"
            value={playbooks.length}
            helper="Automation rules"
            accent="emerald"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1.5">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium uppercase tracking-wider transition ${
                active
                  ? "bg-[var(--interactive)] text-[var(--interactive-contrast)]"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {status && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-brand-400/20 bg-brand-400/10 px-4 py-2.5 text-xs text-brand-300"
        >
          {status}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* Manual Actions Tab */}
        {activeTab === "manual" && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Block IP Address</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Simulate blocking a malicious IP address at the firewall level.
                </p>
                <div className="mt-4 space-y-3">
                  <input
                    value={blockForm.ip_address}
                    onChange={(e) =>
                      setBlockForm((c) => ({ ...c, ip_address: e.target.value }))
                    }
                    placeholder="IP address (e.g. 192.168.1.100)"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                  <input
                    value={blockForm.reason}
                    onChange={(e) =>
                      setBlockForm((c) => ({ ...c, reason: e.target.value }))
                    }
                    placeholder="Reason for blocking"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={blockForm.duration_minutes}
                      onChange={(e) =>
                        setBlockForm((c) => ({
                          ...c,
                          duration_minutes: parseInt(e.target.value, 10) || 60,
                        }))
                      }
                      className="w-32 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[var(--text-primary)] outline-none"
                    />
                    <span className="text-sm text-[var(--text-muted)]">minutes</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBlockIp}
                    className="w-full rounded-2xl bg-rose-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-rose-300"
                  >
                    Block IP (simulate)
                  </motion.button>
                </div>
              </Panel>

              <Panel>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Disable User</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Simulate disabling a compromised user account.
                </p>
                <div className="mt-4 space-y-3">
                  <input
                    value={disableForm.username}
                    onChange={(e) =>
                      setDisableForm((c) => ({ ...c, username: e.target.value }))
                    }
                    placeholder="Username"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                  <input
                    value={disableForm.reason}
                    onChange={(e) =>
                      setDisableForm((c) => ({ ...c, reason: e.target.value }))
                    }
                    placeholder="Reason for disabling"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDisableUser}
                    className="w-full rounded-2xl bg-amber-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
                  >
                    Disable User (simulate)
                  </motion.button>
                </div>
              </Panel>
            </div>

            <Panel>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent actions</h2>
              <div className="mt-4 space-y-2">
                {loading ? (
                  <SkeletonRows rows={4} />
                ) : actions.length ? (
                  actions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {action.action_type.replace("_", " ").toUpperCase()}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Target: {action.target_value}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase ${
                          action.status === "completed"
                            ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/10"
                            : "border-amber-400/30 text-amber-300 bg-amber-400/10"
                        }`}
                      >
                        {action.status}
                      </span>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                    No SOAR actions executed yet.
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>
        )}

        {/* Playbooks Tab */}
        {activeTab === "playbooks" && (
          <motion.div
            key="playbooks"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                Playbooks
              </h2>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setEditingPlaybook(null);
                  setShowEditor(true);
                }}
                className="flex items-center gap-2 rounded-2xl bg-brand-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-300"
              >
                + New Playbook
              </motion.button>
            </div>

            {showEditor && (
              <Panel>
                <PlaybookEditor
                  initialPlaybook={editingPlaybook}
                  onSave={handleSavePlaybook}
                  onCancel={() => {
                    setShowEditor(false);
                    setEditingPlaybook(null);
                  }}
                />
              </Panel>
            )}

            {playbooksLoading ? (
              <SkeletonRows rows={4} />
            ) : playbooks.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {playbooks.map((pb) => (
                  <motion.div
                    key={pb.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-brand-400/20 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {pb.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">
                          {pb.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleTogglePlaybook(pb)}
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase ${
                          pb.is_enabled
                            ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border border-white/10 bg-white/5 text-[var(--text-muted)]"
                        }`}
                      >
                        {pb.is_enabled ? "On" : "Off"}
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                      <span>{pb.rules_json?.length || 0} rules</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(pb.updated_at).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPlaybook(pb);
                          setShowEditor(true);
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlaybook(pb);
                          loadExecutions(pb.id);
                          setActiveTab("logs");
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-[var(--text-secondary)] transition hover:bg-white/10"
                      >
                        Logs
                      </button>
                      <button
                        onClick={() => handleDeletePlaybook(pb.id)}
                        className="ml-auto rounded-lg border border-rose-400/20 bg-rose-400/5 px-2.5 py-1 text-[11px] text-rose-300 transition hover:bg-rose-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                No playbooks yet. Create your first automation rule above.
              </div>
            )}
          </motion.div>
        )}

        {/* Execution Logs Tab */}
        {activeTab === "logs" && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                Execution Logs
              </h2>
              {selectedPlaybook && (
                <span className="text-xs text-[var(--text-muted)]">
                  Playbook: {selectedPlaybook.name}
                </span>
              )}
            </div>
            <Panel>
              {execLoading ? (
                <SkeletonRows rows={4} />
              ) : (
                <PlaybookLogViewer executions={executions} />
              )}
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AutomationPage;
