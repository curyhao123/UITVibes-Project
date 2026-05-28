/**
 * Micro-interactions hook and utilities for UI feedback.
 *
 * Provides:
 * - Press scale animations
 * - Haptic feedback patterns
 * - Confetti/particle effects for celebrations
 * - Number counting animations
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import {
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | 'none';

const SPRING_PRESS = { damping: 20, stiffness: 300 };
const SPRING_RELEASE = { damping: 15, stiffness: 200 };
const SPRING_Bounce = { damping: 12, stiffness: 400 };

// ─── Haptic Helpers ───────────────────────────────────────────────────────────

export function triggerHaptic(style: HapticStyle = 'light') {
  if (Platform.OS === 'web' || style === 'none') return;

  const hapticMap: Record<HapticStyle, Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType | null> = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    heavy: Haptics.ImpactFeedbackStyle.Heavy,
    soft: Haptics.ImpactFeedbackStyle.Light,
    rigid: Haptics.ImpactFeedbackStyle.Heavy,
    none: null,
  };

  const haptic = hapticMap[style];
  if (haptic !== null) {
    Haptics.impactAsync(haptic);
  }
}

export function triggerNotification(type: 'success' | 'warning' | 'error') {
  if (Platform.OS === 'web') return;

  const notificationMap = {
    success: Haptics.NotificationFeedbackType.Success,
    warning: Haptics.NotificationFeedbackType.Warning,
    error: Haptics.NotificationFeedbackType.Error,
  };

  Haptics.notificationAsync(notificationMap[type]);
}

// ─── usePressAnimation Hook ───────────────────────────────────────────────────

export function usePressAnimation(onPress?: () => void, hapticStyle: HapticStyle = 'light') {
  const scale = useSharedValue(1);

  const triggerHapticCallback = useCallback(() => {
    triggerHaptic(hapticStyle);
  }, [hapticStyle]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, SPRING_PRESS);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_RELEASE);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (onPress) {
      runOnJS(triggerHapticCallback)();
      runOnJS(onPress)();
    }
  }, [onPress, triggerHapticCallback]);

  return {
    scale,
    handlePressIn,
    handlePressOut,
    handlePress,
  };
}

// ─── useLikeAnimation Hook ────────────────────────────────────────────────────

export function useLikeAnimation() {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const animateLike = useCallback(() => {
    'worklet';
    // Heart scale bounce
    iconScale.value = withSequence(
      withSpring(1.4, SPRING_Bounce),
      withSpring(1.0, SPRING_RELEASE),
    );

    // Big heart overlay scale (already handled separately in AnimatedHeart)
    scale.value = withSequence(
      withSpring(0, SPRING_PRESS),
      withSpring(1.2, SPRING_Bounce),
      withSpring(1, SPRING_RELEASE),
    );
  }, [scale, iconScale]);

  const animateUnlike = useCallback(() => {
    'worklet';
    iconScale.value = withSequence(
      withSpring(0.8, SPRING_PRESS),
      withSpring(1, SPRING_RELEASE),
    );
  }, [iconScale]);

  return { scale, iconScale, animateLike, animateUnlike };
}

// ─── useBookmarkAnimation Hook ───────────────────────────────────────────────

export function useBookmarkAnimation() {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animateBookmark = useCallback((isBookmarking: boolean) => {
    'worklet';
    if (isBookmarking) {
      // Bookmark with bounce and slight rotation
      scale.value = withSequence(
        withSpring(1.3, SPRING_Bounce),
        withSpring(1, SPRING_RELEASE),
      );
      rotation.value = withSequence(
        withTiming(-15, { duration: 80 }),
        withTiming(15, { duration: 100 }),
        withTiming(0, { duration: 80 }),
      );
    } else {
      scale.value = withSequence(
        withSpring(0.8, SPRING_PRESS),
        withSpring(1, SPRING_RELEASE),
      );
    }
  }, [scale, rotation]);

  return { scale, rotation, animateBookmark };
}

// ─── useRepostAnimation Hook ─────────────────────────────────────────────────

export function useRepostAnimation() {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animateRepost = useCallback((isReposting: boolean) => {
    'worklet';
    if (isReposting) {
      scale.value = withSequence(
        withSpring(1.2, SPRING_Bounce),
        withSpring(1, SPRING_RELEASE),
      );
      rotation.value = withSequence(
        withTiming(180, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withTiming(360, { duration: 200, easing: Easing.in(Easing.cubic) }),
      );
    } else {
      scale.value = withSequence(
        withSpring(0.9, SPRING_PRESS),
        withSpring(1, SPRING_RELEASE),
      );
    }
  }, [scale, rotation]);

  return { scale, rotation, animateRepost };
}

// ─── useCountAnimation Hook ─────────────────────────────────────────────────

export function useCountAnimation(initialValue: number = 0) {
  const animatedValue = useSharedValue(initialValue);
  const scale = useSharedValue(1);

  const animateChange = useCallback((newValue: number) => {
    'worklet';
    // Bounce the number when it changes
    scale.value = withSequence(
      withSpring(1.3, SPRING_Bounce),
      withSpring(1, SPRING_RELEASE),
    );
    animatedValue.value = newValue;
  }, [animatedValue, scale]);

  return { animatedValue, scale, animateChange };
}

// ─── useShakeAnimation Hook ─────────────────────────────────────────────────

export function useShakeAnimation() {
  const translateX = useSharedValue(0);

  const shake = useCallback(() => {
    'worklet';
    translateX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-3, { duration: 40 }),
      withTiming(3, { duration: 40 }),
      withTiming(0, { duration: 30 }),
    );
  }, [translateX]);

  return { translateX, shake };
}

// ─── usePulseAnimation Hook ──────────────────────────────────────────────────

export function usePulseAnimation() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const pulse = useCallback(() => {
    'worklet';
    scale.value = withSequence(
      withSpring(1.05, SPRING_Bounce),
      withSpring(1, SPRING_RELEASE),
    );
    opacity.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1, { duration: 200 }),
    );
  }, [scale, opacity]);

  return { scale, opacity, pulse };
}

// ─── useSuccessAnimation Hook ────────────────────────────────────────────────

export function useSuccessAnimation() {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(-180);

  const play = useCallback(() => {
    'worklet';
    opacity.value = withTiming(1, { duration: 100 });
    scale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 300 }),
      withSpring(1, SPRING_RELEASE),
    );
    rotation.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(2)) });
  }, [scale, opacity, rotation]);

  const hide = useCallback(() => {
    'worklet';
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0, { duration: 200 });
  }, [scale, opacity]);

  return { scale, opacity, rotation, play, hide };
}

// ─── useBounceInAnimation Hook ──────────────────────────────────────────────

export function useBounceInAnimation(delay: number = 0) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const play = useCallback(() => {
    'worklet';
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1.15, SPRING_Bounce),
        withSpring(1, SPRING_RELEASE),
      ),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 150 }));
  }, [scale, opacity, delay]);

  const reset = useCallback(() => {
    'worklet';
    scale.value = 0;
    opacity.value = 0;
  }, [scale, opacity]);

  return { scale, opacity, play, reset };
}

// ─── useSwipeFeedback Hook ──────────────────────────────────────────────────

export function useSwipeFeedback() {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const onSwipeProgress = useCallback((distance: number, maxDistance: number) => {
    'worklet';
    const progress = Math.min(Math.abs(distance) / maxDistance, 1);
    opacity.value = 0.5 + progress * 0.5;
  }, [opacity]);

  const onSwipeRelease = useCallback(() => {
    'worklet';
    opacity.value = withTiming(1, { duration: 150 });
  }, [opacity]);

  return { translateX, opacity, onSwipeProgress, onSwipeRelease };
}

// ─── Spring Configurations ───────────────────────────────────────────────────

export const SpringConfigs = {
  press: SPRING_PRESS,
  release: SPRING_RELEASE,
  bounce: SPRING_Bounce,
  gentle: { damping: 25, stiffness: 150, mass: 1 },
  snappy: { damping: 15, stiffness: 400, mass: 0.8 },
  stiff: { damping: 12, stiffness: 500, mass: 0.6 },
};
