import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  UserX,
  WifiOff,
  AlertCircle,
  Zap,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { blockIp, disableUser } from "../../api/platform";

const ACTION_CONFIG = {
  block_ip: {
    icon: WifiOff,
    color: "rose",
    label: "Block IP",
    description: "Add to firewall blocklist",
  },
  disable_user: {
    icon: UserX,
    color: "amber",
    label: "Disable User",
    description: "Deactivate account in IdP",
  },
  isolate_endpoint: {
    icon: Shield,
    color: "fuchsia",
    label: "Isolate Endpoint",
    description: "Quarantine from network",
  },
  escalate_priority: {
    icon: AlertCircle,
    color: "cyan",
    label: "Escalate Priority",
    description: "Mark as critical",
  },
};

function ActionCard({ action, onExecute, executing, executed }) {
  const config = ACTION_CONFIG[action.action] || {
    icon: Zap,
    color: "brand",
    label: action.action.replace("_", " ").toUpperCase(),
    description: "Recommended response action",
  };
  const Icon = config.icon;
  const color = config.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 transition-all ${
        executed
          ? `border-${color}-400/30 bg-${color}-400/5`
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-${color}-400/10`}>
            {executed ? (
              <CheckCircle2 size={16} className={`text-${color}-300`} />
            ) : (
              <Icon size={16} className={`text-${color}-300`} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {config.label}
              {action.target && (
                <span className="ml-1.5 text-[var(--text-muted)]">
                  ({action.target})
                </span>
              )}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">{config.description}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`text-xs font-semibold text-${color}-300`}>
            {action.confidence}%
          </span>
          <p className="text-[10px] text-[var(--text-muted)]">confidence</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
          {action.reason}
        </p>
        {!executed && action.action !== "escalate_priority" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onExecute(action)}
            disabled={executing}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-60 border-${color}-400/30 text-${color}-300 hover:bg-${color}-400/10`}
          >
            {executing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              "Execute"
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function RecommendedActions({ actions }) {
  const [executing, setExecuting] = useState(null);
  const [executed, setExecuted] = useState([]);
  const [status, setStatus] = useState("");

  const handleExecute = async (action) => {
    setExecuting(action.action);
    setStatus("");
    try {
      if (action.action === "block_ip" && action.target) {
        await blockIp({ ip_address: action.target, reason: action.reason });
      } else if (action.action === "disable_user" && action.target) {
        await disableUser({ username: action.target, reason: action.reason });
      } else {
        setStatus(`Action ${action.action} requires manual execution.`);
        setExecuting(null);
        return;
      }
      setExecuted((prev) => [...prev, action.action]);
      setStatus(`${action.action.replace("_", " ")} executed successfully.`);
    } catch (err) {
      setStatus(err.response?.data?.detail || "Action failed.");
    } finally {
      setExecuting(null);
    }
  };

  if (!actions?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
        No recommended actions for this incident.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl border px-4 py-2.5 text-xs ${
              status.includes("success")
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-rose-400/20 bg-rose-400/10 text-rose-300"
            }`}
          >
            {status}
          </motion.div>
        )}
      </AnimatePresence>
      {actions.map((action, idx) => (
        <ActionCard
          key={`${action.action}-${idx}`}
          action={action}
          onExecute={handleExecute}
          executing={executing === action.action}
          executed={executed.includes(action.action)}
        />
      ))}
    </div>
  );
}

export default memo(RecommendedActions);

