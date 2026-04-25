import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  FileText,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Clock,
} from "lucide-react";

function SimulationResults({ result, onReset }) {
  if (!result) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10">
              <CheckCircle2 size={20} className="text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Simulation Complete
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{result.summary}</p>
            </div>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-muted)] transition hover:bg-white/10"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <FileText size={14} className="text-brand-300" />
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {result.logs_created}
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Logs Generated</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <ShieldAlert size={14} className="text-rose-300" />
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {result.alert_ids?.length || 0}
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Alerts Triggered</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock size={14} className="text-amber-300" />
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {result.scenario?.replace("_", " ")}
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Scenario</p>
          </div>
        </div>

        {result.alert_ids && result.alert_ids.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-300" />
              <p className="text-xs text-[var(--text-secondary)]">
                Detection engine triggered {result.alert_ids.length} alert(s). View them in the
                Alerts or Incidents section.
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                to="/alerts"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-white/10"
              >
                View Alerts <ArrowRight size={11} />
              </Link>
              <Link
                to="/incidents"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-white/10"
              >
                View Incidents <ArrowRight size={11} />
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default memo(SimulationResults);

