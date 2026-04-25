import { memo } from "react";
import { Link } from "react-router-dom";
import { Globe, User, Server } from "lucide-react";

const IP_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function detectEntityType(value) {
  if (IP_REGEX.test(value)) return "ip";
  if (value.includes(".") && value.length > 3) return "host";
  return "user";
}

const TYPE_CONFIG = {
  ip: { icon: Globe, color: "cyan", label: "IP" },
  user: { icon: User, color: "amber", label: "User" },
  host: { icon: Server, color: "emerald", label: "Host" },
};

function EntityChip({ value, type: forcedType, onClick, showIcon = true }) {
  if (!value || typeof value !== "string") return null;
  const type = forcedType || detectEntityType(value);
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.user;
  const Icon = config.icon;

  if (onClick) {
    return (
      <button
        onClick={() => onClick(type, value)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-${config.color}-400/20 bg-${config.color}-400/10 px-2 py-1 text-xs text-${config.color}-300 transition hover:bg-${config.color}-400/20`}
      >
        {showIcon && <Icon size={11} />}
        <span className="truncate max-w-[12rem]">{value}</span>
      </button>
    );
  }

  return (
    <Link
      to={`/entities/${type}/${encodeURIComponent(value)}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-${config.color}-400/20 bg-${config.color}-400/10 px-2 py-1 text-xs text-${config.color}-300 transition hover:bg-${config.color}-400/20`}
    >
      {showIcon && <Icon size={11} />}
      <span className="truncate max-w-[12rem]">{value}</span>
    </Link>
  );
}

export default memo(EntityChip);

