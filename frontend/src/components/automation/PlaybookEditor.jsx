import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Save, RotateCcw, Plus, Trash2 } from "lucide-react";

const ACTION_TYPES = [
  { value: "block_ip", label: "Block IP Address" },
  { value: "disable_user", label: "Disable User Account" },
  { value: "isolate_endpoint", label: "Isolate Endpoint" },
];

const SEVERITY_OPTIONS = ["low", "medium", "high", "critical"];

function emptyRule() {
  return {
    id: Math.random().toString(36).slice(2, 9),
    name: "New Rule",
    condition: {
      severity: "high",
      incident_type: "",
      status: "",
    },
    action: {
      type: "block_ip",
      target: "",
      reason: "",
    },
  };
}

function PlaybookEditor({ initialPlaybook, onSave, onCancel }) {
  const [name, setName] = useState(initialPlaybook?.name || "");
  const [description, setDescription] = useState(initialPlaybook?.description || "");
  const [isEnabled, setIsEnabled] = useState(initialPlaybook?.is_enabled !== false);
  const [rules, setRules] = useState(
    initialPlaybook?.rules_json?.length
      ? initialPlaybook.rules_json.map((r, i) => ({ ...r, id: r.id || `rule-${i}` }))
      : [emptyRule()]
  );
  const [errors, setErrors] = useState("");

  const addRule = () => setRules((prev) => [...prev, emptyRule()]);
  const removeRule = (id) => setRules((prev) => prev.filter((r) => r.id !== id));

  const updateRule = (id, path, value) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r };
        if (path.length === 1) {
          next[path[0]] = value;
        } else if (path.length === 2) {
          next[path[0]] = { ...next[path[0]], [path[1]]: value };
        }
        return next;
      })
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrors("Playbook name is required");
      return;
    }
    if (rules.length === 0) {
      setErrors("At least one rule is required");
      return;
    }
    for (const rule of rules) {
      if (!rule.name.trim()) {
        setErrors("All rules must have a name");
        return;
      }
    }
    setErrors("");
    onSave({
      name: name.trim(),
      description: description.trim(),
      is_enabled: isEnabled,
      rules_json: rules.map(({ id, ...rest }) => rest),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Playbook Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brute Force Response"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this playbook does..."
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
            isEnabled ? "bg-brand-400" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              isEnabled ? "translate-x-[18px]" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-xs text-[var(--text-secondary)]">
          {isEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* Rules */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
            Rules ({rules.length})
          </h3>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addRule}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-1.5 text-[11px] text-[var(--text-muted)] transition hover:border-white/25 hover:bg-white/[0.05]"
          >
            <Plus size={12} />
            Add rule
          </motion.button>
        </div>

        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <motion.div
              key={rule.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
                    Rule {idx + 1}
                  </span>
                  <input
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, ["name"], e.target.value)}
                    placeholder="Rule name..."
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                  />
                </div>
                {rules.length > 1 && (
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-rose-400/15 hover:text-rose-400"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Condition */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    IF Condition
                  </p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-[var(--text-muted)]">Severity ≥</label>
                      <div className="mt-1 flex gap-2">
                        {SEVERITY_OPTIONS.map((sev) => (
                          <button
                            key={sev}
                            onClick={() => updateRule(rule.id, ["condition", "severity"], sev)}
                            className={`rounded-md border px-2 py-0.5 text-[10px] uppercase transition ${
                              rule.condition.severity === sev
                                ? "border-brand-400/30 bg-brand-400/10 text-brand-300"
                                : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
                            }`}
                          >
                            {sev}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={rule.condition.incident_type}
                        onChange={(e) => updateRule(rule.id, ["condition", "incident_type"], e.target.value)}
                        placeholder="Incident type (optional)"
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
                      />
                      <input
                        value={rule.condition.status}
                        onChange={(e) => updateRule(rule.id, ["condition", "status"], e.target.value)}
                        placeholder="Status (optional)"
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    THEN Action
                  </p>
                  <select
                    value={rule.action.type}
                    onChange={(e) => updateRule(rule.id, ["action", "type"], e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
                  >
                    {ACTION_TYPES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={rule.action.target}
                    onChange={(e) => updateRule(rule.id, ["action", "target"], e.target.value)}
                    placeholder="Target value (e.g. IP address)"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
                  />
                  <input
                    value={rule.action.reason}
                    onChange={(e) => updateRule(rule.id, ["action", "reason"], e.target.value)}
                    placeholder="Reason (optional)"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {errors && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-xs text-rose-300">
          {errors}
        </div>
      )}

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="flex items-center gap-2 rounded-2xl bg-brand-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-300"
        >
          <Save size={14} />
          Save Playbook
        </motion.button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-[var(--text-primary)] transition hover:bg-white/10"
        >
          <RotateCcw size={14} />
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

export default memo(PlaybookEditor);

