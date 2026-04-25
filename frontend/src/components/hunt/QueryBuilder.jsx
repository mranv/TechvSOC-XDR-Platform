import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Trash2,
  Clock,
  History,
  Bookmark,
  Zap,
  ChevronDown,
  X,
  Filter,
  LayoutTemplate,
  Play,
  Save,
  RotateCcw,
} from "lucide-react";

const FIELD_OPTIONS = [
  { value: "q", label: "Message / Raw log", type: "text" },
  { value: "ip_address", label: "IP Address", type: "text" },
  { value: "username", label: "Username", type: "text" },
  { value: "source", label: "Source", type: "text" },
  { value: "event_type", label: "Event Type", type: "text" },
  { value: "severity", label: "Severity", type: "select", options: ["debug", "info", "warning", "error", "critical"] },
  { value: "endpoint_id", label: "Endpoint ID", type: "number" },
];

const OPERATOR_OPTIONS = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
];

const TIME_PRESETS = [
  { label: "Last 1h", hours: 1 },
  { label: "Last 6h", hours: 6 },
  { label: "Last 24h", hours: 24 },
  { label: "Last 7d", hours: 168 },
  { label: "Last 30d", hours: 720 },
];

const QUERY_TEMPLATES = [
  {
    name: "Failed Logins",
    description: "Search for authentication failure events",
    filters: [
      { field: "event_type", operator: "contains", value: "login" },
      { field: "severity", operator: "equals", value: "warning" },
    ],
    hours: 24,
  },
  {
    name: "Critical Errors",
    description: "All critical severity events",
    filters: [
      { field: "severity", operator: "equals", value: "critical" },
    ],
    hours: 24,
  },
  {
    name: "External IP Activity",
    description: "Search raw logs for external IP references",
    filters: [
      { field: "q", operator: "contains", value: "192.168" },
    ],
    hours: 6,
  },
  {
    name: "Brute Force Pattern",
    description: "Multiple auth attempts in short window",
    filters: [
      { field: "event_type", operator: "contains", value: "auth" },
      { field: "severity", operator: "equals", value: "error" },
    ],
    hours: 1,
  },
];

