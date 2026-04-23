import { memo } from "react";
import { useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import ThemeSwitcher from "./ThemeSwitcher";

const titles = {
  "/dashboard": "Dashboard",
  "/logs": "Log Management",
  "/detections": "Detection Engine",
  "/monitoring": "System Monitoring",
  "/scanner": "Scanner Module",
  "/settings": "Settings",
};

function Topbar({ onToggleSidebar }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[var(--border-strong)] bg-[var(--surface-header)] px-5 py-4 backdrop-blur-xl xl:px-8">
      <div>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] text-[var(--text-primary)] transition hover:bg-[var(--surface-raised)] lg:hidden"
          aria-label="Toggle sidebar"
        >
          <span className="space-y-1.5">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-muted)]">
          TechvSOC XDR Platform
        </p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {titles[location.pathname] || "Workspace"}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <div className="hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-4 py-2 md:block">
          <p className="text-sm font-medium text-[var(--text-primary)]">{user?.full_name}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {user?.role}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

export default memo(Topbar);
