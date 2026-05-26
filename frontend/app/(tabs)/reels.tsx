/**
 * ReelsScreen — Full-screen vertical reel feed with Instagram-style UI.
 *
 * Features:
 * - Fetches reels from backend API
 * - Vertical swipe navigation between reels
 * - Double-tap to like with animated heart
 * - Comment sheet (bottom sheet)
 * - Share sheet with multiple options
 * - Progress bar for video playback simulation
 * - User profile navigation
 * - Follow/unfollow functionality
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { Header } from '../../components';
import { ReelCard, ReelDisplayData } from '../../components/ReelCard';
import { CommentSheet } from '../../components/CommentSheet';
import { ShareSheet } from '../../components/ShareSheet';
import { useApp } from '../../context/AppContext';
import { mockComments } from '../../data/mockData';
import type { Comment as CommentType } from '../../data/mockData';
import { fetchUserById } from '../../services/userService';
import { User } from '../../data/mockData';
import type { Reel as APIReel } from '../../services/postService';
import { TAB_BAR_BOTTOM_OFFSET } from '../../components/ModernTabBar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// ─── User data cache ─────────────────────────────────────────────────────────
const userCache: Map<string, User> = new Map();

// ─── Transform API Reel to Display Data ───────────────────────────────────────

function transformReelForDisplay(reel: APIReel, userMap: Map<string, User>): ReelDisplayData {
  const user = userMap.get(reel.userId) || {
    id: reel.userId,
    username: reel.ownerDisplayName?.toLowerCase().replace(/\s+/g, '_') || 'user',
    displayName: reel.ownerDisplayName || 'User',
    fullName: reel.ownerDisplayName || 'User',
    avatar: reel.ownerAvatarUrl || '',
    coverImage: '',
    bio: '',
    gender: '',
    followers: 0,
    following: 0,
    posts: 0,
    isVerified: false,
    isFollowing: false,
  };

  return {
    id: reel.id,
    userId: reel.userId,
    user,
    videoUrl: reel.videoUrl,
    thumbnailUrl: reel.thumbnailUrl,
    caption: reel.caption,
    likes: reel.likeCount,
    comments: reel.commentCount,
    views: reel.viewCount,
    shares: reel.shareCount,
    isLiked: reel.isLiked,
    isBookmarked: (reel as any).isBookmarked,
    createdAt: reel.createdAt,
  };
}

// ─── Shuffle array (Fisher-Yates) ─────────────────────────────────────────────

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReelsScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const {
    currentUser,
    reels,
    refreshReels,
    toggleReelLike,
    toggleReelBookmark,
    addReelComment,
    deleteReelComment,
    toggleReelCommentLike,
  } = useApp();

  // Calculate item height dynamically based on screen height and tab bar offset
  // Video should extend edge-to-edge, but overlay UI needs bottom padding
  const ITEM_HEIGHT = useMemo(() => {
    // Full screen height minus top safe area (for header)
    return SCREEN_HEIGHT - insets.top;
  }, [insets.top]);

  // Bottom padding for overlay UI to avoid being hidden by tab bar
  const OVERLAY_BOTTOM_PADDING = useMemo(() => {
    return TAB_BAR_BOTTOM_OFFSET + insets.bottom;
  }, [insets.bottom]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentVisible, setCommentVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [selectedReel, setSelectedReel] = useState<ReelDisplayData | null>(null);
  const [reelComments] = useState<CommentType[]>(mockComments);
  const [reelUsers, setReelUsers] = useState<Map<string, User>>(new Map());
  const [displayReels, setDisplayReels] = useState<ReelDisplayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollY = useSharedValue(0);

  // Pause video when screen loses focus, resume when focused
  useEffect(() => {
    if (!isFocused) {
      // When leaving the screen, pause videos
      setIsPaused(true);
    } else {
      // When returning to the screen, resume videos
      setIsPaused(false);
    }
  }, [isFocused]);

  // ── Load reels on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadReels = async () => {
      setIsLoading(true);
      await refreshReels();
      setIsLoading(false);
    };
    loadReels();
  }, [refreshReels]);

  // ── Transform reels when reels or users change ────────────────────────────────
  useEffect(() => {
    const loadAndTransformReels = async () => {
      if (reels.length === 0) {
        setDisplayReels([]);
        return;
      }

      const newUsers = new Map<string, User>(reelUsers);

      // Fetch user data for reels that don't have cached users
      for (const reel of reels) {
        if (!userCache.has(reel.userId)) {
          try {
            const user = await fetchUserById(reel.userId);
            if (user) {
              userCache.set(reel.userId, user);
              newUsers.set(reel.userId, user);
            }
          } catch (error) {
            console.error('Failed to fetch user:', reel.userId, error);
          }
        }
      }

      // Merge with existing users in cache
      for (const [userId, user] of userCache) {
        if (!newUsers.has(userId)) {
          newUsers.set(userId, user);
        }
      }

      setReelUsers(newUsers);

      // Transform reels for display
      let transformed = reels.map((reel) => transformReelForDisplay(reel, newUsers));

      // Shuffle reels randomly for discover feed
      transformed = shuffleArray(transformed);

      setDisplayReels(transformed);
    };

    loadAndTransformReels();
  }, [reels]);

  // ── Scroll handler ──────────────────────────────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // ── Track current reel index ────────────────────────────────────────────────
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index ?? 0;
      setCurrentIndex(newIndex);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // ── Get item layout ─────────────────────────────────────────────────────────
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  // ── Like handlers ───────────────────────────────────────────────────────────
  const handleLike = useCallback((reel: ReelDisplayData) => {
    toggleReelLike(reel.id, reel.isLiked);
  }, [toggleReelLike]);

  // ── Bookmark handler ─────────────────────────────────────────────────────────
  const handleBookmark = useCallback((reel: ReelDisplayData) => {
    toggleReelBookmark(reel.id);
  }, [toggleReelBookmark]);

  // ── Comment handlers ─────────────────────────────────────────────────────────
  const handleOpenComments = useCallback((reel: ReelDisplayData) => {
    setSelectedReel(reel);
    setCommentVisible(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentVisible(false);
  }, []);

  const handlePostComment = useCallback((text: string) => {
    if (selectedReel) {
      addReelComment(selectedReel.id, text);
    }
  }, [selectedReel, addReelComment]);

  const handleLikeComment = useCallback((commentId: string) => {
    toggleReelCommentLike(commentId);
  }, [toggleReelCommentLike]);

  // ── Share handlers ──────────────────────────────────────────────────────────
  const handleOpenShare = useCallback((reel: ReelDisplayData) => {
    setSelectedReel(reel);
    setShareVisible(true);
  }, []);

  const handleCloseShare = useCallback(() => {
    setShareVisible(false);
  }, []);

  // ── User navigation ─────────────────────────────────────────────────────────
  const handleUserPress = useCallback((userId: string) => {
    console.log('Navigate to user:', userId);
  }, []);

  // ── Follow handler ──────────────────────────────────────────────────────────
  const handleFollow = useCallback((userId: string) => {
    Alert.alert('Follow', `You are now following this user!`);
  }, []);

  // ── Render reel card ────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: ReelDisplayData; index: number }) => (
      <ReelCard
        item={item}
        isActive={index === currentIndex}
        isPaused={isPaused}
        itemHeight={ITEM_HEIGHT}
        bottomPadding={OVERLAY_BOTTOM_PADDING}
        onLike={() => handleLike(item)}
        onComment={() => handleOpenComments(item)}
        onShare={() => handleOpenShare(item)}
        onBookmark={() => handleBookmark(item)}
        onUserPress={() => handleUserPress(item.userId)}
        onFollow={() => handleFollow(item.userId)}
      />
    ),
    [currentIndex, isPaused, ITEM_HEIGHT, OVERLAY_BOTTOM_PADDING, handleLike, handleOpenComments, handleOpenShare, handleBookmark, handleUserPress, handleFollow],
  );

  // ── Render separator ─────────────────────────────────────────────────────────
  const ItemSeparator = useCallback(() => <View style={{ height: 0 }} />, []);

  // ── Empty state ─────────────────────────────────────────────────────────────
  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color={AppColors.primary} />
        ) : (
          <>
            <Feather name="video" size={64} color={AppColors.iconMuted} />
            <Text style={styles.emptyTitle}>No reels yet</Text>
            <Text style={styles.emptySubtitle}>
              When people you follow share reels, they'll appear here
            </Text>
          </>
        )}
      </View>
    ),
    [isLoading],
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Header
          title="Reels"
          avatarUser={currentUser}
          rightAction={
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.cameraButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="camera" size={22} color="white" strokeWidth={2} />
            </TouchableOpacity>
          }
          headerStyle={styles.header}
          titleStyle={styles.headerTitle}
        />

        {/* Reels Feed */}
        <Animated.FlatList<ReelDisplayData>
          ref={flatListRef}
          data={displayReels}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          removeClippedSubviews
          windowSize={3}
          decelerationRate="fast"
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={ListEmptyComponent}
        />

        {/* Instagram-style page indicator */}
        {displayReels.length > 1 && (
          <View style={styles.pageIndicator} pointerEvents="none">
            {displayReels.slice(0, 5).map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </SafeAreaView>

      {/* Comment Sheet */}
      <CommentSheet
        visible={commentVisible}
        onClose={handleCloseComments}
        comments={reelComments}
        reelId={selectedReel?.id || ''}
        onPostComment={handlePostComment}
        onLikeComment={handleLikeComment}
        onReply={(commentId) => console.log('Reply to:', commentId)}
      />

      {/* Share Sheet */}
      <ShareSheet
        visible={shareVisible}
        onClose={handleCloseShare}
        reelId={selectedReel?.id || ''}
        caption={selectedReel?.caption || ''}
        username={selectedReel?.user?.username || ''}
      />
    </View>
  );
}

import { AppColors, layoutPadding } from '../../constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    backgroundColor: 'transparent',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  cameraButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicator: {
    position: 'absolute',
    right: 4,
    top: '50%',
    transform: [{ translateY: -50 }],
    flexDirection: 'column',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginVertical: 3,
  },
  dotActive: {
    backgroundColor: 'white',
    height: 18,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.iconMuted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
