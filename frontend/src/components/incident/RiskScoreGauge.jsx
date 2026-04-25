import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";

function RiskScoreGauge({ score = 0, size = 140 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(clamped), 150);
    return () => clearTimeout(timer);
  }, [clamped]);

  const getColor = (s) => {
    if (s >= 80) return "#f472b6"; // fuchsia/critical
    if (s >= 60) return "#f87171"; // rose/high
    if (s >= 40) return "#fbbf24"; // amber/medium
    return "#34d399"; // emerald/low
  };

  const color = getColor(clamped);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={8}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {animatedScore}
          </motion.span>
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Risk
          </span>
        </div>
      </div>
      <span
        className="rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-wider"
        style={{
          borderColor: `${color}44`,
          color,
          backgroundColor: `${color}14`,
        }}
      >
        {clamped >= 80
          ? "Critical"
          : clamped >= 60
            ? "High"
            : clamped >= 40
              ? "Medium"
              : "Low"}
      </span>
    </div>
  );
}

export default memo(RiskScoreGauge);

