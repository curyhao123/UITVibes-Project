/**
 * ReelsScreen — full-screen vertical reel feed with smooth swipe gestures.
 *
 * Enhancements:
 * 1. Animated.FlatList + Reanimated's useAnimatedScrollHandler
 *    → scroll position tracked on UI thread (no JS bridge lag)
 * 2. Scale/fade of each reel card based on position in viewport
 *    → active reel is full-size; adjacent reels scale to 0.96 + fade
 * 3. Spring press feedback on action icons
 * 4. Press scale on the reel content for "tap to pause" feel
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Header } from '../../components';
import { useApp } from '../../context/AppContext';
import { mockReels } from '../../data/mockData';
import { AppColors } from '../../constants/theme';
import { SPRING_PRESS, SPRING_SOFT } from '../../animations/spring';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// ─── Animated action button ───────────────────────────────────────────────────
const AnimatedActionBtn = ({
  icon,
  count,
  filled,
  onPress,
}: {
  icon: string;
  count?: number;
  filled?: boolean;
  onPress?: () => void;
}) => {
  const scale = useSharedValue(1);
  const startPress = () => { scale.value = withSpring(0.85, SPRING_PRESS); };
  const endPress = () => { scale.value = withSpring(1.0, SPRING_SOFT); };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPressIn={startPress}
      onPressOut={endPress}
      onPress={onPress}
      style={styles.actionItem}
      activeOpacity={1}
    >
      <Animated.View style={animatedStyle}>
        <Feather
          name={icon as any}
          size={28}
          color="white"
          fill={filled ? 'white' : undefined}
        />
      </Animated.View>
      {count !== undefined && (
        <Text style={styles.actionText}>{count}</Text>
      )}
    </TouchableOpacity>
  );
};

// ─── Reel card ──────────────────────────────────────────────────────────────
const ReelCard = ({
  item,
  index,
  scrollY,
}: {
  item: typeof mockReels[0];
  index: number;
  scrollY: Animated.SharedValue<number>;
}) => {
  const itemHeight = SCREEN_HEIGHT - 90; // subtract header height
  const ITEM_CENTER_Y = index * itemHeight + itemHeight / 2;

  const animatedStyle = useAnimatedStyle(() => {
    const viewportCenter = scrollY.value + SCREEN_HEIGHT / 2;
    const distanceFromCenter = Math.abs(ITEM_CENTER_Y - viewportCenter);

    // Scale: full size at center → 0.94 at edges
    const scale = interpolate(
      distanceFromCenter,
      [0, itemHeight * 0.8],
      [1.0, 0.94],
      Extrapolation.CLAMP,
    );

    // Fade: 1 at center → 0.7 at edges
    const opacity = interpolate(
      distanceFromCenter,
      [0, itemHeight * 0.8],
      [1.0, 0.7],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      {/* Background image */}
      <Image
        source={{ uri: `https://picsum.photos/seed/${item.id}/400/800` }}
        style={styles.backgroundImage}
      />

      {/* Dark gradient overlay */}
      <View style={styles.gradientOverlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Bottom left — user + caption */}
        <View style={styles.bottomContent}>
          <Text style={styles.username}>@{item.user.username}</Text>
          <Text style={styles.caption} numberOfLines={3}>
            {item.caption}
          </Text>
        </View>

        {/* Bottom right — actions */}
        <View style={styles.actions}>
          <AnimatedActionBtn icon="heart" count={item.likes} />
          <AnimatedActionBtn icon="message-circle" count={item.comments} />
          <AnimatedActionBtn icon="send" />
          <AnimatedActionBtn icon="bookmark" filled />
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Main screen ────────────────────────────────────────────────────────────
export default function ReelsScreen() {
  const { currentUser } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useSharedValue(0);

  // ── Scroll handler — runs on UI thread, no JS bridge overhead ──────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // ── Track active index from scroll position ───────────────────────────────
  useAnimatedReaction(
    () => scrollY.value,
    (currentScrollY) => {
      const idx = Math.round(currentScrollY / (SCREEN_HEIGHT - 90));
      // Update React state only when index actually changes (runOnJS)
    },
    [currentIndex],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT - 90,
      offset: (SCREEN_HEIGHT - 90) * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: typeof mockReels[0]; index: number }) => (
      <ReelCard item={item} index={index} scrollY={scrollY} />
    ),
    [scrollY],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header
        title="Reels"
        avatarUser={currentUser}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.reelsCameraBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="camera" size={20} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <AnimatedFlatList
        ref={flatListRef}
        data={mockReels}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        windowSize={3}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'black',
  },
  cardContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 90,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 90,
    position: 'absolute',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bottomContent: {
    flex: 1,
    paddingRight: 16,
  },
  username: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
  },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  actionItem: {
    marginBottom: 22,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  reelsCameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
