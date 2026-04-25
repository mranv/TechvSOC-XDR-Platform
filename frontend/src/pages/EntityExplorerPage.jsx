import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Search,
  Globe,
  User,
  Server,
  ShieldAlert,
  Clock,
  Activity,
  Filter,
} from "lucide-react";

import { searchEntities } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { SkeletonRows } from "../components/ui/Skeleton";

const TYPE_CONFIG = {
  ip: { icon: Globe, color: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20", label: "IP Address" },
  user: { icon: User, color: "text-amber-300 bg-amber-400/10 border-amber-400/20", label: "User" },
  host: { icon: Server, color: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20", label: "Host" },
};

const SEVERITY_COLORS = {
  critical: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20",
  high: "text-rose-300 bg-rose-400/10 border-rose-400/20",
  medium: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  low: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
};

function EntityResultCard({ entity, index }) {
  const config = TYPE_CONFIG[entity.type] || TYPE_CONFIG.ip;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={`/entities/${entity.type}/${encodeURIComponent(entity.value)}`}
        className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition-all duration-300 hover:border-brand-400/30 hover:bg-white/[0.07]"
      >
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${config.color}`}>
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">{entity.value}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Activity size={11} />
              {entity.total_events} events
            </span>
            {entity.first_seen && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                First: {new Date(entity.first_seen).toLocaleDateString()}
              </span>
            )}
            {entity.last_seen && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Last: {new Date(entity.last_seen).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${SEVERITY_COLORS[entity.max_severity] || SEVERITY_COLORS.low}`}>
            {entity.max_severity}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function EntityExplorerPage() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery, type) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const typeParam = type === "all" ? null : type;
      const data = await searchEntities(searchQuery.trim(), typeParam);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query, filterType);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, filterType, performSearch]);

  const typeFilters = [
    { key: "all", label: "All", icon: Filter },
    { key: "ip", label: "IPs", icon: Globe },
    { key: "user", label: "Users", icon: User },
    { key: "host", label: "Hosts", icon: Server },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Entity Intelligence"
        title="Entity Explorer"
        description="Search and investigate IP addresses, users, and hosts across logs, alerts, and incidents."
      />

      <Panel>
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for IP, username, or hostname..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {typeFilters.map((f) => {
              const Icon = f.icon;
              const active = filterType === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition ${
                    active
                      ? "border-brand-400/40 bg-brand-400/10 text-brand-300"
                      : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
                  }`}
                >
                  <Icon size={13} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {searched && (
        <div className="space-y-3">
          {loading ? (
            <SkeletonRows rows={5} />
          ) : results.length > 0 ? (
            <>
              <p className="text-xs text-[var(--text-muted)]">
                Found {results.length} entity{results.length !== 1 ? "ies" : "y"}
              </p>
              <div className="space-y-2">
                {results.map((entity, idx) => (
                  <EntityResultCard key={`${entity.type}-${entity.value}`} entity={entity} index={idx} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
              <ShieldAlert size={24} className="mx-auto mb-3 text-[var(--text-muted)]" />
              <p>No entities found matching "{query}"</p>
              <p className="mt-1 text-xs">Try searching for an IP address, username, or hostname.</p>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-16 text-center">
          <Globe size={32} className="mx-auto mb-4 text-[var(--brand-muted)]" />
          <p className="text-sm text-[var(--text-secondary)]">Start typing to search for entities</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Search across logs, alerts, and incidents to find IP addresses, users, and hosts.
          </p>
        </div>
      )}
    </div>
  );
}

export default EntityExplorerPage;

