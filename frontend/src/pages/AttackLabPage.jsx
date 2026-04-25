import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  RefreshCw,
  ChevronRight,
  Siren,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

import { fetchScenarios, runSimulation } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";
import AttackLabCard from "../components/simulation/AttackLabCard";
import ExecutionLog from "../components/simulation/ExecutionLog";

const QUICK_SCENARIOS = [
  "brute_force",
  "suspicious_login",
  "malware_execution",
  "lateral_movement",
];

function ResultCard({ result }) {
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-400/10">
          <ShieldAlert size={16} className="text-emerald-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Simulation Complete
          </p>
          <p className="text-xs text-[var(--text-muted)]">{result.summary}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{result.logs_created}</p>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Logs</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{result.alert_ids?.length || 0}</p>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Alerts</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{result.incident_ids?.length || 0}</p>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Incidents</p>
        </div>
      </div>

      {result.incident_ids?.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
            Correlated Incidents
          </p>
          {result.incident_ids.map((id) => (
            <a
              key={id}
              href={`/incidents`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 transition hover:border-brand-400/30 hover:bg-white/[0.06]"
            >
              <span className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Siren size={14} className="text-rose-300" />
                Incident #{id}
              </span>
              <ChevronRight size={14} className="text-[var(--text-muted)]" />
            </a>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AttackLabPage() {
  const [scenarios, setScenarios] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningScenario, setRunningScenario] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const loadScenarios = () => {
    setLoading(true);
    fetchScenarios()
      .then(setScenarios)
      .catch(() => setScenarios(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const handleRun = async (scenarioKey) => {
    setRunningScenario(scenarioKey);
    setError("");
    setResult(null);
    try {
      const res = await runSimulation({
        scenario: scenarioKey,
        parameters: {},
        trigger_detection: true,
        auto_correlate: true,
      });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || "Simulation failed.");
    } finally {
      setRunningScenario(null);
    }
  };

  const quickScenarios = scenarios
    ? QUICK_SCENARIOS.map((key) => ({ key, config: scenarios[key] })).filter((s) => s.config)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Red Team"
        title="Attack Lab"
        description="Fire realistic attack scenarios with one click. Watch logs flow through detection, alerts, and incident correlation in real time."
        actions={
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={loadScenarios}
              disabled={loading}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              <RefreshCw size={14} />
              Refresh
            </motion.button>
          </div>
        }
      />

      <Panel>
        <div className="flex items-start gap-3 rounded-2xl border border-brand-400/15 bg-brand-400/5 p-4">
          <FlaskConical size={18} className="mt-0.5 shrink-0 text-brand-300" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              One-Click Attack Simulation
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Each attack generates synthetic telemetry, triggers detection rules, creates alerts, and runs correlation to produce incidents. All simulated data is tagged with source="attack_simulator".
            </p>
          </div>
        </div>
      </Panel>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4"
          >
            <AlertTriangle size={16} className="text-rose-300" />
            <p className="text-sm text-rose-200">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <ExecutionLog result={result} error={error} running={!!runningScenario} />

      <AnimatePresence>
        {result && <ResultCard result={result} />}
      </AnimatePresence>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          Quick Attack Scenarios
        </h2>

        {loading ? (
          <SkeletonStats count={4} />
        ) : quickScenarios.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickScenarios.map(({ key, config }) => (
              <AttackLabCard
                key={key}
                scenarioKey={key}
                config={config}
                onRun={handleRun}
                running={runningScenario === key}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
            Unable to load scenarios.
          </div>
        )}
      </div>

      {/* All scenarios list */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          All Scenarios
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios &&
            Object.entries(scenarios).map(([key, config]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {config.label}
                  </span>
                  {config.mitre_technique && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                      {config.mitre_technique}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-muted)] line-clamp-2">
                  {config.description}
                </p>
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default AttackLabPage;

