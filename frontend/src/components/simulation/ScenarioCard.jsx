import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Globe,
  Network,
  Radio,
  Database,
  KeyRound,
  Play,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";

const SCENARIO_ICONS = {
  brute_force: Shield,
  suspicious_login: Globe,
  port_scan: Network,
  malware_beacon: Radio,
  data_exfiltration: Database,
  privilege_escalation: KeyRound,
};

const SCENARIO_COLORS = {
  brute_force: "from-rose-400/15 to-transparent border-rose-400/20 hover:border-rose-400/40",
  suspicious_login: "from-amber-400/15 to-transparent border-amber-400/20 hover:border-amber-400/40",
  port_scan: "from-brand-400/15 to-transparent border-brand-400/20 hover:border-brand-400/40",
  malware_beacon: "from-fuchsia-400/15 to-transparent border-fuchsia-400/20 hover:border-fuchsia-400/40",
  data_exfiltration: "from-emerald-400/15 to-transparent border-emerald-400/20 hover:border-emerald-400/40",
  privilege_escalation: "from-cyan-400/15 to-transparent border-cyan-400/20 hover:border-cyan-400/40",
};

function ParameterInput({ paramKey, config, value, onChange }) {
  const { type, label, min, max, optional } = config;

  if (type === "boolean") {
    return (
      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer transition hover:bg-white/[0.05]">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(paramKey, e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-brand-400 accent-brand-400"
        />
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      </label>
    );
  }

  if (type === "string_list" || type === "integer_list") {
    const displayValue = Array.isArray(value) ? value.join(", ") : value || "";
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {label}
          {optional && <span className="ml-1 text-[var(--text-muted)]/60">(optional)</span>}
        </label>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            const vals = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
            onChange(paramKey, type === "integer_list" ? vals.map(Number) : vals);
          }}
          placeholder="Comma-separated values..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
        />
      </div>
    );
  }

  if (type === "integer") {
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {label}
          {optional && <span className="ml-1 text-[var(--text-muted)]/60">(optional)</span>}
        </label>
        <input
          type="number"
          min={min}
          max={max}
          value={value ?? ""}
          onChange={(e) => onChange(paramKey, e.target.value === "" ? null : Number(e.target.value))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
        />
      </div>
    );
  }

  // string default
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
        {optional && <span className="ml-1 text-[var(--text-muted)]/60">(optional)</span>}
      </label>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(paramKey, e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
      />
    </div>
  );
}

function ScenarioCard({ scenarioKey, config, onRun, running }) {
  const [expanded, setExpanded] = useState(false);
  const [params, setParams] = useState(() => {
    const defaults = {};
    Object.entries(config.parameters).forEach(([k, v]) => {
      defaults[k] = v.default;
    });
    return defaults;
  });

  const Icon = SCENARIO_ICONS[scenarioKey] || Shield;
  const colorClass = SCENARIO_COLORS[scenarioKey] || SCENARIO_COLORS.brute_force;

  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group rounded-2xl border bg-gradient-to-br ${colorClass} transition-all duration-300`}
    >
      <div
        className="flex cursor-pointer items-center gap-4 p-5"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
          <Icon size={20} className="text-[var(--text-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{config.label}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{config.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRun(scenarioKey, params);
            }}
            disabled={running}
            className="flex items-center gap-1.5 rounded-xl bg-brand-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-brand-300 disabled:opacity-60"
          >
            {running ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
            ) : (
              <Play size={12} />
            )}
            Run
          </button>
          <button className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-white/10">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-5 pb-5 pt-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                <Settings2 size={12} />
                Parameters
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(config.parameters).map(([paramKey, paramConfig]) => (
                  <ParameterInput
                    key={paramKey}
                    paramKey={paramKey}
                    config={paramConfig}
                    value={params[paramKey]}
                    onChange={updateParam}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(ScenarioCard);

