import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

import { generateDemoData } from "../../api/platform";
import Panel from "../ui/Panel";

function DemoDataButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await generateDemoData();
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate demo data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleGenerate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-400/30 bg-brand-400/5 px-6 py-4 text-sm font-medium text-brand-300 transition hover:bg-brand-400/10 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Database size={18} />
        )}
        {loading ? "Generating Demo Data..." : "Generate Demo Data"}
      </motion.button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Panel className="border-emerald-400/20 bg-emerald-400/5">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-emerald-300" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Demo Data Generated</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {result.message}
                  </p>
                </div>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Panel className="border-rose-400/20 bg-rose-400/5">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-rose-300" />
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(DemoDataButton);

