import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { fetchEndpoints, fetchMonitoringOverview } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";

function MonitoringPage() {
  const [overview, setOverview] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMonitoring = (options = {}) => {
    setLoading(true);
    Promise.allSettled([
      fetchMonitoringOverview(options),
      fetchEndpoints({ limit: 8 }, options),
    ])
      .then(([overviewResult, endpointsResult]) => {
        setOverview(overviewResult.status === "fulfilled" ? overviewResult.value : null);
        setEndpoints(
          endpointsResult.status === "fulfilled"
            ? endpointsResult.value.items || []
            : [],
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMonitoring();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Monitoring"
        title="Multi-host monitoring"
        description="Track endpoint health, compare resource usage, and monitor the current state of registered infrastructure from a single live inventory view."
        actions={
          <button
            type="button"
            onClick={() => loadMonitoring({ force: true })}
            className="rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300"
          >
            Refresh inventory
          </button>
        }
      />

      {loading ? (
        <SkeletonStats count={4} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Online Hosts"
            value={overview?.online_hosts ?? 0}
            helper="Endpoints currently reporting healthy status"
            accent="emerald"
          />
          <StatCard
            label="Offline Hosts"
            value={overview?.offline_hosts ?? 0}
            helper="Registered endpoints not marked online"
            accent="rose"
          />
          <StatCard
            label="Avg Memory"
            value={`${overview?.average_memory_usage ?? 0}%`}
            helper="Fleet memory utilization snapshot"
            accent="amber"
          />
          <StatCard
            label="Avg Disk"
            value={`${overview?.average_disk_usage ?? 0}%`}
            helper="Fleet storage utilization snapshot"
            accent="brand"
          />
        </div>
      )}

      <Panel>
        <h2 className="text-xl font-semibold text-white">Endpoint inventory</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {loading ? (
            <SkeletonRows rows={4} />
          ) : endpoints.length ? (
            endpoints.map((item, index) => (
              <motion.div
                key={item.endpoint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{item.endpoint.hostname}</p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-brand-200">
                    {item.endpoint.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {item.endpoint.operating_system} • {item.endpoint.ip_address}
                </p>
                {item.latest_metric ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-2xl bg-panel-900/80 px-3 py-3">
                      <p className="text-slate-400">CPU</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {item.latest_metric.cpu_usage}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-panel-900/80 px-3 py-3">
                      <p className="text-slate-400">Memory</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {item.latest_metric.memory_usage}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-panel-900/80 px-3 py-3">
                      <p className="text-slate-400">Disk</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {item.latest_metric.disk_usage}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No metrics received yet.</p>
                )}
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-slate-400">
              No endpoints returned yet. Register hosts from the agent or API to populate this list.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

export default MonitoringPage;
