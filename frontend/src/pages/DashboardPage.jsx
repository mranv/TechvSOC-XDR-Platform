import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  fetchAlerts,
  fetchEndpoints,
  fetchHealth,
  fetchLogs,
  fetchMonitoringOverview,
  fetchScans,
} from "../api/platform";
import LinePreviewChart from "../components/ui/LinePreviewChart";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import {
  SkeletonBlock,
  SkeletonRows,
  SkeletonStats,
  SkeletonText,
} from "../components/ui/Skeleton";

const postureColors = ["#22d3ee", "#34d399", "#f59e0b"];

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function buildUtilizationSeries(overview) {
  const cpu = Number(overview?.average_cpu_usage || 0);
  const memory = Number(overview?.average_memory_usage || 0);
  const disk = Number(overview?.average_disk_usage || 0);

  return [
    { name: "00:00", value: Math.max(8, cpu * 0.62) },
    { name: "04:00", value: Math.max(10, memory * 0.48) },
    { name: "08:00", value: Math.max(12, cpu * 0.78) },
    { name: "12:00", value: Math.max(14, memory * 0.92) },
    { name: "16:00", value: Math.max(16, disk * 0.74) },
    { name: "20:00", value: Math.max(18, (cpu + memory + disk) / 3) },
  ].map((item) => ({ ...item, value: Number(item.value.toFixed(1)) }));
}

