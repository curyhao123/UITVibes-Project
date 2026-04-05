/**
 * Spring physics configs — all animations use these shared presets
 * so the app feels cohesive and physics-accurate.
 */
import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';

/**
 * Bouncy spring — for heart bounce, heart scale overshoot.
 * Slight overshoot (damping < 1) gives a satisfying "pop" feel.
 */
export const SPRING_BOUNCE: WithSpringConfig = {
  damping: 12,
  stiffness: 300,
  mass: 0.8,
};

/**
 * Soft spring — for card/item entrances, modal open/close.
 * Well-damped (damping > 1) for a smooth settle.
 */
export const SPRING_SOFT: WithSpringConfig = {
  damping: 20,
  stiffness: 180,
  mass: 1,
};

/**
 * Gentle spring — for subtle scale/shadow transitions.
 * Very damped to avoid any bounce.
 */
export const SPRING_GENTLE: WithSpringConfig = {
  damping: 28,
  stiffness: 120,
  mass: 1,
};

/**
 * Press spring — fast, snappy response for tap/press feedback.
 */
export const SPRING_PRESS: WithSpringConfig = {
  damping: 18,
  stiffness: 400,
  mass: 0.5,
};

/**
 * Horizontal scroll spring — for swipe/pan release snap-back.
 */
export const SPRING_HORIZONTAL: WithSpringConfig = {
  damping: 22,
  stiffness: 220,
  mass: 0.9,
};

/** Quick ease-out — for opacity fades (300ms) */
export const TIMING_FAST: WithTimingConfig = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

/** Standard ease-out — for state transitions (400ms) */
export const TIMING_STANDARD: WithTimingConfig = {
  duration: 350,
  easing: Easing.out(Easing.cubic),
};

/** Slow ease-in-out — for skeleton pulse loops */
export const TIMING_PULSE: WithTimingConfig = {
  duration: 1200,
  easing: Easing.inOut(Easing.ease),
};

/** Staggered entrance — for list item reveals (50ms stagger) */
export const TIMING_STAGGER: WithTimingConfig = {
  duration: 280,
  easing: Easing.out(Easing.cubic),
};
