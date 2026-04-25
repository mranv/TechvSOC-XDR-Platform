import { memo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ShieldAlert,
  Network,
  Users,
  FileText,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Swords,
  Target,
  Activity,
  ListChecks,
} from "lucide-react";

function SectionCard({ icon: Icon, title, children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-brand-300" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

function MitreBadge({ technique }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">
      <Swords size={10} />
      {technique.id}: {technique.name}
    </span>
  );
}

function EntityTag({ icon: Icon, label, values }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepItem({ step, index }) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-400/15 text-[10px] font-bold text-brand-300">
          {index + 1}
        </div>
        {index < step.total - 1 && (
          <div className="mt-1 h-full w-px bg-white/10" />
        )}
      </div>
      <div className="pb-4">
        <p className="text-sm font-medium text-[var(--text-primary)]">{step.title}</p>
        {step.mitre_technique_id && (
          <div className="mt-1">
            <MitreBadge technique={{ id: step.mitre_technique_id, name: step.mitre_technique_name }} />
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--text-muted)]">{step.description}</p>
      </div>
    </div>
  );
}

function IncidentStoryPanel({ story }) {
  if (!story) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-16 text-center">
        <BookOpen size={22} className="text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">No story available for this incident.</p>
      </div>
    );
  }

  const severityColor =
    story.severity === "critical"
      ? "text-fuchsia-300"
      : story.severity === "high"
        ? "text-rose-300"
        : story.severity === "medium"
          ? "text-amber-300"
          : "text-emerald-300";

  return (
    <div className="space-y-5">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className={`text-2xl font-semibold ${severityColor}`}>
            {story.severity.toUpperCase()}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Severity</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{story.alert_count}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Alerts</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{story.attack_step_count}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Attack Steps</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{story.timeline_event_count}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Timeline Events</p>
        </div>
      </div>

      {/* What Happened */}
      <SectionCard icon={BookOpen} title="What Happened">
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{story.what_happened}</p>
      </SectionCard>

      {/* How It Happened */}
      <SectionCard icon={Network} title="How It Happened">
        <p className="mb-4 text-sm whitespace-pre-line text-[var(--text-secondary)]">
          {story.how_it_happened}
        </p>
      </SectionCard>

      {/* Impact */}
      <SectionCard icon={AlertTriangle} title="Impact Assessment">
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{story.impact}</p>
      </SectionCard>

      {/* Behavior Summary */}
      <SectionCard icon={Activity} title="Behavior Summary">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
              Pattern: {story.behavior_summary?.behavior_pattern || "Unknown"}
            </span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--text-secondary)]">
              Indicators: {story.behavior_summary?.suspicious_indicators || 0}
            </span>
          </div>
          {story.behavior_summary?.primary_tactics?.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">MITRE Tactics</p>
              <div className="flex flex-wrap gap-2">
                {story.behavior_summary.primary_tactics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-lg border border-brand-400/20 bg-brand-400/10 px-2.5 py-1 text-[11px] text-brand-300"
                  >
                    <Target size={10} />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {story.behavior_summary?.observed_techniques?.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Observed Techniques</p>
              <div className="flex flex-wrap gap-2">
                {story.behavior_summary.observed_techniques.map((t) => (
                  <MitreBadge key={t.id} technique={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Extracted Entities */}
      <SectionCard icon={Globe} title="Extracted Entities">
        <div className="space-y-3">
          <EntityTag icon={Globe} label="IP Addresses" values={story.entities?.ips} />
          <EntityTag icon={Users} label="Usernames" values={story.entities?.usernames} />
          <EntityTag icon={Network} label="Hostnames" values={story.entities?.hostnames} />
          <EntityTag icon={FileText} label="File Paths" values={story.entities?.file_paths} />
        </div>
      </SectionCard>

      {/* Recommended Next Steps */}
      <SectionCard icon={ListChecks} title="Recommended Next Steps">
        <div className="space-y-2">
          {story.recommended_next_steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
              <p className="text-sm text-[var(--text-secondary)]">{step}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export default memo(IncidentStoryPanel);
