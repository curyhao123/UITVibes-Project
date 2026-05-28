/**
 * Enhanced SkeletonLoader — smooth pulsing skeleton components with traveling shimmer effect.
 *
 * Features:
 * - Traveling highlight shimmer (like Stripe/MercadoPago loading)
 * - Staggered entrance animations
 * - Multiple skeleton variants
 * - Customizable colors
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import { AppColors, borderRadius as themeRadii } from '../constants/theme';

// ─── Animation constants ───────────────────────────────────────────────────────

const SHIMMER_DURATION = 1800; // ms — smooth traveling effect
const ENTRANCE_STAGGER = 80; // ms delay between items

// ─── Traveling Shimmer Core ───────────────────────────────────────────────────

interface TravelingShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  baseColor?: string;
  highlightColor?: string;
  duration?: number;
}

export const TravelingShimmer: React.FC<TravelingShimmerProps> = ({
  width = '100%',
  height = 16,
  borderRadius: radius = themeRadii.sm,
  style,
  baseColor = AppColors.borderLight,
  highlightColor = 'rgba(255, 255, 255, 0.7)',
  duration = SHIMMER_DURATION,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => {
    // Traveling highlight from left to right
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-(width === '100%' ? 300 : Number(width) || 200), width === '100%' ? 300 : Number(width) || 200]
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        styles.shimmerBase,
        { width, height, borderRadius: radius, backgroundColor: baseColor },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmerHighlight,
          { borderRadius: radius },
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.shimmerGradient,
            { backgroundColor: highlightColor },
          ]}
        />
      </Animated.View>
    </View>
  );
};

// ─── Pulse Shimmer (for subtle backgrounds) ───────────────────────────────────

interface PulseShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  baseColor?: string;
  pulseColor?: string;
}

export const PulseShimmer: React.FC<PulseShimmerProps> = ({
  width = '100%',
  height = 16,
  borderRadius: radius = themeRadii.sm,
  style,
  baseColor = AppColors.borderLight,
  pulseColor = 'rgba(255, 255, 255, 0.5)',
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      style={[
        styles.pulseBase,
        { width, height, borderRadius: radius, backgroundColor: baseColor },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.pulseOverlay,
          { borderRadius: radius, backgroundColor: pulseColor },
          animatedStyle,
        ]}
      />
    </View>
  );
};

// ─── Bounce Entrance Skeleton ────────────────────────────────────────────────

interface BounceEntranceProps {
  children: React.ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export const BounceEntrance: React.FC<BounceEntranceProps> = ({
  children,
  index = 0,
  style,
}) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * ENTRANCE_STAGGER;
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.05, { duration: 150, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 100, easing: Easing.out(Easing.ease) }),
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View style={style}>{children}</View>
    </Animated.View>
  );
};

// ─── Higher-level primitives ───────────────────────────────────────────────────

interface SkeletonLineProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({
  width = '100%',
  height = 14,
  borderRadius = themeRadii.sm,
  style,
}) => (
  <TravelingShimmer width={width} height={height} borderRadius={borderRadius} style={style} />
);

interface SkeletonCircleProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  style,
}) => (
  <TravelingShimmer
    width={size}
    height={size}
    borderRadius={size / 2}
    style={[{ marginRight: 8 }, style]}
  />
);

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 200,
  borderRadius = themeRadii.md,
  style,
}) => (
  <TravelingShimmer width={width} height={height} borderRadius={borderRadius} style={style} />
);

// ─── Post skeleton ──────────────────────────────────────────────────────────

export const SkeletonPostCard: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <Animated.View style={[postStyles.card]}>
    <BounceEntrance index={index}>
      {/* Avatar + username row */}
      <View style={postStyles.avatarRow}>
        <SkeletonCircle size={36} />
        <View style={postStyles.nameLines}>
          <SkeletonLine width="35%" height={12} />
          <SkeletonLine width="20%" height={10} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Square image placeholder */}
      <SkeletonBox
        width="100%"
        height={320}
        borderRadius={themeRadii.lg}
        style={{ marginTop: 8 }}
      />

      {/* Action icons row */}
      <View style={postStyles.actionsRow}>
        <SkeletonCircle size={24} />
        <SkeletonCircle size={24} style={{ marginLeft: 16 }} />
        <SkeletonCircle size={24} style={{ marginLeft: 16 }} />
      </View>

      {/* Caption lines */}
      <View style={postStyles.captionArea}>
        <SkeletonLine width="60%" height={12} />
        <SkeletonLine width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
    </BounceEntrance>
  </Animated.View>
);

