import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Post } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useRouter } from 'expo-router';
import { AppColors, borderRadius } from '../constants/theme';

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { toggleLike } = useApp();
  const router = useRouter();

  const handleLike = async () => {
    await toggleLike(post.id);
  };

  const handleProfilePress = () => {
    router.push(`/profile/${post.userId}` as any);
  };

  const handleCommentPress = () => {
    router.push(`/post/${post.id}` as any);
  };

  const formatLikes = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
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

  const shareCount = 0; // placeholder – add to Post type if needed

  return (
    <View style={styles.container}>
      <Pressable onPress={handleCommentPress} style={styles.imageWrap}>
        <Image
          source={{ uri: post.image }}
          style={[styles.postImage, { borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg }]}
          contentFit="cover"
        />
        {/* Overlay bottom-left: avatar + name + handle */}
        <View style={styles.overlayBottomLeft}>
          <TouchableOpacity onPress={handleProfilePress} style={styles.overlayUser} activeOpacity={0.9}>
            <Avatar user={post.user} size="small" />
            <View style={styles.overlayUserText}>
              <Text style={styles.overlayName} numberOfLines={1}>{post.user.displayName || post.user.username}</Text>
              <Text style={styles.overlayHandle} numberOfLines={1}>@{post.user.username}</Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* Right side: vertical action icons + counts */}
        <View style={styles.actionsRight}>
          <TouchableOpacity onPress={handleLike} style={styles.actionVertical}>
            <Feather
              name="heart"
              size={26}
              color={post.isLiked ? AppColors.primary : 'white'}
              fill={post.isLiked ? AppColors.primary : 'transparent'}
            />
            <Text style={styles.actionCount}>{formatLikes(post.likes)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionVertical}>
            <Feather name="send" size={24} color="white" />
            <Text style={styles.actionCount}>{shareCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCommentPress} style={styles.actionVertical}>
            <Feather name="message-circle" size={24} color="white" />
            <Text style={styles.actionCount}>{post.comments.length}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Caption below image */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{post.user.username}</Text>
          {' '}{post.caption}
        </Text>
      </View>

      {post.comments.length > 0 && (
        <TouchableOpacity onPress={handleCommentPress}>
          <Text style={styles.viewComments}>
            View all {post.comments.length} comments
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
    marginBottom: 10,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: 12,
    marginTop: 4,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
  },
  overlayBottomLeft: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 56,
  },
  overlayUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayUserText: {
    marginLeft: 10,
    flex: 1,
  },
  overlayName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  overlayHandle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionsRight: {
    position: 'absolute',
    right: 10,
    bottom: 16,
    alignItems: 'center',
    gap: 16,
  },
  actionVertical: {
    alignItems: 'center',
  },
  actionCount: {
    fontSize: 11,
    color: 'white',
    marginTop: 2,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.text,
  },
  captionUsername: {
    fontWeight: '600',
    marginRight: 4,
  },
  viewComments: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  timeAgo: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    color: AppColors.textMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
});
