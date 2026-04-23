import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { fetchAlerts, fetchRules, runDetections } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";

function DetectionsPage() {
  const [rules, setRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [runState, setRunState] = useState({ running: false, message: "" });

  const loadDetections = (options = {}) => {
    setLoading(true);
    Promise.allSettled([
      fetchRules({}, options),
      fetchAlerts({ limit: 8 }, options),
    ])
      .then(([rulesResult, alertsResult]) => {
        setRules(rulesResult.status === "fulfilled" ? rulesResult.value : []);
        setAlerts(
          alertsResult.status === "fulfilled" ? alertsResult.value.items || [] : [],
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDetections();
  }, []);

  const handleRun = async () => {
    setRunState({ running: true, message: "" });
    try {
      const result = await runDetections(hours);
      setRunState({
        running: false,
        message: `Detection cycle scanned ${result.logs_scanned} logs and created ${result.alerts_created} alerts.`,
      });
      loadDetections({ force: true });
    } catch (error) {
      setRunState({
        running: false,
        message: error.response?.data?.detail || "Detection run failed.",
      });
    }
  };

  const criticalCount = useMemo(
    () => alerts.filter((item) => item.severity === "critical").length,
    [alerts],
  );
  const highCount = useMemo(
    () => alerts.filter((item) => item.severity === "high").length,
    [alerts],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detections"
        title="Detection engine workspace"
        description="Review active rules, inspect recent alerts, and trigger the backend detection cycle directly from the UI."
        actions={
          <div className="flex items-center gap-3">
            <select
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 72 hours</option>
            </select>
            <button
              type="button"
              onClick={handleRun}
              disabled={runState.running}
              className="rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300 disabled:opacity-70"
            >
              {runState.running ? "Running..." : "Run detections"}
            </button>
          </div>
        }
      />

      {loading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Rules"
            value={rules.length}
            helper="Available detection logic"
            accent="brand"
          />
          <StatCard
            label="Critical Alerts"
            value={criticalCount}
            helper="Immediate escalation candidates"
            accent="rose"
          />
          <StatCard
            label="High Alerts"
            value={highCount}
            helper="High-severity queue volume"
            accent="amber"
          />
        </div>
      )}

      {runState.message ? (
        <Panel className="py-4">
          <p className="text-sm text-slate-300">{runState.message}</p>
        </Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="text-xl font-semibold text-white">Detection rules</h2>
          <div className="mt-5 space-y-3">
            {loading ? (
              <SkeletonRows rows={4} />
            ) : rules.length ? (
              rules.map((rule, index) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{rule.name}</p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-brand-200">
                      {rule.rule_type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{rule.description}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No rules returned yet.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-xl font-semibold text-white">Recent alerts</h2>
          <div className="mt-5 space-y-3">
            {loading ? (
              <SkeletonRows rows={4} />
            ) : alerts.length ? (
              alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{alert.title}</p>
                    <span className="text-xs uppercase tracking-[0.2em] text-brand-200">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{alert.description}</p>
                </motion.div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No alerts returned yet.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default DetectionsPage;
