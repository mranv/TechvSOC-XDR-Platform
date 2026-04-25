import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Shield,
  AlertTriangle,
  Info,
  Zap,
} from "lucide-react";

import { fetchScenarios, runSimulation } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { SkeletonRows } from "../components/ui/Skeleton";
import ScenarioCard from "../components/simulation/ScenarioCard";
import SimulationResults from "../components/simulation/SimulationResults";

function SimulationPage() {
  const [scenarios, setScenarios] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
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

  const handleRun = async (scenarioKey, params) => {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await runSimulation({
        scenario: scenarioKey,
        parameters: params,
        trigger_detection: true,
      });
      setResult(res);
    } catch (err) {
      setError(err.response?.data?.detail || "Simulation failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Attack Simulation"
        title="Red Team Simulator"
        description="Generate realistic attack scenarios to test detection rules, alert correlation, and incident response workflows."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={loadScenarios}
              disabled={loading}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              Refresh
            </button>
          </div>
        }
      />

      <Panel>
        <div className="flex items-start gap-3 rounded-2xl border border-brand-400/15 bg-brand-400/5 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-brand-300" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              How it works
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              Each scenario generates synthetic log entries that flow through the normal detection pipeline.
              The detection engine evaluates rules against these logs and creates alerts. You can then
              correlate alerts into incidents. All simulated logs are tagged with source="attack_simulator".
            </p>
          </div>
        </div>
      </Panel>

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

      {result && (
        <SimulationResults result={result} onReset={handleReset} />
      )}

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          Available Scenarios
        </h2>

        {loading ? (
          <SkeletonRows rows={4} />
        ) : scenarios ? (
          <div className="space-y-4">
            {Object.entries(scenarios).map(([key, config], index) => (
              <ScenarioCard
                key={key}
                scenarioKey={key}
                config={config}
                onRun={handleRun}
                running={running}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
            Unable to load scenarios. Check your connection and try again.
          </div>
        )}
      </div>
    </div>
  );
}

export default SimulationPage;

