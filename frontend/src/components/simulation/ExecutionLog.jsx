import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Siren,
  ShieldAlert,
  Network,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const STEPS = [
  { key: "logs", label: "Generate Logs", icon: FileText },
  { key: "detection", label: "Trigger Detection", icon: Siren },
  { key: "alerts", label: "Create Alerts", icon: ShieldAlert },
  { key: "incidents", label: "Correlate Incidents", icon: Network },
];

function ExecutionLog({ result, error, running }) {
  const steps = [];

  if (running || result || error) {
    steps.push({ key: "logs", status: result ? "done" : "pending", count: result?.logs_created ?? 0 });
    steps.push({ key: "detection", status: result ? "done" : "pending" });
    steps.push({ key: "alerts", status: result?.alert_ids?.length ? "done" : result ? "done" : "pending", count: result?.alert_ids?.length ?? 0 });
    steps.push({ key: "incidents", status: result?.incident_ids?.length ? "done" : result ? (result.alert_ids?.length ? "pending" : "skipped") : "pending", count: result?.incident_ids?.length ?? 0 });
  }

  return (
    <AnimatePresence>
      {(running || result || error) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                Execution Pipeline
              </h3>
              {running && (
                <span className="flex items-center gap-1.5 text-[10px] text-brand-300">
                  <Loader2 size={12} className="animate-spin" />
                  Processing...
                </span>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs text-rose-300"
              >
                <AlertTriangle size={14} />
                {error}
              </motion.div>
            )}

            <div className="relative pl-4">
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-brand-400/30 via-brand-400/10 to-transparent" />
              <div className="space-y-4">
                {steps.map((step, idx) => {
                  const config = STEPS.find((s) => s.key === step.key);
                  const Icon = config?.icon || FileText;
                  const isDone = step.status === "done";
                  const isSkipped = step.status === "skipped";

                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="relative flex items-center gap-3"
                    >
                      <div
                        className={`z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                          isDone
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : isSkipped
                            ? "border-slate-400/30 bg-slate-400/10 text-slate-300"
                            : running && idx === steps.findIndex((s) => s.status !== "done")
                            ? "border-brand-400/30 bg-brand-400/10 text-brand-300"
                            : "border-white/10 bg-white/5 text-[var(--text-muted)]"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={14} />
                        ) : isSkipped ? (
                          <span className="text-[9px]">—</span>
                        ) : running && idx === steps.findIndex((s) => s.status !== "done") ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Icon size={12} />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs ${
                            isDone
                              ? "text-[var(--text-primary)]"
                              : isSkipped
                              ? "text-[var(--text-muted)] line-through"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {config?.label}
                        </span>
                        {step.count > 0 && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                            {step.count}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(ExecutionLog);

