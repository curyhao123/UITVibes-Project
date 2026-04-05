/**
 * AnimatedHeart — the large bouncing heart overlay shown on double-tap like.
 *
 * Spring physics:
 *  1. Taps — instant scale up to 1.3 via spring
 *  2. Settles back to 1.0 via spring
 *  3. Secondary pulse at 1.1 before fully settling
 *  4. Fades out after 600ms
 *
 * All animations run on the UI thread.
 */
import React, { useEffect, useCallback } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { AppColors } from '../constants/theme';
import { SPRING_BOUNCE, TIMING_FAST } from '../animations/spring';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEART_SIZE = 100;

// ─── Hook: useAnimatedHeart — drives the heart visibility & animations ──────────

export function useAnimatedHeart() {
  const scale = useSharedValue(0);   // 0 = hidden, 1 = full size
  const opacity = useSharedValue(0);  // fades in/out

  const play = useCallback(() => {
    'worklet';
    // Reset then play the spring sequence
    opacity.value = 1;
    scale.value = 0;

    // Scale: 0 → 1.3 (overshoot) → 1.0
    scale.value = withSequence(
      withSpring(1.35, SPRING_BOUNCE),  // fast overshoot
      withSpring(1.0, SPRING_BOUNCE),    // settle back
    );

    // Auto-fade out after 700ms
    opacity.value = withDelay(
      700,
      withSpring(0, { ...TIMING_FAST, duration: 200 }, (finished) => {
        if (finished) {
          scale.value = 0;
        }
      }),
    );
  }, []);

  return { scale, opacity, play };
}

// ─── AnimatedHeart component ──────────────────────────────────────────────────

interface AnimatedHeartProps {
  scale: Animated.SharedValue<number>;
  opacity: Animated.SharedValue<number>;
}

export const AnimatedHeart: React.FC<AnimatedHeartProps> = ({ scale, opacity }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.heartContainer, animatedStyle]} pointerEvents="none">
      <Feather
        name="heart"
        size={HEART_SIZE}
        color={AppColors.primary}
        fill={AppColors.primary}
      />
    </Animated.View>
  );
};

// ─── Small heart icon for the action button ────────────────────────────────────

interface AnimatedHeartIconProps {
  isLiked: boolean;
  scale: Animated.SharedValue<number>;
}

export const AnimatedHeartIcon: React.FC<AnimatedHeartIconProps> = ({ isLiked, scale }) => {
  // Drive a micro-bounce when liked state changes to true
  useEffect(() => {
    if (isLiked) {
      scale.value = withSequence(
        withSpring(1.4, { damping: 10, stiffness: 500 }),
        withSpring(1.0, { damping: 15, stiffness: 200 }),
      );
    } else {
      scale.value = withSpring(1.0, { damping: 15, stiffness: 200 });
    }
  }, [isLiked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather
        name="heart"
        size={24}
        color={isLiked ? AppColors.primary : '#FFFFFF'}
        fill={isLiked ? AppColors.primary : 'transparent'}
        strokeWidth={2}
      />
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heartContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
});
