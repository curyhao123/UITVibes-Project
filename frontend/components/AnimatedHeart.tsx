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
import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SPRING_BOUNCE, TIMING_FAST } from '../animations/spring';
import { useTheme } from '../context/ThemeContext';

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
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
}

export const AnimatedHeart: React.FC<AnimatedHeartProps> = ({ scale, opacity }) => {
  const { colors } = useTheme();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.heartContainer, animatedStyle]} pointerEvents="none">
      <Ionicons name="heart" size={HEART_SIZE} color={colors.primary} />
    </Animated.View>
  );
};

// ─── Small heart icon for the action button ────────────────────────────────────

const BURST_PARTICLES = 6;
const BURST_DURATION = 550;

interface AnimatedHeartIconProps {
  isLiked: boolean;
  size?: number;
  inactiveColor?: string;
}

export const AnimatedHeartIcon: React.FC<AnimatedHeartIconProps> = ({ isLiked, size = 24, inactiveColor }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const burst = useSharedValue(0);
  const hasMounted = useRef(false);

  useEffect(() => {
    // Only animate user-driven changes, not the initial liked state of a post.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (isLiked) {
      scale.value = withSequence(
        withTiming(0.6, { duration: 80 }),
        withSpring(1.35, { damping: 6, stiffness: 420 }),
        withSpring(1, { damping: 12, stiffness: 220 }),
      );
      burst.value = 0;
      burst.value = withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.cubic) });
    } else {
      scale.value = withSequence(
        withTiming(0.75, { duration: 90 }),
        withSpring(1, { damping: 12, stiffness: 260 }),
      );
    }
  }, [isLiked, scale, burst]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : 1 - burst.value,
    transform: [{ scale: 0.3 + burst.value * 1.5 }],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.burstRing,
          { width: size, height: size, borderRadius: size / 2, borderColor: colors.primary },
          ringStyle,
        ]}
      />
      {Array.from({ length: BURST_PARTICLES }, (_, i) => (
        <BurstParticle
          key={i}
          progress={burst}
          angle={(i / BURST_PARTICLES) * Math.PI * 2 - Math.PI / 2}
          distance={size}
          color={i % 2 === 0 ? colors.primary : colors.primaryLight}
          center={size / 2}
        />
      ))}
      <Animated.View style={heartStyle}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={size}
          color={isLiked ? colors.primary : inactiveColor ?? colors.iconMuted}
        />
      </Animated.View>
    </View>
  );
};

interface BurstParticleProps {
  progress: SharedValue<number>;
  angle: number;
  distance: number;
  color: string;
  center: number;
}

const PARTICLE_SIZE = 5;

function BurstParticle({ progress, angle, distance, color, center }: BurstParticleProps) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p === 0 ? 0 : 1 - p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p },
        { scale: 1 - p * 0.6 },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          backgroundColor: color,
          left: center - PARTICLE_SIZE / 2,
          top: center - PARTICLE_SIZE / 2,
        },
        style,
      ]}
    />
  );
}

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
  burstRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  particle: {
    position: 'absolute',
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    borderRadius: PARTICLE_SIZE / 2,
  },
});
