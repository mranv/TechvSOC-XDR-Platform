import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { fetchLogs } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonBlock, SkeletonStats } from "../components/ui/Skeleton";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    severity: "",
    source: "",
  });

  const loadLogs = (nextFilters = filters, options = {}) => {
    setLoading(true);
    const params = {
      limit: 12,
      ...(nextFilters.q ? { q: nextFilters.q } : {}),
      ...(nextFilters.severity ? { severity: nextFilters.severity } : {}),
      ...(nextFilters.source ? { source: nextFilters.source } : {}),
    };

    fetchLogs(params, options)
      .then((response) => setLogs(response.items || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const severityCounts = useMemo(
    () =>
      logs.reduce(
        (acc, log) => {
          acc[log.severity] = (acc[log.severity] || 0) + 1;
          return acc;
        },
        { error: 0, warning: 0, info: 0 },
      ),
    [logs],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Logs"
        title="Log management workspace"
        description="Search across ingested events, filter by severity and source, and review the latest messages flowing through TechvSOC XDR Platform."
      />

      {loading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Visible Logs"
            value={logs.length}
            helper="Current result set after frontend query filters"
            accent="brand"
          />
          <StatCard
            label="Errors"
            value={severityCounts.error || 0}
            helper="High-priority log events in the current view"
            accent="rose"
          />
          <StatCard
            label="Warnings"
            value={severityCounts.warning || 0}
            helper="Events worth follow-up or correlation"
            accent="amber"
          />
        </div>
      )}

      <Panel>
        <div className="grid gap-4 border-b border-white/10 pb-6 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <input
            value={filters.q}
            onChange={(event) =>
              setFilters((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="Search message, source, event type"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand-300"
          />
          <select
            value={filters.severity}
            onChange={(event) =>
              setFilters((current) => ({ ...current, severity: event.target.value }))
            }
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand-300"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <input
            value={filters.source}
            onChange={(event) =>
              setFilters((current) => ({ ...current, source: event.target.value }))
            }
            placeholder="Source filter"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-brand-300"
          />
          <button
            type="button"
            onClick={() => loadLogs(filters, { force: true })}
            className="rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300"
          >
            Search
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index + 1}`}>
                    <td colSpan="4" className="px-4 py-4">
                      <SkeletonBlock className="h-12 w-full rounded-2xl" />
                    </td>
                  </tr>
                ))
              ) : logs.length ? (
                logs.map((log, index) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-panel-800/45 text-slate-200"
                  >
                    <td className="px-4 py-3">{log.source}</td>
                    <td className="px-4 py-3">{log.event_type}</td>
                    <td className="px-4 py-3 uppercase text-brand-200">{log.severity}</td>
                    <td className="px-4 py-3 text-slate-300">{log.message}</td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-10 text-center text-slate-400">
                    No logs available yet. Ingest data from the backend or agent to populate this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export default LogsPage;
