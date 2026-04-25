import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { fetchEndpoints } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";

function EndpointsPage() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = (options = {}) => {
    setLoading(true);
    fetchEndpoints({ limit: 50 }, options)
      .then((res) => setEndpoints(res.items || []))
      .catch(() => setEndpoints([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onlineCount = endpoints.filter(
    (e) => e.endpoint?.status === "online"
  ).length;
  const offlineCount = endpoints.length - onlineCount;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Endpoints"
        title="Endpoint inventory"
        description="Full fleet view of all registered endpoints with latest metrics and status."
        actions={
          <button
            onClick={() => load({ force: true })}
            className="rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300"
          >
            Refresh
          </button>
        }
      />

      {loading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Endpoints"
            value={endpoints.length}
            helper="Registered hosts"
            accent="brand"
          />
          <StatCard
            label="Online"
            value={onlineCount}
            helper="Currently active"
            accent="emerald"
          />
          <StatCard
            label="Offline"
            value={offlineCount}
            helper="Not reporting"
            accent="rose"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <SkeletonRows rows={6} />
        ) : endpoints.length ? (
          endpoints.map((item, index) => (
            <motion.div
              key={item.endpoint.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">
                  {item.endpoint.hostname}
                </p>
                <span
                  className={`rounded-full border px-3 py-1 text-xs uppercase ${
                    item.endpoint.status === "online"
                      ? "border-emerald-400/30 text-emerald-300 bg-emerald-400/10"
                      : "border-rose-400/30 text-rose-300 bg-rose-400/10"
                  }`}
                >
                  {item.endpoint.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {item.endpoint.operating_system} • {item.endpoint.ip_address}
              </p>

              {item.latest_metric ? (
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  {[
                    ["CPU", item.latest_metric.cpu_usage],
                    ["MEM", item.latest_metric.memory_usage],
                    ["DSK", item.latest_metric.disk_usage],
                  ].map(([name, value]) => (
                    <div
                      key={name}
                      className="rounded-2xl bg-panel-900/80 px-3 py-3"
                    >
                      <p className="text-slate-400">{name}</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {value}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No metrics received yet.
                </p>
              )}

              <p className="mt-3 text-xs text-slate-500">
                Agent v{item.endpoint.agent_version}
              </p>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-12 text-center text-sm text-slate-400">
            No endpoints registered yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default EndpointsPage;
