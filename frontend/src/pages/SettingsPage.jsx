import { useEffect, useMemo, useState } from "react";

import { fetchHealth, fetchMonitoringOverview, fetchUsers } from "../api/platform";
import ThemeSwitcher from "../components/navigation/ThemeSwitcher";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";

const tabs = ["accounts", "notifications", "stats", "info"];

function TabButton({ tab, activeTab, onClick, label }) {
  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className={[
        "rounded-2xl px-4 py-3 text-sm font-medium transition",
        activeTab === tab
          ? "bg-white text-slate-950"
          : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("accounts");
  const [users, setUsers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    const saved = window.localStorage.getItem("techvsoc-notification-prefs");
    if (!saved) {
      return {
        emailAlerts: true,
        criticalOnly: false,
        dailySummary: true,
      };
    }

    try {
      return JSON.parse(saved);
    } catch {
      return {
        emailAlerts: true,
        criticalOnly: false,
        dailySummary: true,
      };
    }
  });

  useEffect(() => {
    Promise.allSettled([fetchUsers(), fetchMonitoringOverview(), fetchHealth()])
      .then(([usersResult, overviewResult, healthResult]) => {
        setUsers(usersResult.status === "fulfilled" ? usersResult.value : []);
        setOverview(overviewResult.status === "fulfilled" ? overviewResult.value : null);
        setHealth(healthResult.status === "fulfilled" ? healthResult.value : null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "techvsoc-notification-prefs",
      JSON.stringify(notificationPrefs),
    );
  }, [notificationPrefs]);

  const roleBreakdown = useMemo(
    () =>
      users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}),
    [users],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings and platform tabs"
        description="Manage account visibility, notification preferences, platform statistics, and deployment information from a unified settings surface."
        actions={<ThemeSwitcher />}
      />

      <div className="flex flex-wrap gap-3">
        <TabButton tab="accounts" activeTab={activeTab} onClick={setActiveTab} label="Accounts" />
        <TabButton tab="notifications" activeTab={activeTab} onClick={setActiveTab} label="Notifications" />
        <TabButton tab="stats" activeTab={activeTab} onClick={setActiveTab} label="Stats" />
        <TabButton tab="info" activeTab={activeTab} onClick={setActiveTab} label="Info" />
      </div>

      {activeTab === "accounts" ? (
        <div className="space-y-6">
          {loading ? (
            <SkeletonStats count={3} />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Users"
                value={users.length}
                helper="Visible accounts from backend"
                accent="brand"
              />
              <StatCard
                label="Admins"
                value={roleBreakdown.admin || 0}
                helper="Administrative access holders"
                accent="rose"
              />
              <StatCard
                label="Analysts"
                value={roleBreakdown.analyst || 0}
                helper="Active investigation operators"
                accent="emerald"
              />
            </div>
          )}

          <Panel>
            <div className="space-y-3">
              {loading ? (
                <SkeletonRows rows={4} />
              ) : users.length ? (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                  >
                    <div>
                      <p className="font-medium text-white">{user.full_name}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-brand-200">
                      {user.role}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  User data is unavailable or your role cannot access the users API.
                </p>
              )}
            </div>
          </Panel>
        </div>
      ) : null}

      {activeTab === "notifications" ? (
        <Panel>
          <div className="space-y-4">
            {[
              [
                "emailAlerts",
                "Email alerts",
                "Send alert notifications to the configured mailbox.",
              ],
              [
                "criticalOnly",
                "Critical only",
                "Limit email delivery to critical severity items.",
              ],
              [
                "dailySummary",
                "Daily summary",
                "Send a daily activity digest for the platform.",
              ],
            ].map(([key, title, description]) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <div>
                  <p className="font-medium text-white">{title}</p>
                  <p className="text-sm text-slate-400">{description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(notificationPrefs[key])}
                  onChange={(event) =>
                    setNotificationPrefs((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-white/20 bg-white/5"
                />
              </label>
            ))}
          </div>
        </Panel>
      ) : null}

      {activeTab === "stats" ? (
        loading ? (
          <SkeletonStats count={4} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Hosts"
              value={overview?.total_hosts ?? 0}
              helper="Registered infrastructure nodes"
              accent="brand"
            />
            <StatCard
              label="Online Hosts"
              value={overview?.online_hosts ?? 0}
              helper="Currently active endpoints"
              accent="emerald"
            />
            <StatCard
              label="Open Alerts"
              value={overview?.active_alerts ?? 0}
              helper="Alerts requiring attention"
              accent="rose"
            />
            <StatCard
              label="Avg CPU"
              value={`${overview?.average_cpu_usage ?? 0}%`}
              helper="Fleet utilization summary"
              accent="amber"
            />
          </div>
        )
      ) : null}

      {activeTab === "info" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel>
            <h2 className="text-xl font-semibold text-white">Platform information</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              {loading ? (
                <SkeletonRows rows={3} />
              ) : (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-slate-400">Application</p>
                    <p className="mt-2 font-medium text-white">
                      {health?.service || "TechvSOC XDR Platform"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-slate-400">Backend status</p>
                    <p className="mt-2 font-medium capitalize text-white">
                      {health?.status || "unknown"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-slate-400">Environment</p>
                    <p className="mt-2 font-medium text-white">
                      {health?.environment || "Not available"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-white">Frontend notes</h2>
            <div className="mt-5 space-y-3">
              {tabs.map((tab) => (
                <div
                  key={tab}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300"
                >
                  <span className="font-medium capitalize text-white">{tab}</span>
                  <p className="mt-2 text-slate-400">
                    This tab is part of the TechvSOC XDR Platform settings surface and is fully routable within the current frontend workspace.
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

export default SettingsPage;
