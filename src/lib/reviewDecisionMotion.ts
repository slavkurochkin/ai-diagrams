/**
 * Motion presets for review decision cards and panels (no CSS filter — shimmer overlay handles exit flash).
 */
export const reviewDecisionCardMotion = {
  layout: true as const,
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 14,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.86,
    y: -22,
    rotate: -0.5,
    transition: {
      duration: 0.48,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  transition: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  },
} as const;

/** Whole “decisions from review” strip (chat or workspace) — one cohesive dissolve. */
export const reviewDecisionPanelMotion = {
  initial: {
    opacity: 0,
    y: -8,
    scale: 0.99,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 34 },
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -12,
    transition: {
      duration: 0.5,
      ease: [0.19, 1, 0.22, 1] as const,
    },
  },
} as const;

/** Primary action row (Apply / Improve) — short “poof” after work completes. */
export const reviewApplyRowMotion = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 28 },
  },
  exit: {
    opacity: 0,
    scale: 0.82,
    y: 6,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
} as const;
