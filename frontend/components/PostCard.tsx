import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Avatar } from './Avatar';
import { Post } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useDoubleTap } from '../animations/useDoubleTap';
import { useAnimatedHeart, AnimatedHeart, AnimatedHeartIcon } from './AnimatedHeart';
import { SwipeableRow } from './SwipeableRow';
import { repostPost, undoRepost, toggleBookmark, removeBookmark } from '../services/postService';
import { blockUser } from '../services/blockService';
import { ImageCarousel } from './ImageCarousel';
import { PostActionsSheet } from './PostActionsSheet';
import { ReportPostSheet } from './ReportPostSheet';
import { type ReportReason } from '../services/backendTypes';
import { triggerHaptic } from '../hooks/useMicroInteractions';
import { MentionText } from './MentionText';

const ACTION_ICON = 24;

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { toggleLike, toggleBookmark, currentUser, toggleFollow, deletePost } = useApp();
  const router = useRouter();

  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);

  // ── Multi-image source ────────────────────────────────────────────────
  const images = post.images && post.images.length > 0
    ? post.images
    : post.image ? [post.image] : [];

  // ── Heart animation state ──────────────────────────────────────────────
  const { scale: heartScale, opacity: heartOpacity, play: playHeart } = useAnimatedHeart();
  const likeIconScale = useSharedValue(1);
  const [localLiked, setLocalLiked] = React.useState(post.isLiked);
  const [localReposted, setLocalReposted] = React.useState(post.isReposted ?? false);
  const [localRepostCount, setLocalRepostCount] = React.useState(post.repostCount ?? 0);
  const [localIsFollowing, setLocalIsFollowing] = useState(post.user.isFollowing ?? false);
  const [localBookmarked, setLocalBookmarked] = useState(post.isBookmarked ?? false);

  const currentUserId = currentUser?.id ?? '';
  const isOwner = currentUserId === post.userId;

  // ── Double-tap to like ────────────────────────────────────────────────
  const handleDoubleTap = useCallback(async () => {
    if (!localLiked) {
      setLocalLiked(true);
      await toggleLike(post.id, false);
    }
    playHeart();
  }, [localLiked, post.id, playHeart, toggleLike]);

  const handleOpenPost = useCallback(() => {
    router.push(`/post/${post.id}` as any);
  }, [post.id, router]);

  const { tapGesture } = useDoubleTap({
    onDoubleTap: handleDoubleTap,
    onSingleTap: handleOpenPost,
    delay: 260,
  });

  // ── Button handlers ───────────────────────────────────────────────────
  const handleLike = async () => {
    const wasLiked = localLiked;
    setLocalLiked(!wasLiked);
    try {
      await toggleLike(post.id, wasLiked);
    } catch {
      setLocalLiked(wasLiked);
    }
  };

  const handleLikeLongPress = () => {
    router.push(`/post/likes?postId=${post.id}`);
  };

  const handleBookmark = async () => {
    try {
      if (localBookmarked) {
        await removeBookmark(post.id);
        setLocalBookmarked(false);
      } else {
        await toggleBookmark(post.id);
        setLocalBookmarked(true);
      }
    } catch (error) {
      console.error("[PostCard] Failed to toggle bookmark:", error);
    }
  };

  const handleRepost = async () => {
    // Prevent reposting own post
    if (isOwner) {
      Alert.alert(
        'Cannot Repost',
        "You can't repost your own post.",
        [{ text: 'OK' }]
      );
      return;
    }

    const wasReposted = localReposted;
    setLocalReposted(!wasReposted);
    setLocalRepostCount((prev) => (wasReposted ? prev - 1 : prev + 1));

    try {
      if (wasReposted) {
        const fresh = await undoRepost(post.id);
        setLocalRepostCount(fresh.repostCount ?? localRepostCount - 1);
      } else {
        const fresh = await repostPost(post.id);
        setLocalRepostCount(fresh.repostCount ?? localRepostCount + 1);
      }
    } catch (err) {
      // Revert optimistic update on error
      setLocalReposted(wasReposted);
      setLocalRepostCount((prev) => (wasReposted ? prev + 1 : prev - 1));
    }
  };

  const handleProfilePress = () => {
    router.push(`/profile/${post.userId}` as any);
  };

  const handleCommentPress = () => {
    router.push(`/post/${post.id}` as any);
  };

  const handleFollowToggle = async () => {
    const wasFollowing = localIsFollowing;
    setLocalIsFollowing(!wasFollowing);
    try {
      await toggleFollow(post.userId);
    } catch {
      setLocalIsFollowing(wasFollowing);
    }
  };

  const handleEllipsisPress = () => {
    setShowActionsSheet(true);
  };

  // ── Sheet callbacks ────────────────────────────────────────────────────
  const handleBlockUser = async () => {
    try {
      await blockUser(post.userId);
      Alert.alert('Blocked', `You have blocked @${post.user.displayName || post.user.username}.`);
    } catch {
      Alert.alert('Error', 'Could not block this user. Please try again.');
    }
  };

  const handleDeletePost = async () => {
    try {
      await deletePost(post.id);
    } catch {
      Alert.alert('Error', 'Could not delete this post. Please try again.');
    }
  };

  const handleReportSuccess = (_payload: { postId: string; reason: ReportReason }) => {
    Alert.alert('Report Submitted', 'Thank you for your report. Our team will review it shortly.');
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US');
  };

  const formatCount = (count: number): string => {
    if (!count && count !== 0) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // ── Micro-interaction animations ───────────────────────────────────────────
  const bookmarkScale = useSharedValue(1);
  const commentScale = useSharedValue(1);

  const handleBookmarkWithAnimation = async () => {
    bookmarkScale.value = withSequence(
      withSpring(1.3, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
    triggerHaptic('medium');
    await handleBookmark();
  };

  const handleCommentWithAnimation = () => {
    commentScale.value = withSequence(
      withSpring(0.85, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
    triggerHaptic('light');
    handleCommentPress();
  };

  const bookmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bookmarkScale.value }],
  }));

  const commentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: commentScale.value }],
  }));

  const displayName = post.user.displayName || post.user.username;

  // Swipe action handlers
  const handleSwipeDelete = () => {
    if (isOwner) {
      handleDeletePost();
    } else {
      setShowActionsSheet(true);
    }
  };

  return (
    <SwipeableRow
      rightAction={{
        icon: 'trash-2',
        color: '#FFFFFF',
        backgroundColor: AppColors.error,
        label: 'Delete',
        onPress: handleSwipeDelete,
      }}
      testID={`swipeable-post-${post.id}`}
    >
      <View style={styles.container}>
        {/* Post Header: avatar + username (left) | follow + ellipsis (right) */}
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.headerLeft} onPress={handleProfilePress} activeOpacity={0.7}>
            <Avatar user={post.user} size={36} />
            <Text style={styles.headerUsername} numberOfLines={1}>@{displayName}</Text>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {!isOwner && (
              <TouchableOpacity
                style={[styles.followBtn, localIsFollowing && styles.followBtnFollowing]}
                onPress={handleFollowToggle}
                activeOpacity={0.75}
              >
                <Text style={[styles.followBtnText, localIsFollowing && styles.followBtnTextFollowing]}>
                  {localIsFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.ellipsisBtn}
              onPress={handleEllipsisPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={AppColors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image + Actions wrapper — enables absolute positioning */}
        <View style={styles.imageContainer}>
          {/* Image Area — double tap likes, single tap opens post detail */}
          <GestureDetector gesture={tapGesture}>
            <View>
              {/* Instagram-style carousel: swipe, dots, carousel icon */}
              <View style={styles.carouselWrapper}>
                <ImageCarousel
                  images={images}
                  height={300}
                  onPress={handleOpenPost}
                />
              </View>

              {/* Heart overlay — positioned on the carousel */}
              <View style={styles.heartOverlay}>
                <AnimatedHeart scale={heartScale} opacity={heartOpacity} />
              </View>
            </View>
          </GestureDetector>

          {/* Action buttons — horizontal row below image */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleLike}
              onLongPress={handleLikeLongPress}
              delayLongPress={400}
              style={styles.actionGroup}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <AnimatedHeartIcon isLiked={localLiked} scale={likeIconScale} />
              <Text style={styles.actionText}>{formatCount(post.likes)} {post.likes === 1 ? 'Like' : 'Likes'}</Text>
            </TouchableOpacity>

            <Animated.View style={commentAnimatedStyle}>
              <TouchableOpacity
                onPress={handleCommentWithAnimation}
                style={styles.actionGroup}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="message-circle" size={ACTION_ICON} color={AppColors.iconMuted} strokeWidth={2} />
                <Text style={styles.actionText}>
                  {post.commentsCount ?? 0} {(post.commentsCount ?? 0) === 1 ? 'Comment' : 'Comments'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              onPress={handleRepost}
              style={styles.actionGroup}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather
                name="refresh-cw"
                size={ACTION_ICON}
                color={localReposted ? AppColors.primary : AppColors.iconMuted}
                strokeWidth={2}
              />
              <Text style={styles.actionText}>
                {formatCount(localRepostCount)} {localRepostCount === 1 ? 'Repost' : 'Reposts'}
              </Text>
            </TouchableOpacity>

            <Animated.View style={bookmarkAnimatedStyle}>
              <TouchableOpacity
                onPress={handleBookmarkWithAnimation}
                style={styles.bookmarkGroup}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather
                  name="bookmark"
                  size={ACTION_ICON}
                  color={localBookmarked ? AppColors.primary : AppColors.iconMuted}
                  fill={localBookmarked ? AppColors.primary : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        <View style={styles.captionContainer}>
          <MentionText
            text={post.caption}
            numberOfLines={5}
          />
        </View>

        {(post.commentsCount ?? 0) > 0 && (
          <TouchableOpacity onPress={handleCommentPress}>
            <Text style={styles.viewComments}>View all {post.commentsCount} comments</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>

        {/* ── Action Sheets ── */}
        <PostActionsSheet
          visible={showActionsSheet}
          postOwnerId={post.userId}
          currentUserId={currentUserId}
          postOwnerDisplayName={displayName}
          onReportPost={() => setShowReportSheet(true)}
          onBlockUser={handleBlockUser}
          onDeletePost={handleDeletePost}
          onClose={() => setShowActionsSheet(false)}
        />

        <ReportPostSheet
          visible={showReportSheet}
          postId={post.id}
          postOwnerDisplayName={displayName}
          onClose={() => setShowReportSheet(false)}
          onReportSuccess={handleReportSuccess}
        />
      </View>
    </SwipeableRow>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
    marginBottom: 14,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.035,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  // ── Post Header ──────────────────────────────────────────────────────
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerUsername: {
    ...Typography.bodySemibold,
    fontSize: 14,
    color: AppColors.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.primary,
  },
  followBtnFollowing: {
    backgroundColor: AppColors.surfaceElevated,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  followBtnTextFollowing: {
    color: AppColors.text,
  },
  ellipsisBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Image area ──────────────────────────────────────────────────────
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  carouselWrapper: {
    width: '100%',
    height: 332, // carousel height (300) + dots area (32)
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    gap: 20,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bookmarkGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 'auto',
  },
  actionText: {
    ...Typography.meta,
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.iconMuted,
  },
  captionContainer: {
    paddingHorizontal: layoutPadding,
    paddingTop: 14,
    paddingBottom: 8,
  },
  caption: {
    ...Typography.caption,
    color: AppColors.text,
  },
  captionUsername: {
    ...Typography.captionSemibold,
    color: AppColors.text,
  },
  viewComments: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 6,
    ...Typography.caption,
    color: AppColors.iconMuted,
  },
  timeAgo: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 14,
    ...Typography.meta,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: AppColors.iconMuted,
    textTransform: 'uppercase',
  },
});
