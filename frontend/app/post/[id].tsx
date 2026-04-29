/**
 * PostDetailScreen — full post with comments, enhanced with:
 * 1. Spring like animation on the heart button
 * 2. Smooth skeleton loader on initial load
 * 3. Real-time comment submission with reply support
 * 4. Hierarchical comment display with nested replies
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { getPostById } from '../../services/api';
import { Post, Comment } from '../../data/mockData';
import { Avatar, CommentItem } from '../../components';
import { useApp } from '../../context/AppContext';
import { AppColors } from '../../constants/theme';
import { SPRING_BOUNCE, SPRING_GENTLE } from '../../animations/spring';
import { SkeletonShimmer } from '../../components/SkeletonLoader';

// ─── Animated avatar component for current user in comment input ────────────
const CurrentUserAvatar = () => {
  const { currentUser } = useApp();
  return (
    <View style={styles.inputAvatarWrap}>
      {currentUser ? (
        <Avatar user={currentUser} size="tiny" />
      ) : (
        <View style={styles.inputAvatarFallback} />
      )}
    </View>
  );
};

// ─── Animated like button with spring bounce ──────────────────────────────────
const LikeButton = ({
  isLiked,
  onPress,
}: {
  isLiked: boolean;
  onPress: () => void;
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.8, SPRING_GENTLE);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1.0, SPRING_GENTLE);
  };
  const handlePress = () => {
    scale.value = withSpring(1.3, SPRING_BOUNCE, () => {
      scale.value = withSpring(1.0, SPRING_BOUNCE);
    });
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.actionButton}
    >
      <Animated.View style={animatedStyle}>
        <Feather
          name="heart"
          size={26}
          color={isLiked ? AppColors.primary : AppColors.textMuted}
          fill={isLiked ? AppColors.primary : 'transparent'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Skeleton for initial load ────────────────────────────────────────────────
const PostDetailSkeleton = () => (
  <SafeAreaView style={styles.container}>
    <Stack.Screen options={{ headerShown: false }} />
    {/* Header skeleton */}
    <View style={skelStyles.header}>
      <SkeletonShimmer width={36} height={36} borderRadius={18} />
      <SkeletonShimmer width={100} height={14} style={{ marginLeft: 10 }} />
    </View>
    {/* Image skeleton */}
    <SkeletonShimmer
      width="100%"
      height={320}
      borderRadius={0}
    />
    {/* Actions skeleton */}
    <View style={skelStyles.actionsRow}>
      <SkeletonShimmer width={28} height={28} borderRadius={14} />
      <SkeletonShimmer width={28} height={28} borderRadius={14} style={{ marginLeft: 16 }} />
      <SkeletonShimmer width={28} height={28} borderRadius={14} style={{ marginLeft: 16 }} />
    </View>
    {/* Likes skeleton */}
    <SkeletonShimmer width={80} height={14} style={{ margin: 12 }} />
    {/* Caption skeleton */}
    <View style={skelStyles.captionArea}>
      <SkeletonShimmer width="60%" height={13} />
      <SkeletonShimmer width="40%" height={13} style={{ marginTop: 6 }} />
    </View>
  </SafeAreaView>
);

// ─── Main screen ────────────────────────────────────────────────────────────
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const { toggleLike, addComment } = useApp();
  const router = useRouter();

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    setIsLoading(true);
    const data = await getPostById(id as string);
    setPost(data || null);
    setIsLoading(false);
  };

  const handleLike = async () => {
    if (post) {
      await toggleLike(post.id);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLiked: !prev.isLiked,
              likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
            }
          : null
      );
    }
  };

  const handleSendComment = async () => {
    if (!post || !commentText.trim() || isSubmitting) return;

    const text = commentText.trim();
    setIsSubmitting(true);

    setCommentText('');

    try {
      const newComment = await addComment(post.id, text, replyTo?.id);
      if (newComment) {
        setPost((prev) => {
          if (!prev) return prev;

          // Add reply under its parent comment
          if (replyTo) {
            return {
              ...prev,
              comments: prev.comments.map((c) => {
                if (c.id === replyTo.id) {
                  return {
                    ...c,
                    replies: [newComment, ...(c.replies || [])],
                  };
                }
                return c;
              }),
            };
          }

          // Add top-level comment
          return {
            ...prev,
            comments: [newComment, ...prev.comments],
          };
        });
        setReplyTo(null);
      }
    } catch (error) {
      setCommentText(text);
      console.error('[PostDetail] Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyTo(comment);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const formatLikes = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading || !post) {
    return <PostDetailSkeleton />;
  }

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={AppColors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.postHeader}>
        <Avatar user={post.user} size="small" showBorder />
        <Text style={styles.username}>@{post.user.displayName || post.user.username}</Text>
      </View>
      <Image source={{ uri: post.image }} style={styles.postImage} />
      <View style={styles.actions}>
        {/* Spring-bouncing like button */}
        <LikeButton isLiked={post.isLiked} onPress={handleLike} />
        <TouchableOpacity style={styles.actionButton}>
          <Feather name="message-circle" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Feather name="send" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Feather name="bookmark" size={24} color={AppColors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.likesContainer}>
        <Text style={styles.likes}>{formatLikes(post.likes)} likes</Text>
      </View>
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>@{post.user.displayName || post.user.username}</Text>
          {' '}{post.caption}
        </Text>
      </View>
      {post.comments.length > 0 && (
        <Text style={styles.commentsHeader}>
          All {post.comments.length} comments
        </Text>
      )}
    </>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={post.comments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              onReply={handleReply}
            />
          )}
        />
        <View style={styles.inputContainer}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <Feather name="corner-down-left" size={12} color={AppColors.textMuted} />
              <Text style={styles.replyBannerText}>
                Replying to <Text style={styles.replyBannerUsername}>@{replyTo.user.username}</Text>
              </Text>
              <TouchableOpacity onPress={handleCancelReply} style={styles.cancelReply}>
                <Feather name="x" size={14} color={AppColors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <CurrentUserAvatar />
            <TextInput
              style={styles.input}
              placeholder={replyTo ? `Reply to @${replyTo.user.username}...` : 'Add a comment...'}
              placeholderTextColor={AppColors.iconMuted}
              value={commentText}
              onChangeText={setCommentText}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!commentText.trim() || isSubmitting}
              style={styles.sendButtonWrap}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={AppColors.primary} />
              ) : (
                <Text
                  style={[
                    styles.sendButton,
                    (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
                  ]}
                >
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  backButton: {
    padding: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  username: {
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.text,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  likesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  likes: {
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.text,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
    color: AppColors.text,
  },
  captionUsername: {
    fontWeight: '600',
    marginRight: 6,
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
    backgroundColor: AppColors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
    gap: 5,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 12,
    color: AppColors.textMuted,
  },
  replyBannerUsername: {
    fontWeight: '600',
    color: AppColors.text,
  },
  cancelReply: {
    padding: 2,
  },
  inputAvatarWrap: {
    marginRight: 10,
  },
  inputAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.borderLight,
  },
  input: {
    flex: 1,
    height: 36,
    paddingVertical: 8,
    fontSize: 14,
    color: AppColors.text,
  },
  sendButtonWrap: {
    marginLeft: 8,
    paddingVertical: 4,
  },
  sendButton: {
    color: AppColors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  sendButtonDisabled: {
    color: AppColors.iconMuted,
  },
});

const skelStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  actionsRow: {
    flexDirection: 'row',
    padding: 12,
  },
  captionArea: {
    padding: 12,
  },
});
