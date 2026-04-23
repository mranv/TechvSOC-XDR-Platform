import { memo } from "react";

function Panel({ children, className = "" }) {
  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-card)] p-6 shadow-glow backdrop-blur-2xl transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_24px_80px_rgba(15,23,42,0.18)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_34%,transparent_100%)] opacity-60" />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export default memo(Panel);
