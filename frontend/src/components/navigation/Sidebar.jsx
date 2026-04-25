import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/incidents", label: "Incidents" },
  { to: "/cases", label: "Cases" },
  { to: "/alerts", label: "Alerts" },
  { to: "/logs", label: "Logs" },
  { to: "/threat-hunting", label: "Threat Hunting" },
  { to: "/entities", label: "Entities" },
  { to: "/endpoints", label: "Endpoints" },
  { to: "/monitoring", label: "Monitoring" },
  { to: "/scanner", label: "Scanner" },
  { to: "/simulations", label: "Simulations" },
  { to: "/attack-lab", label: "Attack Lab" },
  { to: "/automation", label: "Automation" },
  { to: "/settings", label: "Settings" },
];

function SidebarContent({ onNavigate }) {
  return (
    <>
      <div className="mb-10">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="inline-flex items-center gap-3 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)] px-4 py-3 shadow-glow"
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-lg font-bold text-[var(--brand-text)]">
            TX
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-muted)]">
              TechvSOC
            </p>
            <h1 className="text-base font-semibold text-[var(--text-primary)]">
              XDR Platform
            </h1>
          </div>
        </motion.div>
      </div>

      <nav className="space-y-2">
        {links.map((link, index) => (
          <motion.div
            key={link.to}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <NavLink
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  "group relative flex items-center overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium transition duration-300",
                  isActive
                    ? "bg-[var(--interactive)] text-[var(--interactive-contrast)] shadow-glow"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]",
                ].join(" ")
              }
            >
              <span className="relative z-10">{link.label}</span>
              <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-[var(--brand-text)] opacity-0 transition group-hover:opacity-100" />
            </NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="mt-auto rounded-3xl border border-[var(--brand-border)] bg-[var(--surface-card)] p-5 text-sm text-[var(--text-secondary)]">
        <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[var(--brand-muted)]">
          Platform
        </p>
        <p className="font-medium text-[var(--text-primary)]">TechvSOC XDR Platform</p>
        <p className="mt-2 text-[var(--text-muted)]">
          Security operations, system visibility, and detection workflows in one place.
        </p>
      </div>
    </>
  );
}

function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-[var(--border-strong)] bg-[var(--surface-sidebar)] px-5 py-6 backdrop-blur-2xl lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          >
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="flex h-full w-[19rem] flex-col border-r border-[var(--border-strong)] bg-[var(--surface-sidebar)] px-5 py-6 backdrop-blur-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.3em] text-[var(--brand-muted)]">
                  Navigation
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
                >
                  Close
                </button>
              </div>
              <SidebarContent onNavigate={onClose} />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default memo(Sidebar);
