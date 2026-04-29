import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Platform } from 'react-native';
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
import { SPRING_GENTLE } from '../animations/spring';
import { useSharedValue, withSpring } from 'react-native-reanimated';

const ACTION_ICON = 24;
const ACTION_GAP = 14;

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

  const handleShare = () => {
    console.log('Share post:', post.id);
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
                <View style={styles.overlayUserText}>
                  <Text style={styles.overlayName} numberOfLines={1}>
                    {post.user.displayName || post.user.username}
                  </Text>
                  <Text style={styles.overlayHandle} numberOfLines={1}>
                    @{post.user.username}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </GestureDetector>

        {/* Action buttons — positioned on the right side of image */}
        <View style={styles.actionsRight}>
          {/* Heart — uses AnimatedHeartIcon for micro-bounce on tap */}
          <TouchableOpacity
            onPress={handleLike}
            style={styles.actionVertical}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <AnimatedHeartIcon isLiked={localLiked} scale={likeIconScale} />
            <Text style={styles.actionCount}>{formatCount(post.likes)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCommentPress}
            style={styles.actionVertical}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="message-circle" size={ACTION_ICON} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.actionCount}>{post.comments.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionVertical} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Feather name="send" size={ACTION_ICON} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.actionCount}>{post.shareCount ?? 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBookmark} style={styles.actionVertical} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Feather
              name="bookmark"
              size={ACTION_ICON}
              color={post.isBookmarked ? AppColors.primary : '#FFFFFF'}
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

      {post.comments.length > 0 && (
        <TouchableOpacity onPress={handleCommentPress}>
          <Text style={styles.viewComments}>View all {post.comments.length} comments</Text>
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
  overlayUserText: {
    flex: 1,
  },
  overlayName: {
    ...Typography.captionSemibold,
    fontSize: 14,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlayHandle: {
    ...Typography.meta,
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionsRight: {
    position: 'absolute',
    right: layoutPadding - 2,
    bottom: 18,
    alignItems: 'center',
    gap: ACTION_GAP,
  },
  actionVertical: {
    alignItems: 'center',
    minWidth: 36,
  },
  actionCount: {
    ...Typography.meta,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
