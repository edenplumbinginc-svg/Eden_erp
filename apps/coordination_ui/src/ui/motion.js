// Motion presets to keep transitions consistent across the app
export const EASE = {
  standard: [0.2, 0.0, 0.2, 1.0],
  emphasized: [0.2, 0.0, 0.0, 1.0],
};

export const DUR = {
  xxs: 0.09,  // 90ms
  xs: 0.14,
  sm: 0.20,
  md: 0.28,
  lg: 0.36,
};

// Shared transitions
export const tPage = { duration: DUR.md, ease: EASE.standard };
export const tUI = { duration: DUR.sm, ease: EASE.standard };
export const tFast = { duration: DUR.xs, ease: EASE.standard };

// Page transition variants (with subtle blur for premium feel)
export const pageVariants = {
  initial: { opacity: 0, y: 8, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(2px)' },
};

// Card hover lift effect
export const hoverLift = {
  rest: { y: 0, boxShadow: 'var(--shadow-1)' },
  hover: { y: -2, boxShadow: 'var(--shadow-2)' },
};

// Button press effect
export const press = {
  rest: { scale: 1.0 },
  tap: { scale: 0.98 },
};

// Fade in/out (for modals, tooltips)
export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// Scale up (for popovers)
export const scaleVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};
