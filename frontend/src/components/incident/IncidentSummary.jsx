import { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";

function IncidentSummary({ summary, confidence }) {
  const confidenceConfig = {
    high: { color: "emerald", label: "High Confidence", icon: ShieldCheck },
    medium: { color: "amber", label: "Medium Confidence", icon: AlertTriangle },
    low: { color: "rose", label: "Low Confidence", icon: AlertTriangle },
  };
  const config = confidenceConfig[confidence] || confidenceConfig.low;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-300" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
            AI Incident Summary
          </h3>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider border-${config.color}-400/30 bg-${config.color}-400/10 text-${config.color}-300`}
        >
          <Icon size={11} />
          {config.label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        {summary}
      </p>
    </motion.div>
  );
}

export default memo(IncidentSummary);

