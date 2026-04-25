import { memo } from "react";

function MitreBadge({ techniqueId, techniqueName, size = "sm" }) {
  if (!techniqueId) return null;

  const sizeClasses = size === "lg"
    ? "px-2.5 py-1 text-xs"
    : "px-1.5 py-0.5 text-[10px]";

  return (
    <a
      href={`https://attack.mitre.org/techniques/${techniqueId}/`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/10 ${sizeClasses} font-medium text-amber-300 transition hover:bg-amber-400/20`}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{techniqueId}</span>
      {techniqueName && <span className="opacity-80">— {techniqueName}</span>}
    </a>
  );
}

export default memo(MitreBadge);

