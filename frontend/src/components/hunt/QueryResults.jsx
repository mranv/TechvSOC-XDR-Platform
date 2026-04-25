import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Info,
  Bug,
  Activity,
  Clock,
  Hash,
  Server,
  Tag,
} from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20", dot: "bg-fuchsia-400" },
  error: { icon: AlertTriangle, color: "text-rose-300 bg-rose-400/10 border-rose-400/20", dot: "bg-rose-400" },
  warning: { icon: Activity, color: "text-amber-300 bg-amber-400/10 border-amber-400/20", dot: "bg-amber-400" },
  info: { icon: Info, color: "text-brand-300 bg-brand-400/10 border-brand-400/20", dot: "bg-brand-400" },
  debug: { icon: Bug, color: "text-slate-300 bg-slate-400/10 border-slate-400/20", dot: "bg-slate-400" },
};

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${cfg.color}`}>
      <Icon size={10} />
      {severity}
    </span>
  );
}

function LogRow({ log, index, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), type: "spring", damping: 22, stiffness: 260 }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05]"
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded((e) => !e)}
      >
        <button className="shrink-0 text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">{log.source}</span>
            <SeverityBadge severity={log.severity} />
          </div>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{log.message}</p>
        </div>

        <div className="hidden shrink-0 items-center gap-4 text-[11px] text-[var(--text-muted)] sm:flex">
          <span className="flex items-center gap-1">
            <Tag size={11} />
            {log.event_type}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {new Date(log.event_timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-white/5"
          >
            <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                  <FileText size={11} />
                  Full Message
                </p>
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {log.message}
                </p>
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                  <Server size={11} />
                  Raw Log
                </p>
                <div className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <pre className="overflow-x-auto text-[11px] leading-relaxed text-[var(--text-muted)] font-mono">
                    <code>{log.raw_log}</code>
                  </pre>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard?.writeText(log.raw_log);
                    }}
                    className="absolute right-2 top-2 rounded-md bg-white/10 px-2 py-1 text-[10px] text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-white/15 hover:text-[var(--text-primary)]"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 px-4 pb-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Endpoint ID</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{log.endpoint_id ?? "—"}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Event Timestamp</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {new Date(log.event_timestamp).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Log ID</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <Hash size={10} />
                  {log.id}
                </p>
              </div>
            </div>

            {log.metadata_json && Object.keys(log.metadata_json).length > 0 && (
              <div className="px-4 pb-4">
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                  Metadata
                </p>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <pre className="overflow-x-auto text-[11px] text-[var(--text-muted)] font-mono">
                    <code>{JSON.stringify(log.metadata_json, null, 2)}</code>
                  </pre>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-white/5 px-4 py-3">
              <button
                onClick={(e) => { e.stopPropagation(); onSelect?.(log); }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-white/10"
              >
                Open Detail
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function QueryResults({ logs, loading, total, skip, limit, onPageChange, onSelectLog }) {
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="skeleton h-4 w-32 rounded-lg" />
            <div className="skeleton mt-3 h-3 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {total.toLocaleString()} results
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            Showing {Math.min(skip + 1, total)}-{Math.min(skip + limit, total)}
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, skip - limit))}
              disabled={skip === 0}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-[var(--text-muted)] transition hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-secondary)]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(skip + limit)}
              disabled={skip + limit >= total}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-[var(--text-muted)] transition hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map((log, idx) => (
            <LogRow key={log.id} log={log} index={idx} onSelect={onSelectLog} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-16 text-center"
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.05]">
            <FileText size={22} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No results found. Adjust your filters and try again.</p>
        </motion.div>
      )}
    </div>
  );
}

export default memo(QueryResults);

