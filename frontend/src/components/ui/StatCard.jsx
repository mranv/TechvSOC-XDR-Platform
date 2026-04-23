import { memo } from "react";
import { motion } from "framer-motion";

function StatCard({ label, value, helper, accent = "brand", detail, loading = false }) {
  const accentStyles = {
    brand: "from-[var(--brand-soft)] to-[var(--surface-card)]",
    emerald: "from-emerald-300/20 to-[var(--surface-card)]",
    amber: "from-amber-300/20 to-[var(--surface-card)]",
    rose: "from-rose-300/20 to-[var(--surface-card)]",
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.995 }}
      className={`rounded-3xl border border-white/10 bg-gradient-to-br ${
        accentStyles[accent] || accentStyles.brand
      } relative overflow-hidden p-5 shadow-glow backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%)] opacity-70" />
      <div className="relative z-10">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--brand-muted)]">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold text-white">
        {loading ? "..." : value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{helper}</p>
      {detail ? (
        <div className="mt-4 inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface-overlay)] px-3 py-1 text-xs text-[var(--text-secondary)]">
          {detail}
        </div>
      ) : null}
      </div>
    </motion.div>
  );
}

export default memo(StatCard);
