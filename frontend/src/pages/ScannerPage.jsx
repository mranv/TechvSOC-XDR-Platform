import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { fetchScans, runScan } from "../api/platform";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { SkeletonRows, SkeletonStats } from "../components/ui/Skeleton";

function ScannerPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    target: "127.0.0.1",
    ports: "22,80,443",
    arguments: "-sV",
  });
  const [status, setStatus] = useState("");

  const loadScans = (options = {}) => {
    setLoading(true);
    fetchScans({ limit: 8 }, options)
      .then((response) => setScans(response.items || []))
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadScans();
  }, []);

  const handleRun = async () => {
    setStatus("Submitting scan job...");
    try {
      const payload = {
        target: form.target,
        ports: form.ports || undefined,
        arguments: form.arguments
          ? form.arguments.split(" ").map((item) => item.trim()).filter(Boolean)
          : undefined,
      };
      const result = await runScan(payload);
      setStatus(`Scan ${result.id} completed with status ${result.status}.`);
      loadScans({ force: true });
    } catch (error) {
      setStatus(error.response?.data?.detail || "Scan request failed.");
    }
  };

  const successfulScans = useMemo(
    () => scans.filter((item) => item.status === "completed").length,
    [scans],
  );

  const failedScans = useMemo(
    () => scans.filter((item) => item.status === "failed").length,
    [scans],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Scanner"
        title="Nmap scanner workspace"
        description="Launch scans from the UI, review stored history, and inspect open-port counts for previously scanned targets."
      />

      {loading ? (
        <SkeletonStats count={3} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Scans"
            value={scans.length}
            helper="Stored scan results in the current view"
            accent="brand"
          />
          <StatCard
            label="Completed"
            value={successfulScans}
            helper="Scans that returned open-port data"
            accent="emerald"
          />
          <StatCard
            label="Failed"
            value={failedScans}
            helper="Scans requiring review or retry"
            accent="rose"
          />
        </div>
      )}

      <Panel>
        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr_1fr_auto]">
          <input
            value={form.target}
            onChange={(event) =>
              setForm((current) => ({ ...current, target: event.target.value }))
            }
            placeholder="Target IP or hostname"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          />
          <input
            value={form.ports}
            onChange={(event) =>
              setForm((current) => ({ ...current, ports: event.target.value }))
            }
            placeholder="Ports"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          />
          <input
            value={form.arguments}
            onChange={(event) =>
              setForm((current) => ({ ...current, arguments: event.target.value }))
            }
            placeholder="Arguments like -sV"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
          />
          <button
            type="button"
            onClick={handleRun}
            className="rounded-2xl bg-brand-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-300"
          >
            Run scan
          </button>
        </div>
        {status ? <p className="mt-4 text-sm text-slate-300">{status}</p> : null}
      </Panel>

      <Panel>
        <div className="space-y-3">
          {loading ? (
            <SkeletonRows rows={4} />
          ) : scans.length ? (
            scans.map((scan, index) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{scan.target}</p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-brand-200">
                    {scan.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {scan.open_ports_json?.length || 0} open ports discovered
                </p>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-slate-400">
              No scan results available yet. Trigger scans from the backend API to populate this view.
            </p>
          )}
        </div>
      </Panel>
    </div>
  );
}

export default ScannerPage;
