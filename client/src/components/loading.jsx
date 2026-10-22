import { motion } from "motion/react";
import { fadeOffsets, fadeTransition } from "./loadingVariants.js";

export function StreakBar() {
  return (
    <motion.div
      role="progressbar"
      aria-label="Loading dashboard"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      exit={{ scaleX: 1, transition: { duration: 0.7, ease: "easeOut" } }}
      transition={{ duration: 1.5, ease: "linear" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-[#0A8B8E]"
    />
  );
}

export function FadeIn({ from = "bottom", delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, ...fadeOffsets[from] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...fadeTransition, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200 dark:bg-neutral-800 ${className}`}
      {...props}
    />
  );
}
