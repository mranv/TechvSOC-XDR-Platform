import { memo } from "react";

function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton rounded-2xl ${className}`} aria-hidden="true" />;
}

function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={`line-${index + 1}`}
          className={index === lines - 1 ? "h-4 w-2/3" : "h-4 w-full"}
        />
      ))}
    </div>
  );
}

function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`stat-${index + 1}`}
          className="rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-card)] p-5 shadow-glow"
        >
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="mt-6 h-10 w-20" />
          <SkeletonBlock className="mt-3 h-4 w-40" />
          <SkeletonBlock className="mt-4 h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRows({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`row-${index + 1}`}
          className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] p-4"
        >
          <SkeletonBlock className="h-4 w-44" />
          <SkeletonBlock className="mt-3 h-3 w-full" />
          <SkeletonBlock className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export { SkeletonBlock, SkeletonRows, SkeletonStats, SkeletonText };

export default memo(SkeletonBlock);
