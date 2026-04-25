import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  Clock,
  Hash,
  Server,
  Tag,
  FileText,
  ShieldAlert,
  Info,
  Activity,
  Bug,
} from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { icon: ShieldAlert, color: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20", dot: "bg-fuchsia-400" },
  error: { icon: ShieldAlert, color: "text-rose-300 bg-rose-400/10 border-rose-400/20", dot: "bg-rose-400" },
  warning: { icon: Activity, color: "text-amber-300 bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400" },
  info: { icon: Info, color: "text-brand-300 bg-brand-400/10 border-brand-400/20", dot: "bg-brand-400" },
  debug: { icon: Bug, color: "text-slate-300 bg-slate-400/10 border-slate-400/20", dot: "bg-slate-400" },
};

function DetailItem({ icon: Icon, label, value, monospace = false }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={13} className="text-[var(--brand-muted)]" />
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      </div>
      <p className={`text-sm text-[var(--text-secondary)] ${monospace ? "font-mono" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function LogDetailDrawer({ log, onClose }) {
  const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
  const SevIcon = cfg.icon;

  return (
    <AnimatePresence>
      {log && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--surface-card)] shadow-glow"
          >
            {/* Header */}
            <div className="shrink-0 border-b border-white/10 px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                    <motion.h2
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl"
                    >
                      {log.source}
                    </motion.h2>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="mt-2 flex flex-wrap items-center gap-2"
                  >
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${cfg.color}`}>
                      <SevIcon size={10} />
                      {log.severity}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-[var(--text-muted)]">
                      {log.event_type}
                    </span>
                  </motion.div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-white/10"
                >
                  <X size={16} className="inline" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <DetailItem icon={FileText} label="Message" value={log.message} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                    <Server size={12} />
                    Raw Log
                  </p>
                  <div className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-secondary)] font-mono">
                      <code>{log.raw_log}</code>
                    </pre>
                    <button
                      onClick={() => navigator.clipboard?.writeText(log.raw_log)}
                      className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[10px] text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-white/15 hover:text-[var(--text-primary)]"
                    >
                      <Copy size={11} />
                      Copy
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <DetailItem icon={Clock} label="Event Timestamp" value={new Date(log.event_timestamp).toLocaleString()} />
                  <DetailItem icon={Hash} label="Log ID" value={log.id} />
                  <DetailItem icon={Server} label="Endpoint ID" value={log.endpoint_id ?? "—"} />
                  <DetailItem icon={Tag} label="Event Type" value={log.event_type} />
                  <DetailItem icon={FileText} label="Source" value={log.source} />
                  <DetailItem icon={Clock} label="Created At" value={new Date(log.created_at).toLocaleString()} />
                </motion.div>

                {log.metadata_json && Object.keys(log.metadata_json).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                      Metadata
                    </p>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <pre className="overflow-x-auto text-xs text-[var(--text-secondary)] font-mono">
                        <code>{JSON.stringify(log.metadata_json, null, 2)}</code>
                      </pre>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(LogDetailDrawer);

