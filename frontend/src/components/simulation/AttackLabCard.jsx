import { memo } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  ShieldAlert,
  Fingerprint,
  Bug,
  Network,
  Lock,
  Server,
  AlertTriangle,
  Play,
  Loader2,
} from "lucide-react";

const ICONS = {
  brute_force: Fingerprint,
  suspicious_login: ShieldAlert,
  malware_execution: Bug,
  lateral_movement: Network,
  port_scan: Server,
  malware_beacon: Bug,
  data_exfiltration: AlertTriangle,
  privilege_escalation: Lock,
};

const GRADIENTS = {
  brute_force: "from-rose-400/10 to-rose-400/0 border-rose-400/20 hover:border-rose-400/40",
  suspicious_login: "from-amber-400/10 to-amber-400/0 border-amber-400/20 hover:border-amber-400/40",
  malware_execution: "from-fuchsia-400/10 to-fuchsia-400/0 border-fuchsia-400/20 hover:border-fuchsia-400/40",
  lateral_movement: "from-cyan-400/10 to-cyan-400/0 border-cyan-400/20 hover:border-cyan-400/40",
  port_scan: "from-emerald-400/10 to-emerald-400/0 border-emerald-400/20 hover:border-emerald-400/40",
  malware_beacon: "from-fuchsia-400/10 to-fuchsia-400/0 border-fuchsia-400/20 hover:border-fuchsia-400/40",
  data_exfiltration: "from-rose-400/10 to-rose-400/0 border-rose-400/20 hover:border-rose-400/40",
  privilege_escalation: "from-amber-400/10 to-amber-400/0 border-amber-400/20 hover:border-amber-400/40",
};

const ICON_COLORS = {
  brute_force: "text-rose-300",
  suspicious_login: "text-amber-300",
  malware_execution: "text-fuchsia-300",
  lateral_movement: "text-cyan-300",
  port_scan: "text-emerald-300",
  malware_beacon: "text-fuchsia-300",
  data_exfiltration: "text-rose-300",
  privilege_escalation: "text-amber-300",
};

function AttackLabCard({ scenarioKey, config, onRun, running }) {
  const Icon = ICONS[scenarioKey] || Zap;
  const gradient = GRADIENTS[scenarioKey] || GRADIENTS.brute_force;
  const iconColor = ICON_COLORS[scenarioKey] || "text-brand-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br ${gradient} backdrop-blur-md transition-all duration-300`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5`}>
              <Icon size={20} className={iconColor} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {config.label}
              </h3>
              <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">
                {config.description}
              </p>
            </div>
          </div>
          {config.mitre_technique && (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
              {config.mitre_technique}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onRun(scenarioKey)}
            disabled={running}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition disabled:opacity-60 ${
              scenarioKey === "brute_force" || scenarioKey === "malware_execution" || scenarioKey === "data_exfiltration"
                ? "bg-rose-400/10 text-rose-300 border border-rose-400/20 hover:bg-rose-400/20"
                : scenarioKey === "suspicious_login" || scenarioKey === "privilege_escalation"
                ? "bg-amber-400/10 text-amber-300 border border-amber-400/20 hover:bg-amber-400/20"
                : "bg-brand-400/10 text-brand-300 border border-brand-400/20 hover:bg-brand-400/20"
            }`}
          >
            {running ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {running ? "Running..." : "Simulate Attack"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(AttackLabCard);

