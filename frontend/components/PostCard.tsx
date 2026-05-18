import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { GestureDetector } from 'react-native-gesture-handler';
import { Avatar } from './Avatar';
import { Post } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useRouter } from 'expo-router';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useDoubleTap } from '../animations/useDoubleTap';
import { useAnimatedHeart, AnimatedHeart, AnimatedHeartIcon } from './AnimatedHeart';
import { useSharedValue } from 'react-native-reanimated';
import { repostPost, undoRepost } from '../services/postService';

const ACTION_ICON = 24;

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { toggleLike, toggleBookmark } = useApp();
  const router = useRouter();

  // ── Heart animation state ──────────────────────────────────────────────
  const { scale: heartScale, opacity: heartOpacity, play: playHeart } = useAnimatedHeart();
  const likeIconScale = useSharedValue(1);
  const [localLiked, setLocalLiked] = React.useState(post.isLiked);
  const [localReposted, setLocalReposted] = React.useState(post.isReposted ?? false);
  const [localRepostCount, setLocalRepostCount] = React.useState(post.repostCount ?? 0);

  // ── Double-tap gesture on image — runs entirely on the UI thread ─────────────────
  const handleDoubleTap = useCallback(async () => {
    if (!localLiked) {
      setLocalLiked(true);
      await toggleLike(post.id);
    }
    playHeart();
  }, [localLiked, post.id, playHeart, toggleLike]);

  const handleImageSingleTap = useCallback(() => {
    router.push(`/post/${post.id}` as any);
  }, [post.id, router]);

  const { tapGesture } = useDoubleTap({
    onDoubleTap: handleDoubleTap,
    onSingleTap: handleImageSingleTap,
    delay: 260,
  });

  // ── Button handlers ────────────────────────────────────────────────────
  const handleLike = async () => {
    const newState = !localLiked;
    setLocalLiked(newState);
    await toggleLike(post.id);
    // Micro-bounce driven by the animated icon component
  };

  const handleBookmark = async () => {
    await toggleBookmark(post.id);
  };

  const handleRepost = async () => {
    const wasReposted = localReposted;
    // Optimistic update
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
      // Rollback on error
      setLocalReposted(wasReposted);
      setLocalRepostCount((prev) => (wasReposted ? prev + 1 : prev - 1));
      console.error('[PostCard] Repost error:', err);
    }
  };

  const handleProfilePress = () => {
    router.push(`/profile/${post.userId}` as any);
  };

  const handleCommentPress = () => {
    router.push(`/post/${post.id}` as any);
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
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <View style={styles.container}>
      {/* Image + Actions wrapper — enables absolute positioning */}
      <View style={styles.imageContainer}>
        {/* Image Area — single tap opens post, double tap likes */}
        <GestureDetector gesture={tapGesture}>
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: post.image }}
              style={styles.postImage}
              contentFit="cover"
            />
            {/* Large bouncing heart overlay — centered on image */}
            <AnimatedHeart scale={heartScale} opacity={heartOpacity} />

            <View style={styles.overlayBottomLeft}>
              <TouchableOpacity onPress={handleProfilePress} style={styles.overlayUser} activeOpacity={0.9}>
                <Avatar user={post.user} size="small" />
                <Text style={styles.overlayName} numberOfLines={1}>
                  @{post.user.displayName || post.user.username}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </GestureDetector>

        {/* Action buttons — horizontal row below image */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleLike}
            style={styles.actionGroup}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <AnimatedHeartIcon isLiked={localLiked} scale={likeIconScale} />
            <Text style={styles.actionText}>{formatCount(post.likes)} {post.likes === 1 ? 'Like' : 'Likes'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCommentPress}
            style={styles.actionGroup}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="message-circle" size={ACTION_ICON} color={AppColors.iconMuted} strokeWidth={2} />
            <Text style={styles.actionText}>
              {post.commentsCount ?? 0} {(post.commentsCount ?? 0) === 1 ? 'Comment' : 'Comments'}
            </Text>
          </TouchableOpacity>

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

          <TouchableOpacity
            onPress={handleBookmark}
            style={styles.bookmarkGroup}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather
              name="bookmark"
              size={ACTION_ICON}
              color={post.isBookmarked ? AppColors.primary : AppColors.iconMuted}
              fill={post.isBookmarked ? AppColors.primary : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.captionContainer}>
          <Text style={styles.caption}>
            <Text style={styles.captionUsername}>@{post.user.displayName || post.user.username}</Text>
            {' '}
            {post.caption}
          </Text>
      </View>

      {(post.commentsCount ?? 0) > 0 && (
        <TouchableOpacity onPress={handleCommentPress}>
          <Text style={styles.viewComments}>View all {post.commentsCount} comments</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
    </View>
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
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  overlayBottomLeft: {
    position: 'absolute',
    bottom: 14,
    left: layoutPadding,
    right: 56,
  },
  overlayUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayName: {
    ...Typography.captionSemibold,
    fontSize: 14,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
