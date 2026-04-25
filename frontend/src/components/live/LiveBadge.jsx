import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

function LiveBadge({ count, onClick }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          onClick={onClick}
          className="relative flex h-5 w-5 items-center justify-center"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400/40" />
          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-400 text-[9px] font-bold text-slate-950">
            {count > 9 ? "9+" : count}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default memo(LiveBadge);

