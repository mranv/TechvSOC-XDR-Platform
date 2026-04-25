import { memo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Clock,
  FileText,
  Zap,
  CircleDot,
} from "lucide-react";

const TYPE_ICONS = {
  alert: AlertTriangle,
  incident_created: CheckCircle2,
  detection: Shield,
  correlation: Zap,
  note: FileText,
  default: CircleDot,
};

const TYPE_COLORS = {
  alert: "text-rose-300 bg-rose-400/15 border-rose-400/25",
  incident_created: "text-emerald-300 bg-emerald-400/15 border-emerald-400/25",
  detection: "text-brand-300 bg-brand-400/15 border-brand-400/25",
  correlation: "text-amber-300 bg-amber-400/15 border-amber-400/25",
  note: "text-slate-300 bg-slate-400/15 border-slate-400/25",
  default: "text-slate-300 bg-slate-400/15 border-slate-400/25",
};

function formatRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString();
}

function TimelineViewer({ events = [] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
  );

  if (!sorted.length) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Clock size={14} />
        <span>No timeline events available.</span>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Animated connector line */}
      <motion.div
        className="absolute left-[9px] top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-brand-400/50 via-brand-400/20 to-transparent"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ originY: 0 }}
      />

      <div className="space-y-5">
        {sorted.map((event, idx) => {
          const Icon = TYPE_ICONS[event.type] || TYPE_ICONS.default;
          const colorClass =
            TYPE_COLORS[event.type] || TYPE_COLORS.default;

          return (
            <motion.div
              key={`${event.type}-${idx}-${event.timestamp}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className="group relative"
            >
              {/* Timeline node */}
              <div
                className={`absolute -left-[1.15rem] top-1 grid h-[18px] w-[18px] place-items-center rounded-full border ${colorClass} transition-transform group-hover:scale-110`}
              >
                <Icon size={10} />
              </div>

              {/* Event card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-[0_8px_32px_rgba(34,211,238,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${colorClass}`}
                    >
                      {event.type}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {event.timestamp
                        ? formatRelativeTime(event.timestamp)
                        : ""}
                    </span>
                  </div>
                </div>

                <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)]">
                  {event.title || event.description || event.message}
                </p>

                {(event.description || event.message) && event.title && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {event.description || event.message}
                  </p>
                )}

                {event.severity && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        event.severity === "critical"
                          ? "bg-fuchsia-400"
                          : event.severity === "high"
                            ? "bg-rose-400"
                            : event.severity === "medium"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                      {event.severity}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TimelineViewer);

