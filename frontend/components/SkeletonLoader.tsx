/**
 * SkeletonLoader — smooth pulsing skeleton components for loading states.
 *
 * Architecture:
 *  - SkeletonShimmer is the atom: a single animated rectangle.
 *  - SkeletonLine / SkeletonCircle / SkeletonBox are higher-level primitives.
 *  - SkeletonPost / SkeletonPostCard compose them for specific screens.
 *  - FeedSkeleton wraps 3 SkeletonPostCards for the home feed.
 *
 * All shimmer animations run on the UI thread via Reanimated — no JS timers.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { AppColors, borderRadius as themeRadii } from '../constants/theme';

// ─── Animation constants ───────────────────────────────────────────────────────

const SHIMMER_DURATION = 1400; // ms — slow enough to be calm, fast enough to feel alive

// ─── Core shimmer atom ─────────────────────────────────────────────────────────

interface SkeletonShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Base color — defaults to surfaceElevated (white shimmer on borderLight bg) */
  baseColor?: string;
}

export const SkeletonShimmer: React.FC<SkeletonShimmerProps> = ({
  width = '100%',
  height = 16,
  borderRadius: radius = themeRadii.sm,
  style,
  baseColor = AppColors.borderLight,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: SHIMMER_DURATION / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: SHIMMER_DURATION / 2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite repeat
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    // Interpolate shimmer highlight position
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.3, 0.7, 0.3]);
    return { opacity };
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
      />
    </View>
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
  <SkeletonShimmer width={width} height={height} borderRadius={borderRadius} style={style} />
);

interface SkeletonCircleProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 40,
  style,
}) => (
  <SkeletonShimmer
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
  <SkeletonShimmer width={width} height={height} borderRadius={borderRadius} style={style} />
);

// ─── Post skeleton (square image + caption + avatar) ──────────────────────────

export const SkeletonPostCard: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <Animated.View style={[postStyles.card, postStyles.cardEntrance(index)]}>
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
  </Animated.View>
);

// ─── Feed skeleton (multiple post cards) ──────────────────────────────────────

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

// ─── Compact list skeleton (for followers / search) ────────────────────────────

export const SkeletonListItem: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <Animated.View style={[listStyles.item, listStyles.itemEntrance(index)]}>
    <SkeletonCircle size={48} />
    <View style={listStyles.textArea}>
      <SkeletonLine width="40%" height={13} />
      <SkeletonLine width="25%" height={11} style={{ marginTop: 4 }} />
    </View>
    <SkeletonShimmer width={70} height={30} borderRadius={themeRadii.sm} />
  </Animated.View>
);

export const UserListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonListItem key={i} index={i} />
    ))}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
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
  cardEntrance: (index: number) => ({
    opacity: 1,
  }),
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
  itemEntrance: (index: number) => ({
    opacity: 1,
  }),
});