// ─── Feed skeleton ──────────────────────────────────────────────────────────

interface FeedSkeletonProps {
  count?: number;
}

export const FeedSkeleton: React.FC<FeedSkeletonProps> = ({ count = 3 }) => (
  <View style={{ paddingTop: 8 }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonPostCard key={i} index={i} />
    ))}
  </View>
);

// ─── Message skeleton ────────────────────────────────────────────────────────

export const SkeletonMessageItem: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <BounceEntrance index={index}>
    <View style={messageStyles.item}>
      <SkeletonCircle size={48} />
      <View style={messageStyles.content}>
        <View style={messageStyles.header}>
          <SkeletonLine width="40%" height={14} />
          <SkeletonLine width="15%" height={12} />
        </View>
        <SkeletonLine width="70%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  </BounceEntrance>
);

export const MessageListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonMessageItem key={i} index={i} />
    ))}
  </View>
);

// ─── Compact list skeleton ────────────────────────────────────────────────────

export const SkeletonListItem: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <BounceEntrance index={index}>
    <View style={listStyles.item}>
      <SkeletonCircle size={48} />
      <View style={listStyles.textArea}>
        <SkeletonLine width="40%" height={13} />
        <SkeletonLine width="25%" height={11} style={{ marginTop: 4 }} />
      </View>
      <TravelingShimmer width={70} height={30} borderRadius={themeRadii.sm} />
    </View>
  </BounceEntrance>
);

export const UserListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonListItem key={i} index={i} />
    ))}
  </View>
);

// ─── Story skeleton ─────────────────────────────────────────────────────────

export const SkeletonStory: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <BounceEntrance index={index}>
    <View style={storyStyles.container}>
      <TravelingShimmer
        width={64}
        height={64}
        borderRadius={32}
        style={storyStyles.avatar}
      />
      <SkeletonLine width={50} height={10} style={{ marginTop: 6 }} />
    </View>
  </BounceEntrance>
);

export const StoryBarSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={storyStyles.bar}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStory key={i} index={i} />
    ))}
  </View>
);

// ─── Profile skeleton ────────────────────────────────────────────────────────

export const ProfileSkeleton: React.FC = () => (
  <View style={profileStyles.container}>
    <BounceEntrance index={0}>
      <View style={profileStyles.header}>
        <TravelingShimmer
          width={80}
          height={80}
          borderRadius={40}
          style={profileStyles.avatar}
        />
        <View style={profileStyles.stats}>
          <SkeletonLine width={60} height={24} />
          <SkeletonLine width={60} height={24} />
          <SkeletonLine width={60} height={24} />
        </View>
      </View>
      <SkeletonLine width="40%" height={16} style={{ marginTop: 12 }} />
      <SkeletonLine width="25%" height={12} style={{ marginTop: 6 }} />
      <SkeletonLine width="60%" height={12} style={{ marginTop: 8 }} />
    </BounceEntrance>
  </View>
);

// ─── Comment skeleton ────────────────────────────────────────────────────────

export const SkeletonComment: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <BounceEntrance index={index}>
    <View style={commentStyles.container}>
      <SkeletonCircle size={36} />
      <View style={commentStyles.content}>
        <SkeletonLine width="30%" height={11} />
        <SkeletonLine width="80%" height={13} style={{ marginTop: 4 }} />
        <SkeletonLine width="50%" height={11} style={{ marginTop: 4 }} />
      </View>
    </View>
  </BounceEntrance>
);

export const CommentListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonComment key={i} index={i} />
    ))}
  </View>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  shimmerBase: {
    overflow: 'hidden',
  },
  shimmerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '50%',
    overflow: 'hidden',
  },
  shimmerGradient: {
    flex: 1,
    transform: [{ skewX: '-20deg' }],
  },
  pulseBase: {
    overflow: 'hidden',
  },
  pulseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

const postStyles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    marginBottom: 14,
    padding: 12,
    borderRadius: themeRadii.lg,
    overflow: 'hidden',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameLines: {
    flex: 1,
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  captionArea: {
    marginTop: 10,
    paddingHorizontal: 4,
  },
});

const listStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  textArea: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
});

const messageStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

const storyStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  avatar: {
    borderWidth: 2,
    borderColor: AppColors.borderLight,
  },
});

const profileStyles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatar: {
    borderWidth: 3,
    borderColor: AppColors.primary,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
});

const commentStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
});
