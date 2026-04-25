import { memo } from "react";
import { motion } from "framer-motion";
import {
  TreePine,
  FileText,
  Globe,
  ShieldAlert,
  Cpu,
  HardDrive,
  Network,
  Activity,
  Hash,
  Clock,
} from "lucide-react";

function ProcessNode({ node, depth = 0 }) {
  return (
    <div className={depth > 0 ? "ml-6 border-l border-white/10 pl-4" : ""}>
      <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <Cpu size={16} className="mt-0.5 shrink-0 text-brand-300" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">{node.name}</span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
              PID {node.pid}
            </span>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-[var(--text-muted)]">{node.command_line}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <ShieldAlert size={10} />
              User: {node.user}
            </span>
            {node.start_time && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(node.start_time).toLocaleString()}
              </span>
            )}
          </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child, idx) => (
            <ProcessNode key={child.pid || idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileActivityTable({ activities }) {
  const actionColors = {
    created: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10",
    modified: "border-amber-400/30 text-amber-300 bg-amber-400/10",
    deleted: "border-rose-400/30 text-rose-300 bg-rose-400/10",
  };

  return (
    <div className="space-y-2">
      {activities.map((file, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <HardDrive size={16} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${actionColors[file.action] || actionColors.modified}`}>
                {file.action}
              </span>
              <span className="truncate font-mono text-xs text-[var(--text-primary)]">{file.path}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(file.timestamp).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={10} />
                {file.size_bytes?.toLocaleString()} bytes
              </span>
              {file.hash && (
                <span className="flex items-center gap-1 font-mono">
                  <Hash size={10} />
                  {file.hash.slice(0, 16)}...
                </span>
              )}
            </div>
        </motion.div>
      ))}
    </div>
  );
}

function NetworkActivityTable({ activities }) {
  return (
    <div className="space-y-2">
      {activities.map((net, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <Network size={16} className="mt-0.5 shrink-0 text-brand-300" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                net.direction === "inbound"
                  ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/10"
                  : "border-amber-400/30 text-amber-300 bg-amber-400/10"
              }`}>
                {net.direction}
              </span>
              <span className="text-xs text-[var(--text-primary)]">
                {net.source_ip}:{net.dest_port} &rarr; {net.dest_ip}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
              <span>Protocol: {net.protocol}</span>
              <span>Bytes: {net.bytes?.toLocaleString()}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(net.timestamp).toLocaleString()}
              </span>
            </div>
        </motion.div>
      ))}
    </div>
  );
}

function RegistryActivityTable({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-xs text-[var(--text-muted)]">
        No registry activity recorded for this incident type.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((reg, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <Globe size={16} className="mt-0.5 shrink-0 text-fuchsia-300" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                reg.action === "created"
                  ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/10"
                  : "border-amber-400/30 text-amber-300 bg-amber-400/10"
              }`}>
                {reg.action}
              </span>
              <span className="truncate font-mono text-xs text-[var(--text-primary)]">{reg.key}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {reg.value_name}: <span className="font-mono text-[var(--text-secondary)]">{reg.value_data}</span>
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">
              {new Date(reg.timestamp).toLocaleString()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function BehaviorSummaryCard({ behavior }) {
  if (!behavior) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
        <ShieldAlert size={14} />
        Behavior Summary
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{behavior.behavior_pattern}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Pattern</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{behavior.suspicious_indicators}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Indicators</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {behavior.primary_tactics?.join(", ") || "Unknown"}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Tactics</p>
        </div>
      {behavior.observed_techniques && behavior.observed_techniques.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {behavior.observed_techniques.map((tech) => (
            <span
              key={tech.id}
              className="rounded-full border border-brand-400/20 bg-brand-400/10 px-3 py-1 text-xs text-brand-300"
            >
              {tech.id}: {tech.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ForensicsPanel({ forensics }) {
  if (!forensics) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.05]">
          <ShieldAlert size={22} className="text-[var(--text-muted)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          No forensics data available for this incident yet.
        </p>
      </div>
    );
  }

  const sections = [
    {
      id: "behavior",
      label: "Behavior Summary",
      icon: ShieldAlert,
      content: <BehaviorSummaryCard behavior={forensics.behavior_summary} />,
    },
    {
      id: "process_tree",
      label: "Process Tree",
      icon: TreePine,
      content: (
        <div className="space-y-3">
          {forensics.process_tree && forensics.process_tree.length > 0 ? (
            forensics.process_tree.map((tree, idx) => (
              <ProcessNode key={idx} node={tree} />
            ))
          ) : (
            <p className="text-xs text-[var(--text-muted)]">No process tree data.</p>
          )}
        </div>
      ),
    },
    {
      id: "file_activity",
      label: "File Activity",
      icon: FileText,
      content: forensics.file_activity && forensics.file_activity.length > 0 ? (
        <FileActivityTable activities={forensics.file_activity} />
      ) : (
        <p className="text-xs text-[var(--text-muted)]">No file activity recorded.</p>
      ),
    },
    {
      id: "network_activity",
      label: "Network Activity",
      icon: Network,
      content: forensics.network_activity && forensics.network_activity.length > 0 ? (
        <NetworkActivityTable activities={forensics.network_activity} />
      ) : (
        <p className="text-xs text-[var(--text-muted)]">No network activity recorded.</p>
      ),
    },
    {
      id: "registry",
      label: "Registry Activity",
      icon: Globe,
      content: <RegistryActivityTable activities={forensics.registry_activity} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
            Digital Forensics
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
            Simulated Endpoint Forensics
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-[var(--text-muted)]">
          Generated: {forensics.generated_at ? new Date(forensics.generated_at).toLocaleString() : "Unknown"}
        </span>
      </div>

      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.id} className="space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              <Icon size={14} />
              {section.label}
            </div>
            {section.content}
          </div>
        );
      })}
    </div>
  );
}

export default memo(ForensicsPanel);