const DSL_TEMPLATES = [
  { name: "Suspicious IP", query: 'ip:192.168.1.5 AND event_type:login_failure' },
  { name: "Admin Activity", query: 'user:admin OR user:root' },
  { name: "Critical Events", query: 'severity:critical' },
  { name: "Failed Auth", query: 'event_type:auth AND severity:error' },
  { name: "Exclude Local", query: 'event_type:login AND NOT ip:127.0.0.1' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function buildApiParams(filters, timePreset, customStart, customEnd) {
  const params = {};

  filters.forEach((f) => {
    if (!f.field || !f.value) return;
    const fieldDef = FIELD_OPTIONS.find((o) => o.value === f.field);

    if (f.field === "q") {
      params.q = params.q ? `${params.q} ${f.value}` : f.value;
      return;
    }

    if (f.field === "ip_address" || f.field === "username") {
      // Pass as dedicated backend parameters
      params[f.field] = f.value;
      return;
    }

    if (f.operator === "equals") {
      params[f.field] = f.value;
    } else if (f.operator === "contains") {
      if (fieldDef?.type === "select") {
        params[f.field] = f.value;
      } else {
        params.q = params.q ? `${params.q} ${f.value}` : f.value;
      }
    } else {
      // For starts_with / ends_with just append to q
      params.q = params.q ? `${params.q} ${f.value}` : f.value;
    }
  });

  if (timePreset !== "custom") {
    const preset = TIME_PRESETS.find((p) => p.label === timePreset);
    if (preset) {
      const end = new Date();
      const start = new Date(end.getTime() - preset.hours * 60 * 60 * 1000);
      params.start_time = start.toISOString();
      params.end_time = end.toISOString();
    }
  } else {
    if (customStart) params.start_time = new Date(customStart).toISOString();
    if (customEnd) params.end_time = new Date(customEnd).toISOString();
  }

  params.limit = 50;
  return params;
}

function SavedQueriesPanel({ onLoad, onClose }) {
  const [queries, setQueries] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("th_queries");
      if (raw) setQueries(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const next = queries.filter((q) => q.id !== id);
    setQueries(next);
    localStorage.setItem("th_queries", JSON.stringify(next));
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-4 shadow-glow"
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          <Bookmark size={13} />
          Saved Queries
        </h4>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10">
          <X size={14} className="text-[var(--text-muted)]" />
        </button>
      </div>
      {queries.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No saved queries yet.</p>
      ) : (
        <div className="space-y-2">
          {queries.map((q) => (
            <button
              key={q.id}
              onClick={() => onLoad(q)}
              className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              <span className="text-xs text-[var(--text-secondary)]">{q.name}</span>
              <Trash2
                size={12}
                onClick={(e) => handleDelete(q.id, e)}
                className="shrink-0 text-[var(--text-muted)] hover:text-rose-400"
              />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function HistoryPanel({ history, onLoad, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-4 shadow-glow"
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          <History size={13} />
          Recent Searches
        </h4>
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/10">
          <X size={14} className="text-[var(--text-muted)]" />
        </button>
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">No search history yet.</p>
      ) : (
        <div className="space-y-2">
          {history.map((h, i) => (
            <button
              key={i}
              onClick={() => onLoad(h)}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              <Clock size={12} className="shrink-0 text-[var(--text-muted)]" />
              <span className="truncate text-xs text-[var(--text-secondary)]">{h.label}</span>
              <span className="ml-auto shrink-0 text-[10px] text-[var(--text-muted)]">
                {new Date(h.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function QueryBuilder({ onSearch, onDslSearch, searching }) {
  const [mode, setMode] = useState("advanced"); // "simple" | "advanced" | "dsl"
  const [simpleQuery, setSimpleQuery] = useState("");
  const [dslQuery, setDslQuery] = useState("");
  const [filters, setFilters] = useState([{ id: generateId(), field: "q", operator: "contains", value: "" }]);
  const [timePreset, setTimePreset] = useState("Last 24h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const addFilter = useCallback(() => {
    setFilters((prev) => [...prev, { id: generateId(), field: "q", operator: "contains", value: "" }]);
  }, []);

  const removeFilter = useCallback((id) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFilter = useCallback((id, key, value) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  }, []);

  const resetAll = useCallback(() => {
    setFilters([{ id: generateId(), field: "q", operator: "contains", value: "" }]);
    setTimePreset("Last 24h");
    setCustomStart("");
    setCustomEnd("");
    setSimpleQuery("");
  }, []);

  const handleSearch = useCallback(() => {
    if (mode === "dsl") {
      if (!dslQuery.trim() || !onDslSearch) return;
      onDslSearch(dslQuery.trim());
      const entry = { label: dslQuery.trim(), params: { dsl: dslQuery.trim() }, ts: Date.now() };
      setHistory((prev) => [entry, ...prev].slice(0, 10));
      return;
    }

    let params;
    if (mode === "simple") {
      params = { q: simpleQuery, limit: 50 };
      const preset = TIME_PRESETS.find((p) => p.label === timePreset);
      if (preset) {
        const end = new Date();
        const start = new Date(end.getTime() - preset.hours * 60 * 60 * 1000);
        params.start_time = start.toISOString();
        params.end_time = end.toISOString();
      }
    } else {
      params = buildApiParams(filters, timePreset, customStart, customEnd);
    }

    onSearch(params);

    // Add to history
    const label = mode === "simple" ? simpleQuery || "Simple search" : filters.map((f) => `${f.field} ${f.operator} ${f.value}`).filter(Boolean).join(" AND ") || "Advanced search";
    const entry = { label, params, ts: Date.now() };
    setHistory((prev) => [entry, ...prev].slice(0, 10));
  }, [mode, simpleQuery, dslQuery, filters, timePreset, customStart, customEnd, onSearch, onDslSearch]);

  const handleLoadTemplate = useCallback((tpl) => {
    setMode("advanced");
    setFilters(tpl.filters.map((f) => ({ ...f, id: generateId() })));
    const preset = TIME_PRESETS.find((p) => p.hours === tpl.hours);
    setTimePreset(preset ? preset.label : "Last 24h");
    setShowTemplates(false);
  }, []);

  const handleLoadHistory = useCallback((entry) => {
    setMode("advanced");
    // Reconstruct filters from params
    const newFilters = [];
    if (entry.params.q) newFilters.push({ id: generateId(), field: "q", operator: "contains", value: entry.params.q });
    ["source", "event_type", "severity", "endpoint_id"].forEach((k) => {
      if (entry.params[k]) newFilters.push({ id: generateId(), field: k, operator: "equals", value: entry.params[k] });
    });
    if (newFilters.length) setFilters(newFilters);
    if (entry.params.start_time) {
      setTimePreset("custom");
      setCustomStart(entry.params.start_time.slice(0, 16));
      if (entry.params.end_time) setCustomEnd(entry.params.end_time.slice(0, 16));
    }
    setShowHistory(false);
  }, []);

  const handleSaveQuery = useCallback(() => {
    if (!saveName.trim()) return;
    const payload = { id: generateId(), name: saveName.trim(), filters, timePreset, mode };
    try {
      const raw = localStorage.getItem("th_queries");
      const existing = raw ? JSON.parse(raw) : [];
      existing.push(payload);
      localStorage.setItem("th_queries", JSON.stringify(existing));
    } catch { /* ignore */ }
    setSaveName("");
    setShowSaveInput(false);
  }, [saveName, filters, timePreset, mode]);

  const isValid = mode === "simple" ? true : mode === "dsl" ? !!dslQuery.trim() : filters.some((f) => f.value);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {["simple", "advanced", "dsl"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative rounded-lg px-4 py-2 text-xs font-medium uppercase tracking-wider transition ${
                mode === m ? "text-brand-300" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {mode === m && (
                <motion.div
                  layoutId="qb-mode"
                  className="absolute inset-0 rounded-lg bg-brand-400/10"
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">{m}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setShowSaved(false); setShowTemplates((s) => !s); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${
              showTemplates ? "border-brand-400/30 bg-brand-400/10 text-brand-300" : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
            }`}
          >
            <LayoutTemplate size={13} />
            Templates
          </button>
          <button
            onClick={() => { setShowTemplates(false); setShowSaved((s) => !s); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${
              showSaved ? "border-brand-400/30 bg-brand-400/10 text-brand-300" : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
            }`}
          >
            <Bookmark size={13} />
            Saved
          </button>
          <button
            onClick={() => { setShowTemplates(false); setShowSaved(false); setShowHistory((s) => !s); }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${
              showHistory ? "border-brand-400/30 bg-brand-400/10 text-brand-300" : "border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
            }`}
          >
            <History size={13} />
            History
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-muted)] transition hover:bg-white/10"
            title="Reset"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Templates Dropdown */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {mode === "dsl"
              ? DSL_TEMPLATES.map((tpl) => (
                  <motion.button
                    key={tpl.name}
                    whileHover={{ y: -2 }}
                    onClick={() => { setDslQuery(tpl.query); setShowTemplates(false); }}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-brand-400/30 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-brand-300" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{tpl.name}</span>
                    </div>
                    <p className="mt-1 text-xs font-mono text-brand-200">{tpl.query}</p>
                  </motion.button>
                ))
              : QUERY_TEMPLATES.map((tpl) => (
                  <motion.button
                    key={tpl.name}
                    whileHover={{ y: -2 }}
                    onClick={() => handleLoadTemplate(tpl)}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-brand-400/30 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-brand-300" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{tpl.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{tpl.description}</p>
                    <p className="mt-2 text-[10px] text-[var(--text-muted)]">{tpl.hours}h window</p>
                  </motion.button>
                ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side panels */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <AnimatePresence>
          {showSaved && (
            <SavedQueriesPanel onLoad={(q) => { setMode(q.mode); setFilters(q.filters.map((f) => ({ ...f, id: generateId() }))); setTimePreset(q.timePreset); setShowSaved(false); }} onClose={() => setShowSaved(false)} />
          )}
          {showHistory && !showSaved && (
            <HistoryPanel history={history} onLoad={handleLoadHistory} onClose={() => setShowHistory(false)} />
          )}
        </AnimatePresence>

      {/* Main query area */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === "simple" ? (
              <motion.div
                key="simple"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-3"
              >
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={simpleQuery}
                    onChange={(e) => setSimpleQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search across message, raw log, source, event type..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                </div>
              </motion.div>
            ) : mode === "dsl" ? (
              <motion.div
                key="dsl"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-3"
              >
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={dslQuery}
                    onChange={(e) => setDslQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="ip:192.168.1.5 AND event_type:login_failure OR severity:critical"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 font-mono text-sm text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>Supported:</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">ip:value</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">user:value</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">host:value</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">event_type:value</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">severity:value</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">AND</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">OR</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono">NOT</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="advanced"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-3"
              >
                <AnimatePresence>
                  {filters.map((filter, idx) => (
                    <motion.div
                      key={filter.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12, height: 0 }}
                      className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <Filter size={14} className="text-[var(--text-muted)]" />

                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, "field", e.target.value)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, "operator", e.target.value)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                      >
                        {OPERATOR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      {(() => {
                        const fieldDef = FIELD_OPTIONS.find((o) => o.value === filter.field);
                        if (fieldDef?.type === "select") {
                          return (
                            <select
                              value={filter.value}
                              onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                              className="min-w-[120px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                            >
                              <option value="">Select...</option>
                              {fieldDef.options.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          );
                        }
                        return (
                          <input
                            type={fieldDef?.type === "number" ? "number" : "text"}
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, "value", e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder="Value..."
                            className="min-w-[120px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                          />
                        );
                      })()}

                      {filters.length > 1 && (
                        <button
                          onClick={() => removeFilter(filter.id)}
                          className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-rose-400/15 hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addFilter}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-2 text-xs text-[var(--text-muted)] transition hover:border-white/25 hover:bg-white/[0.05] hover:text-[var(--text-secondary)]"
                >
                  <Plus size={14} />
                  Add filter
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time Range */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--brand-muted)]">
              <Clock size={12} />
              Time Range
            </span>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setTimePreset(p.label); setCustomStart(""); setCustomEnd(""); }}
                  className={`rounded-lg px-3 py-1.5 text-[11px] transition ${
                    timePreset === p.label
                      ? "border border-brand-400/30 bg-brand-400/10 text-brand-300"
                      : "border border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setTimePreset("custom")}
                className={`rounded-lg px-3 py-1.5 text-[11px] transition ${
                  timePreset === "custom"
                    ? "border border-brand-400/30 bg-brand-400/10 text-brand-300"
                    : "border border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {timePreset === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-center gap-3"
            >
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
              />
              <span className="text-xs text-[var(--text-muted)]">to</span>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
              />
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSearch}
              disabled={searching || !isValid}
              className="flex items-center gap-2 rounded-2xl bg-brand-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-brand-300 disabled:opacity-60"
            >
              <Play size={14} />
              {searching ? "Searching..." : "Run Query"}
            </motion.button>

            {mode === "advanced" && (
              <>
                <button
                  onClick={() => setShowSaveInput((s) => !s)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-[var(--text-primary)] transition hover:bg-white/10"
                >
                  <Save size={14} />
                  Save
                </button>
              </>
            )}
          </div>

          <AnimatePresence>
            {showSaveInput && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2"
              >
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveQuery()}
                  placeholder="Query name..."
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                />
                <button
                  onClick={handleSaveQuery}
                  className="rounded-xl bg-brand-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-brand-300"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveInput(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-muted)] transition hover:bg-white/10"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default memo(QueryBuilder);
export { buildApiParams };

