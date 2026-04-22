/**
 * StoryBar — horizontal story strip with smooth scroll & press animations.
 *
 * Enhancements over the plain ScrollView:
 * 1. Animated.ScrollView tracks content offset on the UI thread
 * 2. Each story item scales + fades subtly based on distance from center
 *    (center = full opacity/scale, edges = slightly dimmer/smaller)
 * 3. Spring press feedback on tap (scale down → spring back)
 * 4. "Add story" circle pulses gently to draw attention
 */
import React, { useCallback, useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { Story } from '../services/storyService';
import { useRouter } from 'expo-router';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { SPRING_PRESS, SPRING_SOFT } from '../animations/spring';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const STORY_ITEM_WIDTH = 68; // avatar (64) + text area (remaining)
const STORY_ITEM_CENTER = STORY_ITEM_WIDTH / 2;

interface StoryBarProps {
  stories: Story[];
  isNewUser?: boolean;
  onAddStory?: () => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({ stories, isNewUser = false, onAddStory }) => {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  const displayedStories = stories;

  // ── Scroll handler — tracks position on UI thread ─────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleStoryPress = (story: Story) => {
    router.push(`/story/${story.id}` as any);
  };

  const handleAddStory = () => {
    if (onAddStory) onAddStory();
  };

  // ── "Add story" pulse ──────────────────────────────────────────────────────
  const AddStoryCircle = () => {
    const pulseScale = useSharedValue(1);
    const startPulse = () => { pulseScale.value = withSpring(0.9, SPRING_PRESS); };
    const endPulse = () => { pulseScale.value = withSpring(1.0, SPRING_SOFT); };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pulseScale.value }],
    }));

    return (
      <TouchableOpacity
        onPress={handleAddStory}
        onPressIn={startPulse}
        onPressOut={endPulse}
        activeOpacity={1}
        style={styles.addStoryItem}
      >
        <Animated.View style={[styles.addStoryCircle, animatedStyle]}>
          <Feather name="plus" size={26} color={AppColors.primary} strokeWidth={2} />
        </Animated.View>
        <Text style={styles.addStoryText}>Add story</Text>
      </TouchableOpacity>
    );
  };

  // Story item with scroll-aware scale + fade ──────────────────────────────
  const StoryItem = ({ story, index }: { story: Story; index: number }) => {
    const pressScale = useSharedValue(1);

    // Compute item's center X relative to the ScrollView content
    // (first item is the Add Story button at index 0, then stories start at index 1)
    const itemCenterX = (index + 1) * (STORY_ITEM_WIDTH) - STORY_ITEM_WIDTH / 2;

    const startPress = () => {
      pressScale.value = withSpring(0.88, SPRING_PRESS);
    };
    const endPress = () => {
      pressScale.value = withSpring(1.0, SPRING_SOFT);
    };

    const animatedStyle = useAnimatedStyle(() => {
      // Distance of this item's center from viewport center
      const viewportCenter = SCREEN_WIDTH / 2;
      const distanceFromCenter = Math.abs(itemCenterX - scrollX.value - viewportCenter);
      const maxDistance = SCREEN_WIDTH * 0.5;

      // Scale: 1.0 at center → 0.92 at edges
      const scale = interpolate(
        distanceFromCenter,
        [0, maxDistance],
        [1.0, 0.92],
        Extrapolation.CLAMP,
      );

      // Opacity: 1.0 at center → 0.6 at edges
      const opacity = interpolate(
        distanceFromCenter,
        [0, maxDistance],
        [1.0, 0.6],
        Extrapolation.CLAMP,
      );

      return {
        transform: [
          { scale: pressScale.value * scale },
        ],
        opacity,
      };
    });

    // Map flat story fields to User shape for Avatar component
    const storyUser = {
      id: story.userId,
      username: story.username,
      displayName: story.displayName,
      avatar: story.avatar,
      coverImage: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };

    return (
      <TouchableOpacity
        onPress={() => handleStoryPress(story)}
        onPressIn={startPress}
        onPressOut={endPress}
        activeOpacity={1}
        style={styles.storyItem}
      >
        <Animated.View style={animatedStyle}>
          <Avatar
            user={storyUser}
            size="story"
            showBorder
            isViewed={story.isViewed}
          />
          <Text style={styles.storyUsername} numberOfLines={1}>
            {story.displayName}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AnimatedScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16} // ~60fps scroll events
      >
        <AddStoryCircle />

        {displayedStories.map((story, index) => (
          <StoryItem key={story.id} story={story} index={index} />
        ))}
      </AnimatedScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  scrollView: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
  },
  addStoryItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 68,
  },
  addStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.surfaceElevated,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryText: {
    ...Typography.meta,
    marginTop: 4,
    color: AppColors.text,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 6, // tighter spacing so carousel feels denser
    width: 68,
  },
  storyUsername: {
    ...Typography.meta,
    marginTop: 3,
    color: AppColors.text,
  },
});
