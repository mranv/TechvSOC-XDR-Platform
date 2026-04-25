import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Activity,
  Send,
  UserCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Search,
  FileCheck,
  Lock,
} from "lucide-react";

import { fetchIncidentNotes, addIncidentNote, fetchIncidentActivity, updateIncident } from "../../api/platform";

const STATUS_FLOW = [
  { value: "new", label: "New", icon: AlertCircle, color: "border-slate-400/30 text-slate-300 bg-slate-400/10" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "border-brand-400/30 text-brand-300 bg-brand-400/10" },
  { value: "investigating", label: "Investigating", icon: Search, color: "border-amber-400/30 text-amber-300 bg-amber-400/10" },
  { value: "contained", label: "Contained", icon: Shield, color: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10" },
  { value: "resolved", label: "Resolved", icon: CheckCircle2, color: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10" },
  { value: "closed", label: "Closed", icon: Lock, color: "border-slate-400/30 text-slate-300 bg-slate-400/10" },
];

const ACTION_ICONS = {
  status_changed: Activity,
  assigned: UserCircle,
  note_added: MessageSquare,
};

const ACTION_LABELS = {
  status_changed: "Status changed",
  assigned: "Assigned",
  note_added: "Note added",
};

function StatusBadge({ status }) {
  const config = STATUS_FLOW.find((s) => s.value === status) || STATUS_FLOW[0];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function NoteItem({ note, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCircle size={14} className="text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {note.author_name || `User #${note.author_id}`}
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">
          {new Date(note.created_at).toLocaleString()}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--text-primary)]">{note.content}</p>
    </motion.div>
  );
}

function ActivityItem({ activity, index }) {
  const Icon = ACTION_ICONS[activity.action] || Activity;
  const label = ACTION_LABELS[activity.action] || activity.action;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3"
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-400/10">
        <Icon size={12} className="text-brand-300" />
      </div>
      <div className="pb-4">
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="font-medium">{activity.actor_name || "System"}</span>{" "}
          {label}
          {activity.new_value && (
            <span className="ml-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              {activity.new_value}
            </span>
          )}
        </p>
        {activity.old_value && activity.new_value && activity.action !== "note_added" && (
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            from {activity.old_value} → {activity.new_value}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

function WorkflowPanel({ incident, onIncidentUpdated }) {
  const [activeSubTab, setActiveSubTab] = useState("notes");
  const [notes, setNotes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [notesData, activityData] = await Promise.all([
        fetchIncidentNotes(incident.id),
        fetchIncidentActivity(incident.id),
      ]);
      setNotes(notesData || []);
      setActivities(activityData || []);
    } catch {
      setNotes([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [incident.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === incident.status) return;
    try {
      await updateIncident(incident.id, { status: newStatus });
      if (onIncidentUpdated) onIncidentUpdated();
      loadData();
    } catch {
      // handled by caller
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSubmitting(true);
    try {
      await addIncidentNote(incident.id, { content: noteText.trim() });
      setNoteText("");
      loadData();
      if (onIncidentUpdated) onIncidentUpdated();
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatusIndex = STATUS_FLOW.findIndex((s) => s.value === incident.status);

  return (
    <div className="space-y-5">
      {/* Status Flow */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          Incident Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((status, idx) => {
            const Icon = status.icon;
            const isCurrent = status.value === incident.status;
            const isPast = idx < currentStatusIndex;
            return (
              <button
                key={status.value}
                onClick={() => handleStatusChange(status.value)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${
                  isCurrent
                    ? `${status.color} ring-1 ring-brand-400/40`
                    : isPast
                      ? "border-white/5 bg-white/[0.02] text-[var(--text-muted)] opacity-60"
                      : "border-white/10 bg-white/[0.03] text-[var(--text-muted)] hover:bg-white/[0.06]"
                }`}
              >
                <Icon size={12} />
                {status.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          Click any status to transition the incident. Activity will be logged automatically.
        </p>
      </div>

      {/* Assignment Info */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
          Assignment
        </h3>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-400/10">
            <UserCircle size={18} className="text-brand-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {incident.assigned_to_id ? `Assigned to Analyst #${incident.assigned_to_id}` : "Unassigned"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {incident.investigating_at
                ? `Investigating since ${new Date(incident.investigating_at).toLocaleString()}`
                : "Not yet under investigation"}
            </p>
          </div>
        </div>
        {incident.contained_at && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
            <Shield size={14} />
            Contained at {new Date(incident.contained_at).toLocaleString()}
          </div>
        )}
        {incident.resolved_at && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 size={14} />
            Resolved at {new Date(incident.resolved_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Sub Tabs: Notes / Activity */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex gap-1">
          {[
            { id: "notes", label: "Notes", icon: MessageSquare },
            { id: "activity", label: "Activity Log", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium uppercase tracking-wider transition ${
                  isActive ? "text-brand-300" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="workflowSubTab"
                    className="absolute inset-0 rounded-xl bg-brand-400/10"
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  />
                )}
                <Icon size={13} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {activeSubTab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {/* Add Note */}
              <div className="flex gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddNote()}
                  placeholder="Add a note..."
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--text-primary)] outline-none transition focus:border-brand-300"
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddNote}
                  disabled={submitting || !noteText.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-brand-300 disabled:opacity-60"
                >
                  <Send size={12} />
                  {submitting ? "..." : "Add"}
                </motion.button>
              </div>

              {/* Notes List */}
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : notes.length > 0 ? (
                notes.map((note, idx) => <NoteItem key={note.id} note={note} index={idx} />)
              ) : (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">No notes yet.</p>
              )}
            </motion.div>
          )}

          {activeSubTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.03]" />
                  ))}
                </div>
              ) : activities.length > 0 ? (
                activities.map((activity, idx) => (
                  <ActivityItem key={activity.id} activity={activity} index={idx} />
                ))
              ) : (
                <p className="py-6 text-center text-xs text-[var(--text-muted)]">No activity recorded yet.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(WorkflowPanel);