function DashboardPage() {
  const [state, setState] = useState({
    health: null,
    overview: null,
    alerts: [],
    logs: [],
    endpoints: [],
    scans: [],
    loading: true,
    lastUpdated: null,
  });

  useEffect(() => {
    let active = true;

    const load = ({ force = false } = {}) => {
      Promise.allSettled([
        fetchHealth({ force }),
        fetchMonitoringOverview({ force }),
        fetchAlerts({ limit: 6 }, { force }),
        fetchLogs({ limit: 5 }, { force }),
        fetchEndpoints({ limit: 5 }, { force }),
        fetchScans({ limit: 5 }, { force }),
      ]).then(
        ([
          healthResult,
          overviewResult,
          alertsResult,
          logsResult,
          endpointsResult,
          scansResult,
        ]) => {
          if (!active) {
            return;
          }

          setState({
            health: healthResult.status === "fulfilled" ? healthResult.value : null,
            overview: overviewResult.status === "fulfilled" ? overviewResult.value : null,
            alerts:
              alertsResult.status === "fulfilled" ? alertsResult.value.items || [] : [],
            logs: logsResult.status === "fulfilled" ? logsResult.value.items || [] : [],
            endpoints:
              endpointsResult.status === "fulfilled"
                ? endpointsResult.value.items || []
                : [],
            scans:
              scansResult.status === "fulfilled" ? scansResult.value.items || [] : [],
            loading: false,
            lastUpdated: new Date(),
          });
        },
      );
    };

    load();
    const timer = window.setInterval(() => load({ force: true }), 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const utilizationSeries = useMemo(
    () => buildUtilizationSeries(state.overview),
    [state.overview],
  );

  const hostPosture = useMemo(
    () => [
      { name: "Online", value: Number(state.overview?.online_hosts || 0) },
      { name: "Offline", value: Number(state.overview?.offline_hosts || 0) },
      {
        name: "Alerts",
        value: Number(state.overview?.active_alerts || state.alerts.length || 0),
      },
    ],
    [state.overview, state.alerts.length],
  );

  const metricBars = useMemo(
    () => [
      { name: "CPU", value: Number(state.overview?.average_cpu_usage || 0) },
      { name: "Memory", value: Number(state.overview?.average_memory_usage || 0) },
      { name: "Disk", value: Number(state.overview?.average_disk_usage || 0) },
    ],
    [state.overview],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Security operations command center"
        description="A live operational surface for TechvSOC XDR Platform, combining fleet health, detections, recent activity, and scan posture in one analyst-focused dashboard."
        actions={
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
              Live refresh
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300">
              {state.lastUpdated
                ? `Updated ${state.lastUpdated.toLocaleTimeString()}`
                : "Awaiting sync"}
            </div>
          </div>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"
      >
        <div className="overflow-hidden rounded-[2rem] border border-brand-300/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),linear-gradient(140deg,rgba(8,17,31,0.98),rgba(16,27,47,0.96))] p-7 shadow-glow">
          {state.loading ? (
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <SkeletonBlock className="h-3 w-32" />
                <SkeletonBlock className="mt-5 h-12 w-full max-w-xl" />
                <SkeletonBlock className="mt-3 h-12 w-5/6" />
                <div className="mt-5 max-w-xl">
                  <SkeletonText lines={3} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-4 h-8 w-24" />
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                  <SkeletonBlock className="h-3 w-28" />
                  <SkeletonBlock className="mt-4 h-8 w-20" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.35em] text-brand-100/70">
                  Operational Brief
                </p>
                <h2 className="mt-4 text-4xl font-semibold text-white">
                  TechvSOC XDR Platform is monitoring {state.overview?.total_hosts ?? 0}{" "}
                  hosts across security, telemetry, and scanning surfaces.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  The dashboard refreshes in the background, spotlights active
                  detections, and surfaces the newest backend activity so teams can
                  move from overview to investigation without context switching.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Backend status
                  </p>
                  <p className="mt-3 text-2xl font-semibold capitalize text-white">
                    {state.health?.status || "unknown"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Open detections
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {state.overview?.active_alerts ?? state.alerts.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Panel className="flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-brand-200/70">
              Fleet posture
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              Endpoint coverage snapshot
            </h2>
          </div>
          <div className="mt-6 h-60">
            {state.loading ? (
              <SkeletonBlock className="h-full w-full rounded-[2rem]" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hostPosture}
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {hostPosture.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={postureColors[index % postureColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#08111f",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid gap-2">
            {hostPosture.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: postureColors[index % postureColors.length] }}
                  />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </motion.section>

      {state.loading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Platform Status"
            value={state.health?.status || "unknown"}
            helper={state.health?.service || "Backend connection pending"}
            detail={state.health?.environment || "environment unavailable"}
            accent="brand"
          />
          <StatCard
            label="Monitored Hosts"
            value={state.overview?.total_hosts ?? "0"}
            helper="Discovered endpoints in monitoring inventory"
            detail={`${state.overview?.online_hosts ?? 0} online now`}
            accent="emerald"
          />
          <StatCard
            label="Open Alerts"
            value={state.overview?.active_alerts ?? state.alerts.length}
            helper="Detections currently requiring analyst attention"
            detail={`${state.alerts.length} alerts shown below`}
            accent="rose"
          />
          <StatCard
            label="Average CPU"
            value={formatPercent(state.overview?.average_cpu_usage)}
            helper="Fleet-wide utilization snapshot"
            detail={`Memory ${formatPercent(state.overview?.average_memory_usage)}`}
            accent="amber"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Panel>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-200/70">
                Live Utilization
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Blended telemetry trend
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              15 second refresh cadence
            </span>
          </div>
          {state.loading ? (
            <SkeletonBlock className="h-72 w-full rounded-[2rem]" />
          ) : (
            <LinePreviewChart data={utilizationSeries} stroke="#22d3ee" />
          )}
        </Panel>

        <Panel>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-200/70">
            Resource Mix
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Average fleet load by category
          </h2>
          <div className="mt-6 h-72">
            {state.loading ? (
              <SkeletonBlock className="h-full w-full rounded-[2rem]" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricBars}>
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#08111f",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                    }}
                  />
                  <Bar dataKey="value" radius={[14, 14, 0, 0]}>
                    {metricBars.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={postureColors[index % postureColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-200/70">
                Alert Queue
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Latest detections
              </h2>
            </div>
            <span className="text-sm text-slate-400">
              {state.alerts.length} recent items
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {state.loading ? (
              <SkeletonRows rows={4} />
            ) : state.alerts.length ? (
              state.alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{alert.title}</p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-brand-200">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {alert.description}
                  </p>
                </motion.div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                No alerts have been returned yet.
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-200/70">
            Host Performance
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Top monitored endpoints
          </h2>
          <div className="mt-6 space-y-4">
            {state.loading ? (
              <SkeletonRows rows={3} />
            ) : state.endpoints.length ? (
              state.endpoints.map((item) => (
                <div
                  key={item.endpoint.id}
                  className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{item.endpoint.hostname}</p>
                      <p className="text-sm text-slate-400">
                        {item.endpoint.operating_system}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-brand-200">
                      {item.endpoint.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      ["CPU", item.latest_metric?.cpu_usage ?? 0],
                      ["MEM", item.latest_metric?.memory_usage ?? 0],
                      ["DSK", item.latest_metric?.disk_usage ?? 0],
                    ].map(([name, value]) => (
                      <div key={name} className="rounded-2xl bg-panel-900/80 px-3 py-3">
                        <p className="text-slate-400">{name}</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {formatPercent(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                No monitored endpoints available yet.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-200/70">
            Recent Logs
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Fresh activity feed
          </h2>
          <div className="mt-5 space-y-3">
            {state.loading ? (
              <SkeletonRows rows={4} />
            ) : state.logs.length ? (
              state.logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{log.source}</p>
                    <span className="text-xs uppercase tracking-[0.2em] text-brand-200">
                      {log.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{log.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {log.event_type}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                No logs returned yet.
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-200/70">
            Scan Posture
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Latest scanner results
          </h2>
          <div className="mt-6 h-48">
            {state.loading ? (
              <SkeletonBlock className="h-full w-full rounded-[2rem]" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={state.scans.map((scan, index) => ({
                    name: `Scan ${index + 1}`,
                    ports: scan.open_ports_json?.length || 0,
                  }))}
                >
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#08111f",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ports"
                    stroke="#34d399"
                    fill="rgba(52, 211, 153, 0.18)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {state.loading ? (
              <SkeletonRows rows={3} />
            ) : state.scans.length ? (
              state.scans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{scan.target}</p>
                    <p className="text-slate-400">{scan.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">
                      {scan.open_ports_json?.length || 0}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      open ports
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                No scan history returned yet.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default DashboardPage;
