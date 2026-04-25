import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  User,
  Server,
  ArrowLeft,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Siren,
  Clock,
  Activity,
  Target,
  Link2,
  MapPin,
  Network,
  Skull,
  ChevronRight,
} from "lucide-react";

import { fetchEntityProfile } from "../api/platform";
import Panel from "../components/ui/Panel";
import { SkeletonBlock, SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";

const TYPE_CONFIG = {
  ip: { icon: Globe, color: "cyan", label: "IP Address", gradient: "from-cyan-400/10 to-transparent" },
  user: { icon: User, color: "amber", label: "User", gradient: "from-amber-400/10 to-transparent" },
  host: { icon: Server, color: "emerald", label: "Host", gradient: "from-emerald-400/10 to-transparent" },
};

const SEVERITY_COLORS = {
  critical: "bg-fuchsia-400",
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

const TABS = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "logs", label: "Logs", icon: FileText },
  { key: "alerts", label: "Alerts", icon: Siren },
  { key: "incidents", label: "Incidents", icon: AlertTriangle },
  { key: "related", label: "Related", icon: Link2 },
];

function RiskBadge({ score }) {
  let color = "emerald";
  let label = "Low";
  if (score >= 80) { color = "fuchsia"; label = "Critical"; }
  else if (score >= 60) { color = "rose"; label = "High"; }
  else if (score >= 40) { color = "amber"; label = "Medium"; }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <motion.circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={`var(--${color === "fuchsia" ? "fuchsia" : color === "rose" ? "rose" : color === "amber" ? "amber" : "emerald"}-400)`}
            strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
            initial={{ strokeDasharray: "0, 100" }}
            animate={{ strokeDasharray: `${score}, 100` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-[var(--text-primary)]">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Risk Score</p>
        <p className={`text-sm font-semibold text-${color}-300`}>{label}</p>
      </div>
    </div>
  );
}

function StatGrid({ profile }) {
  const stats = [
    { label: "Total Events", value: profile.total_events, icon: Activity },
    { label: "Alerts", value: profile.related_alerts?.length || 0, icon: Siren, color: "rose" },
    { label: "Incidents", value: profile.related_incidents?.length || 0, icon: AlertTriangle, color: "amber" },
    { label: "Related Entities", value: profile.related_entities?.length || 0, icon: Link2, color: "brand" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <Icon size={14} />
              <span className="text-[10px] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{stat.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function SeverityDistribution({ distribution }) {
  const entries = Object.entries(distribution || {});
  if (!entries.length) return null;
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">Severity Distribution</p>
      <div className="space-y-1.5">
        {entries.map(([severity, count]) => (
          <div key={severity} className="flex items-center gap-2">
            <span className="w-14 text-[10px] uppercase text-[var(--text-muted)]">{severity}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={`h-full rounded-full ${SEVERITY_COLORS[severity] || "bg-slate-400"}`}
                initial={{ width: 0 }}
                animate={{ width: `${(count / total) * 100}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            </div>
            <span className="w-6 text-right text-[10px] text-[var(--text-muted)]">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThreatIntelCard({ intel }) {
  if (!intel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${
        intel.is_malicious
          ? "border-rose-400/20 bg-rose-400/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className={intel.is_malicious ? "text-rose-300" : "text-emerald-300"} />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Threat Intelligence</p>
        {intel.is_malicious && (
          <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-rose-300">
            Malicious
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">Country:</span>
          <span className="text-xs text-[var(--text-primary)]">{intel.country}</span>
        </div>
        <div className="flex items-center gap-2">
          <Network size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">ASN:</span>
          <span className="text-xs text-[var(--text-primary)]">{intel.asn}</span>
        </div>
        <div className="flex items-center gap-2">
          <Target size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">Reputation:</span>
          <span className="text-xs font-medium text-[var(--text-primary)]">{intel.reputation_score}/100</span>
        </div>
        {intel.threat_categories && (
          <div className="flex items-center gap-2">
            <Skull size={13} className="text-[var(--text-muted)]" />
            <span className="text-xs text-[var(--text-muted)]">Categories:</span>
            <span className="text-xs text-rose-300">{intel.threat_categories}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TimelineTab({ timeline }) {
  if (!timeline?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
        No timeline events for this entity.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[9px] top-2 bottom-2 w-[2px] rounded-full bg-gradient-to-b from-brand-400/40 via-brand-400/15 to-transparent" />
      <div className="space-y-4">
        {timeline.map((event, idx) => {
          const colors = {
            log: "border-brand-400/20 bg-brand-400/10 text-brand-300",
            alert: "border-rose-400/20 bg-rose-400/10 text-rose-300",
            incident: "border-amber-400/20 bg-amber-400/10 text-amber-300",
          };
          const color = colors[event.type] || colors.log;

          return (
            <motion.div
              key={`${event.type}-${idx}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="relative"
            >
              <div className={`absolute -left-[1.15rem] top-1.5 h-[14px] w-[14px] rounded-full border ${color}`} />
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${color}`}>
                    {event.type}
                  </span>
                  {event.timestamp && (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-[var(--text-primary)]">{event.title}</p>
                {event.description && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">{event.description}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function ItemList({ items, type, emptyText }) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title || item.message}</p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                {item.severity && (
                  <span className="flex items-center gap-1">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${SEVERITY_COLORS[item.severity] || "bg-slate-400"}`} />
                    {item.severity}
                  </span>
                )}
                {item.source && <span>src: {item.source}</span>}
                {item.timestamp && (
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                )}
              </div>
            </div>
            {item.status && (
              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-[var(--text-muted)]">
                {item.status}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function RelatedEntitiesTab({ entities }) {
  if (!entities?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-[var(--text-muted)]">
        No related entities found.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {entities.map((entity, idx) => {
        const config = TYPE_CONFIG[entity.type] || TYPE_CONFIG.ip;
        const Icon = config.icon;
        return (
          <motion.div
            key={`${entity.type}-${entity.value}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
          >
            <Link
              to={`/entities/${entity.type}/${encodeURIComponent(entity.value)}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-brand-400/30 hover:bg-white/[0.06]"
            >
              <Icon size={16} className={`text-${config.color}-300`} />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{entity.value}</span>
              <ChevronRight size={14} className="text-[var(--text-muted)]" />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function EntityProfilePage() {
  const { entityType, entityValue } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState("");

  const decodedValue = decodeURIComponent(entityValue || "");
  const config = TYPE_CONFIG[entityType] || TYPE_CONFIG.ip;
  const Icon = config.icon;

  useEffect(() => {
    if (!entityType || !entityValue) return;
    setLoading(true);
    setError("");
    fetchEntityProfile(entityType, decodedValue)
      .then(setProfile)
      .catch(() => setError("Failed to load entity profile."))
      .finally(() => setLoading(false));
  }, [entityType, entityValue, decodedValue]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <SkeletonBlock className="h-6 w-48" />
            <SkeletonBlock className="h-4 w-32" />
          </div>
        </div>
        <SkeletonStats count={4} />
        <SkeletonBlock className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-8 text-center">
        <ShieldAlert size={24} className="mx-auto mb-3 text-rose-300" />
        <p className="text-sm text-rose-200">{error || "Entity not found."}</p>
        <Link to="/entities" className="mt-4 inline-block text-sm text-brand-300 hover:underline">
          Back to Explorer
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/entities"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-[var(--text-muted)] transition hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border bg-gradient-to-br ${config.gradient}`}>
            <Icon size={24} className={`text-${config.color}-300`} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{decodedValue}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-${config.color}-300 border-${config.color}-400/20 bg-${config.color}-400/10`}>
                {config.label}
              </span>
              {profile.first_seen && (
                <span className="text-xs text-[var(--text-muted)]">
                  First seen: {new Date(profile.first_seen).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <RiskBadge score={profile.risk_score || 0} />
      </div>

      {/* Stats */}
      <StatGrid profile={profile} />

      {/* Threat Intel for IPs */}
      {profile.type === "ip" && profile.threat_intel && (
        <ThreatIntelCard intel={profile.threat_intel} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1.5">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                active
                  ? "bg-[var(--interactive)] text-[var(--interactive-contrast)] shadow-glow"
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              <TabIcon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel>
                <SeverityDistribution distribution={profile.severity_distribution} />
              </Panel>
              <Panel>
                <p className="text-[10px] uppercase tracking-wider text-[var(--brand-muted)] mb-3">Recent Activity</p>
                <TimelineTab timeline={profile.timeline?.slice(0, 8)} />
              </Panel>
            </div>
          )}
          {activeTab === "timeline" && (
            <Panel>
              <TimelineTab timeline={profile.timeline} />
            </Panel>
          )}
          {activeTab === "logs" && (
            <Panel>
              <ItemList items={profile.related_logs} type="log" emptyText="No related logs found." />
            </Panel>
          )}
          {activeTab === "alerts" && (
            <Panel>
              <ItemList items={profile.related_alerts} type="alert" emptyText="No related alerts found." />
            </Panel>
          )}
          {activeTab === "incidents" && (
            <Panel>
              <ItemList items={profile.related_incidents} type="incident" emptyText="No related incidents found." />
            </Panel>
          )}
          {activeTab === "related" && (
            <Panel>
              <RelatedEntitiesTab entities={profile.related_entities} />
            </Panel>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default EntityProfilePage;

