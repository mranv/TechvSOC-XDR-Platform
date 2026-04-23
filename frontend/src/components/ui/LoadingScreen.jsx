import { motion } from "framer-motion";

function LoadingScreen({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-panel-900 px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[var(--brand-border)] bg-[var(--surface-card)] p-10 text-center shadow-glow"
      >
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--brand-border)] border-t-[var(--interactive)]" />
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--brand-muted)]">
          TechvSOC
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{label}</h2>
      </motion.div>
    </div>
  );
}

export default LoadingScreen;
