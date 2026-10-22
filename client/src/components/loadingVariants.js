export const fadeTransition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
export const fadeOffsets = {
  top: { y: -24 },
  bottom: { y: 24 },
  left: { x: -32 },
  right: { x: 32 },
};
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
export const riseIn = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: fadeTransition },
};
