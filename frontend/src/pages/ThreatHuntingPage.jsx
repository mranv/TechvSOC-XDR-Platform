import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Globe,
  ShieldAlert,
  Activity,
  Clock,
  Bookmark,
  Zap,
  AlertTriangle,
  Loader2,
  Terminal,
} from "lucide-react";

import { fetchLogs, lookupThreatIntel, runHuntQuery, saveHuntQuery, fetchSavedHuntQueries } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import QueryBuilder from "../components/hunt/QueryBuilder";
import QueryResults from "../components/hunt/QueryResults";
import LogDetailDrawer from "../components/hunt/LogDetailDrawer";

function IntelResultCard({ intel }) {
  if (!intel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-400/10">
            <Globe size={18} className="text-brand-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Threat Intelligence
            </h3>
            <p className="text-xs text-[var(--text-muted)]">{intel.ip_address}</p>
          </div>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider ${
            intel.is_malicious
              ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          }`}
        >
          {intel.is_malicious ? "Malicious" : "Clean"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Country</p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {intel.country || "Unknown"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Reputation
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {intel.reputation_score}/100
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Confidence
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {intel.confidence ?? "—"}
          </p>
        </div>
      </div>

      {intel.threat_categories && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">Categories:</span>
          {intel.threat_categories.split(",").map((cat) => (
            <span
              key={cat}
              className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] text-amber-300"
            >
              {cat.trim()}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ThreatHuntingPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(20);
  const [lastParams, setLastParams] = useState(null);
  const [intel, setIntel] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelQuery, setIntelQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const runSearch = useCallback(
    async (params = {}, newSkip = 0) => {
      setLoading(true);
      try {
        const searchParams = { ...params, skip: newSkip, limit };
        const result = await fetchLogs(searchParams, { force: true });
        setLogs(result.items || []);
        setTotal(result.total || 0);
        setSkip(newSkip);
        setLastParams(params);
      } catch {
        setLogs([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  const runDslSearch = useCallback(
    async (query, newSkip = 0) => {
      setLoading(true);
      try {
        const result = await runHuntQuery(query, newSkip, limit);
        setLogs(result.items || []);
        setTotal(result.total || 0);
        setSkip(newSkip);
        setLastParams({ dsl: query });
      } catch {
        setLogs([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  const handlePageChange = useCallback(
    (newSkip) => {
      if (lastParams) {
        runSearch(lastParams, newSkip);
      }
    },
    [lastParams, runSearch]
  );

  const runIntelLookup = async () => {
    if (!intelQuery.trim()) return;
    setIntelLoading(true);
    try {
      const result = await lookupThreatIntel(intelQuery.trim());
      setIntel(result);
    } catch {
      setIntel(null);
    } finally {
      setIntelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Threat Hunting"
        title="Advanced Query Builder"
        description="Build complex log queries with visual filters, save reusable templates, and perform threat intelligence lookups."
      />

      {/* Intel Lookup Bar */}
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Globe
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              value={intelQuery}
              onChange={(e) => setIntelQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runIntelLookup()}
              placeholder="Enter IP address for threat intelligence lookup..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={runIntelLookup}
            disabled={intelLoading || !intelQuery.trim()}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-[var(--text-primary)] transition hover:bg-white/10 disabled:opacity-60"
          >
            {intelLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            Intel lookup
          </motion.button>
        </div>
      </Panel>

      <AnimatePresence>
        {intel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <IntelResultCard intel={intel} />
          </motion.div>
        )}
      </AnimatePresence>


      <Panel>
        <QueryBuilder onSearch={runSearch} searching={loading} />
      </Panel>

      {/* Results */}
      <Panel>
        <div className="mb-4 flex items-center gap-2">
          <Search size={16} className="text-[var(--brand-muted)]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
            Query Results
          </h3>
          {total > 0 && (
            <span className="ml-auto text-xs text-[var(--text-muted)]">
              {total.toLocaleString()} total
            </span>
          )}
        </div>
        <QueryResults
          logs={logs}
          loading={loading}
          total={total}
          skip={skip}
          limit={limit}
          onPageChange={handlePageChange}
          onSelectLog={setSelectedLog}
        />
      </Panel>

      {/* Log Detail Drawer */}
      <AnimatePresence>
        {selectedLog && (
          <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ThreatHuntingPage;

