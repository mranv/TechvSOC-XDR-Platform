import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  User,
  Server,
  Copy,
  ShieldAlert,
  Hash,
} from "lucide-react";

const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const USER_REGEX = /(?:user|for|from)\s+["']?([a-zA-Z0-9._-]{2,30})["']?/gi;
const HOST_REGEX = /(?:host|hostname|endpoint|machine|workstation|server)\s+["']?([a-zA-Z0-9._-]{3,40})["']?/gi;

function extractEntities(incident) {
  const ips = new Set();
  const users = new Set();
  const hosts = new Set();

  const scan = (text) => {
    if (!text) return;
    let m;
    while ((m = IP_REGEX.exec(text)) !== null) ips.add(m[0]);
    while ((m = USER_REGEX.exec(text)) !== null) users.add(m[1]);
    while ((m = HOST_REGEX.exec(text)) !== null) hosts.add(m[1]);
  };

  scan(incident.title);
  scan(incident.description);

  incident.alerts?.forEach((alert) => {
    scan(alert.title);
    scan(alert.description);
  });

  incident.timeline_json?.forEach((event) => {
    scan(event.description);
    scan(event.title);
    scan(event.message);
  });

  return {
    ips: Array.from(ips),
    users: Array.from(users),
    hosts: Array.from(hosts),
  };
}

function EntityChip({ icon: Icon, label, value, colorClass }) {
  const handleCopy = () => {
    navigator.clipboard?.writeText(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.04, y: -1 }}
      className={`group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-colors hover:border-${colorClass}/40 hover:bg-white/[0.07]`}
    >
      <Icon size={14} className={`text-${colorClass}-400 shrink-0`} />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p className="truncate text-xs font-medium text-[var(--text-primary)]">
          {value}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="ml-auto shrink-0 rounded-md p-1 opacity-0 transition group-hover:opacity-100 hover:bg-white/10"
        title="Copy"
      >
        <Copy size={12} className="text-[var(--text-muted)]" />
      </button>
    </motion.div>
  );
}

function EntityList({ incident }) {
  const entities = useMemo(() => extractEntities(incident), [incident]);

  const hasAny =
    entities.ips.length > 0 ||
    entities.users.length > 0 ||
    entities.hosts.length > 0;

  if (!hasAny) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <ShieldAlert size={14} />
        <span>No entities extracted from available data.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entities.ips.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--brand-muted)]">
            <Globe size={12} />
            IP Addresses ({entities.ips.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {entities.ips.map((ip) => (
              <EntityChip
                key={`ip-${ip}`}
                icon={Globe}
                label="IP"
                value={ip}
                colorClass="cyan"
              />
            ))}
          </div>
        </div>
      )}

      {entities.users.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--brand-muted)]">
            <User size={12} />
            Users ({entities.users.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {entities.users.map((u) => (
              <EntityChip
                key={`user-${u}`}
                icon={User}
                label="User"
                value={u}
                colorClass="amber"
              />
            ))}
          </div>
        </div>
      )}

      {entities.hosts.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--brand-muted)]">
            <Server size={12} />
            Hosts ({entities.hosts.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {entities.hosts.map((h) => (
              <EntityChip
                key={`host-${h}`}
                icon={Server}
                label="Host"
                value={h}
                colorClass="emerald"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(EntityList);

