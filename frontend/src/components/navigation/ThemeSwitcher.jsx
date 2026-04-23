import { memo } from "react";
import { motion } from "framer-motion";

import { useTheme } from "../../context/ThemeContext";

const labels = {
  dark: "Dark",
  light: "Light",
  cyberpunk: "Cyberpunk",
};

function ThemeSwitcher() {
  const { theme, themes, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-overlay)] p-1">
      {themes.map((item) => {
        const active = item === theme;
        return (
          <button
            key={item}
            type="button"
            onClick={() => setTheme(item)}
            className="relative rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:text-[var(--text-primary)]"
          >
            {active ? (
              <motion.span
                layoutId="theme-pill"
                className="absolute inset-0 rounded-xl bg-[var(--interactive)]"
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
              />
            ) : null}
            <span className={`relative ${active ? "text-[var(--interactive-contrast)]" : ""}`}>
              {labels[item]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(ThemeSwitcher);
