import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Siren,
  ShieldAlert,
  Zap,
  WifiOff,
  X,
  Radio,
  Activity,
  Clock,
} from "lucide-react";

import { useLive } from "../../context/LiveContext";

const TYPE_CONFIG = {
  log: { icon: FileText, color: "brand", label: "Log" },
  alert: { icon: Siren, color: "rose", label: "Alert" },
  incident: { icon: ShieldAlert, color: "amber", label: "Incident" },
  soar: { icon: Zap, color: "emerald", label: "SOAR" },
};

function ActivityItem({ item, index }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.log;
  const Icon = config.icon;
  const color = config.color;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.04 }}
      className="group flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-${color}-400/10`}>
        <Icon size={13} className={`text-${color}-300`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--text-primary)]">
          {item.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--text-muted)]">
          {item.description}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-[10px] text-${color}-300`}>{config.label}</span>
          {item.severity && (
            <span className="text-[10px] text-[var(--text-muted)] capitalize">
              {item.severity}
            </span>
          )}
          {item.timestamp && (
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">
              {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function LiveActivityFeed() {
  const { activity, newItems, dismissNew, isLive, toggleLive } = useLive();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-card)] shadow-glow backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Radio size={14} className={isLive ? "text-emerald-300" : "text-[var(--text-muted)]"} />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Live Activity
                </span>
                {isLive && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {newItems.length > 0 && (
                  <button
                    onClick={dismissNew}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Clear new
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activity.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                  <Clock size={20} />
                  <p className="text-xs">No recent activity</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {activity.map((item, idx) => (
                    <ActivityItem key={`${item.type}-${item.id}-${item.timestamp}`} item={item} index={idx} />
                  ))}
                </AnimatePresence>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-2">
              <button
                onClick={toggleLive}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-medium transition ${
                  isLive
                    ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                    : "bg-white/5 text-[var(--text-muted)] border border-white/10"
                }`}
              >
                <WifiOff size={12} />
                {isLive ? "Live streaming active" : "Resume live stream"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-[var(--surface-card)] text-[var(--text-primary)] shadow-glow backdrop-blur-xl transition hover:bg-white/5"
      >
        <Activity size={18} className={isLive ? "text-emerald-300" : "text-[var(--text-muted)]"} />
        {newItems.length > 0 && !open && (
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-rose-400 text-[9px] font-bold text-slate-950">
            {newItems.length > 9 ? "9+" : newItems.length}
          </span>
        )}
      </motion.button>
    </div>
  );
}

export default memo(LiveActivityFeed);

