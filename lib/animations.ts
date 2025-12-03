/**
 * Animation utilities - Single source of truth for all animation configuration
 * Minimal, reusable, zero-bloat approach
 */

export const animationConfig = {
  // Standard timing functions
  timing: {
    fast: 0.2,
    default: 0.3,
    slow: 0.6,
    verySlow: 1,
  },

  // Easing functions
  easing: {
    inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
    out: [0, 0, 0.2, 1] as [number, number, number, number],
  },

  // Variants for Framer Motion
  variants: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    slideInDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    slideInLeft: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    slideInRight: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    },
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
    // Staggered children animations
    staggerContainer: {
      animate: {
        transition: {
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
      },
    },
    staggerItem: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
    },
  },

  // Transition configs
  transitions: {
    default: { duration: 0.3, ease: 'easeInOut' },
    fast: { duration: 0.2, ease: 'easeInOut' },
    slow: { duration: 0.6, ease: 'easeInOut' },
    spring: { type: 'spring', stiffness: 100, damping: 15 },
  },

  // Blend mode animations (CSS)
  blendModes: {
    multiply: 'multiply',
    lighten: 'lighten',
    overlay: 'overlay',
  },

  // Scroll trigger thresholds
  scroll: {
    once: { once: true, margin: '-100px 0px -100px 0px', threshold: 0.1 },
  },
} as const
