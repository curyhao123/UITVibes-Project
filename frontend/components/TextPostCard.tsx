import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useDoubleTap } from '../animations/useDoubleTap';
import { borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Post } from '../data/mockData';
import { triggerHaptic } from '../hooks/useMicroInteractions';
import { type ReportReason } from '../services/backendTypes';
import { blockUser } from '../services/blockService';
import { removeBookmark, repostPost, undoRepost } from '../services/postService';
import { AnimatedHeart, AnimatedHeartIcon, useAnimatedHeart } from './AnimatedHeart';
import { Avatar } from './Avatar';
import { MentionText } from './MentionText';
import { PostActionsSheet } from './PostActionsSheet';
import { ReportPostSheet } from './ReportPostSheet';
import { SwipeableRow } from './SwipeableRow';

const ACTION_ICON = 24;

interface TextPostCardProps {
  post: Post;
}

export const TextPostCard: React.FC<TextPostCardProps> = ({ post }) => {
  const { toggleLike, toggleBookmark, currentUser, toggleFollow, deletePost } = useApp();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);

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

  // ── Double-tap to like / Single-tap to open post detail ───────────────
  const handleDoubleTap = useCallback(async () => {
    if (!localLiked) {
      setLocalLiked(true);
      await toggleLike(post.id);
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
      await toggleLike(post.id);
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
      console.error('[TextPostCard] Failed to toggle bookmark:', error);
    }
  };

  const handleRepost = async () => {
    if (isOwner) {
      Alert.alert('Cannot Repost', "You can't repost your own post.", [{ text: 'OK' }]);
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
    } catch {
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
        backgroundColor: colors.error,
        label: 'Delete',
        onPress: handleSwipeDelete,
      }}
      testID={`swipeable-text-post-${post.id}`}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: isDark ? 1 : 0,
            shadowColor: isDark ? '#000000' : '#2D3748',
          },
        ]}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.headerLeft} onPress={handleProfilePress} activeOpacity={0.7}>
            <Avatar user={post.user} size="medium" />
            <Text style={[styles.headerUsername, { color: colors.text }]} numberOfLines={1}>
              @{displayName}
            </Text>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            {!isOwner && (
              <TouchableOpacity
                style={[
                  styles.followBtn,
                  { backgroundColor: colors.primary },
                  localIsFollowing && {
                    backgroundColor: colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleFollowToggle}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.followBtnText,
                    localIsFollowing && { color: colors.text },
                  ]}
                >
                  {localIsFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.ellipsisBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={handleEllipsisPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Text Content Area */}
        <GestureDetector gesture={tapGesture}>
          <View style={styles.bodyContainer}>
            <View style={styles.captionContainer}>
              <MentionText
                text={post.caption}
                numberOfLines={10}
                style={[styles.captionText, { color: colors.text }]}
              />
            </View>

            <View style={styles.heartOverlay} pointerEvents="none">
              <AnimatedHeart scale={heartScale} opacity={heartOpacity} />
            </View>
          </View>
        </GestureDetector>

        {/* Action buttons */}
        <View style={[styles.actionsRow, { borderTopColor: colors.borderLight }]}>
          <TouchableOpacity
            onPress={handleLike}
            onLongPress={handleLikeLongPress}
            delayLongPress={400}
            style={styles.actionGroup}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <AnimatedHeartIcon isLiked={localLiked} scale={likeIconScale} />
            <Text style={[styles.actionText, { color: colors.iconMuted }]}>
              {formatCount(post.likes)} {post.likes === 1 ? 'Like' : 'Likes'}
            </Text>
          </TouchableOpacity>

          <Animated.View style={commentAnimatedStyle}>
            <TouchableOpacity
              onPress={handleCommentWithAnimation}
              style={styles.actionGroup}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Feather name="message-circle" size={ACTION_ICON} color={colors.iconMuted} strokeWidth={2} />
              <Text style={[styles.actionText, { color: colors.iconMuted }]}>
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
              color={localReposted ? colors.primary : colors.iconMuted}
              strokeWidth={2}
            />
            <Text style={[styles.actionText, { color: colors.iconMuted }]}>
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
                color={localBookmarked ? colors.primary : colors.iconMuted}
                fill={localBookmarked ? colors.primary : 'transparent'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {(post.commentsCount ?? 0) > 0 && (
          <TouchableOpacity onPress={handleCommentPress}>
            <Text style={[styles.viewComments, { color: colors.iconMuted }]}>
              View all {post.commentsCount} comments
            </Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.timeAgo, { color: colors.iconMuted }]}>{formatTimeAgo(post.createdAt)}</Text>

        {/* Action Sheets */}
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
    marginBottom: 14,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.035,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
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
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ellipsisBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyContainer: {
    position: 'relative',
    minHeight: 80,
    justifyContent: 'center',
  },
  captionContainer: {
    paddingHorizontal: layoutPadding,
    paddingTop: 8,
    paddingBottom: 14,
  },
  captionText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  },
  viewComments: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 6,
    ...Typography.caption,
  },
  timeAgo: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 14,
    ...Typography.meta,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
