import { memo } from "react";
import { motion } from "framer-motion";
import { Check, X, AlertTriangle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  executed: { icon: Check, color: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  blocked: { icon: X, color: "text-rose-300", bg: "bg-rose-400/10", border: "border-rose-400/20" },
  error: { icon: AlertTriangle, color: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  pending: { icon: Clock, color: "text-brand-300", bg: "bg-brand-400/10", border: "border-brand-400/20" },
};

function PlaybookLogViewer({ executions }) {
  if (!executions?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
        No playbook executions yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec, idx) => {
        const config = STATUS_CONFIG[exec.status] || STATUS_CONFIG.pending;
        const Icon = config.icon;
        return (
          <motion.div
            key={exec.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`flex items-center gap-3 rounded-xl border ${config.border} ${config.bg} px-4 py-3`}
          >
            <Icon size={14} className={config.color} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--text-primary)] truncate">
                {exec.action_type.replace(/_/g, " ").toUpperCase()} — {exec.target_value}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                {exec.incident_title}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`text-[10px] uppercase tracking-wider ${config.color}`}>
                {exec.status}
              </span>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                {new Date(exec.executed_at).toLocaleString()}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default memo(PlaybookLogViewer);

