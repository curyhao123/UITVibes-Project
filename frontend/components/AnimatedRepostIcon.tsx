import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface AnimatedRepostIconProps {
  isReposted: boolean;
  size?: number;
}

export const AnimatedRepostIcon: React.FC<AnimatedRepostIconProps> = ({ isReposted, size = 24 }) => {
  const { colors } = useTheme();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const hasMounted = useRef(false);

  useEffect(() => {
    // Only animate user-driven changes, not the initial reposted state of a post.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (isReposted) {
      rotation.value = withTiming(rotation.value + 360, {
        duration: 600,
        easing: Easing.out(Easing.back(1.6)),
      });
      scale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 220 }),
      );
    } else {
      rotation.value = withTiming(rotation.value - 180, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSequence(
        withTiming(0.8, { duration: 90 }),
        withSpring(1, { damping: 12, stiffness: 260 }),
      );
    }
  }, [isReposted, rotation, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather
        name="refresh-cw"
        size={size}
        color={isReposted ? colors.primary : colors.iconMuted}
      />
    </Animated.View>
  );
};
