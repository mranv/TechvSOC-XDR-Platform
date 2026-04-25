import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Globe,
  User,
  Server,
  ShieldAlert,
  Activity,
  Clock,
  FileText,
  Siren,
  AlertTriangle,
  Link2,
  MapPin,
  Network,
  Target,
  Skull,
} from "lucide-react";

import { fetchEntityProfile } from "../../api/platform";
import Panel from "../ui/Panel";

const TYPE_CONFIG = {
  ip: { icon: Globe, color: "cyan", label: "IP Address", gradient: "from-cyan-400/10 to-transparent" },
  user: { icon: User, color: "amber", label: "User", gradient: "from-amber-400/10 to-transparent" },
  host: { icon: Server, color: "emerald", label: "Host", gradient: "from-emerald-400/10 to-transparent" },
};

function RiskBadge({ score }) {
  let color = "emerald";
  let label = "Low";
  if (score >= 80) { color = "fuchsia"; label = "Critical"; }
  else if (score >= 60) { color = "rose"; label = "High"; }
  else if (score >= 40) { color = "amber"; label = "Medium"; }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-12 w-12">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={`var(--${color === "fuchsia" ? "fuchsia" : color === "rose" ? "rose" : color === "amber" ? "amber" : "emerald"}-400)`}
            strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-[var(--text-primary)]">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Risk Score</p>
        <p className={`text-xs font-semibold text-${color}-300`}>{label}</p>
      </div>
    </div>
  );
}

function EntityDrawer({ entityType, entityValue, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const config = TYPE_CONFIG[entityType] || TYPE_CONFIG.ip;
  const Icon = config.icon;

  useEffect(() => {
    if (!entityType || !entityValue) return;
    setLoading(true);
    fetchEntityProfile(entityType, entityValue)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [entityType, entityValue]);

  return (
    <AnimatePresence>
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
          className="flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--surface-card)] shadow-glow"
        >
          <div className="shrink-0 border-b border-white/10 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border bg-gradient-to-br ${config.gradient}`}>
                  <Icon size={18} className={`text-${config.color}-300`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">{entityValue}</h2>
                  <span className={`text-[10px] uppercase tracking-wider text-${config.color}-300`}>{config.label}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] transition hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading ? (
              <div className="space-y-4">
                <div className="h-20 rounded-2xl bg-white/5 animate-pulse" />
                <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
              </div>
            ) : !profile ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-6 text-center">
                <ShieldAlert size={20} className="mx-auto mb-2 text-rose-300" />
                <p className="text-sm text-rose-200">Failed to load entity profile.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <RiskBadge score={profile.risk_score || 0} />
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Total Events</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{profile.total_events}</p>
                  </div>
                </div>

                {profile.geo_info && (
                  <Panel>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-[var(--text-muted)]" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">Geolocation</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                        <span className="text-[var(--text-muted)]">Country</span>
                        <p className="text-[var(--text-primary)]">{profile.geo_info.country}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2">
                        <span className="text-[var(--text-muted)]">City</span>
                        <p className="text-[var(--text-primary)]">{profile.geo_info.city}</p>
                      </div>
                    </div>
                  </Panel>
                )}

                {profile.behavior_summary?.length > 0 && (
                  <Panel>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={14} className="text-[var(--text-muted)]" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">Behavior Summary</span>
                    </div>
                    <ul className="space-y-1">
                      {profile.behavior_summary.map((s, i) => (
                        <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-brand-400" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}

                <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1">
                  {["overview", "timeline", "logs", "alerts", "incidents"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-medium capitalize transition ${
                        activeTab === tab
                          ? "bg-[var(--interactive)] text-[var(--interactive-contrast)]"
                          : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "overview" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{profile.related_alerts?.length || 0}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Alerts</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{profile.related_incidents?.length || 0}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Incidents</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "timeline" && (
                  <div className="space-y-2">
                    {(profile.timeline || []).slice(0, 15).map((event, idx) => (
                      <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase text-brand-300">{event.type}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-primary)] mt-0.5 truncate">{event.title}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "logs" && (
                  <div className="space-y-2">
                    {(profile.related_logs || []).map((log) => (
                      <div key={log.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <p className="text-xs text-[var(--text-primary)] truncate">{log.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[var(--text-muted)]">{log.source}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{log.event_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "alerts" && (
                  <div className="space-y-2">
                    {(profile.related_alerts || []).map((alert) => (
                      <div key={alert.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <p className="text-xs text-[var(--text-primary)] truncate">{alert.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-rose-300">{alert.severity}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{alert.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "incidents" && (
                  <div className="space-y-2">
                    {(profile.related_incidents || []).map((inc) => (
                      <div key={inc.id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <p className="text-xs text-[var(--text-primary)] truncate">{inc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-amber-300">{inc.severity}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{inc.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default EntityDrawer;

