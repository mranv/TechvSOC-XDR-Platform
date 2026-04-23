import { motion } from "framer-motion";

function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-muted)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      {actions ? <div>{actions}</div> : null}
    </motion.div>
  );
}

export default PageHeader;
