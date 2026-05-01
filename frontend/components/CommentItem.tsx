import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { Comment } from '../data/mockData';
import { Feather } from '@expo/vector-icons';
import { AppColors } from '../constants/theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SPRING_BOUNCE, SPRING_GENTLE } from '../animations/spring';

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  onReply?: (comment: Comment) => void;
  onLike?: (commentId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isReply = false,
  onReply,
  onLike,
}) => {
  const [isLiked, setIsLiked] = useState(comment.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(comment.likes);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const scale = useSharedValue(1);

  const handleLikePressIn = () => {
    scale.value = withSpring(0.8, SPRING_GENTLE);
  };
  const handleLikePressOut = () => {
    scale.value = withSpring(1.0, SPRING_GENTLE);
  };
  const handleLikePress = () => {
    scale.value = withSpring(1.3, SPRING_BOUNCE, () => {
      scale.value = withSpring(1.0, SPRING_BOUNCE);
    });
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
    onLike?.(comment.id);
  };

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      {/* Left accent bar for replies */}
      {isReply && <View style={styles.replyBar} />}

      <Avatar user={comment.user} size="small" />

      <View style={styles.body}>
        {/* @displayName */}
        <Text style={styles.name} numberOfLines={1}>
          @{(comment.user.displayName || comment.user.username)}
        </Text>

        {/* Comment text */}
        <Text style={styles.text} numberOfLines={undefined}>
          {comment.text}
        </Text>

        {/* Meta row: time · likes · reply */}
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTimeAgo(comment.createdAt)}</Text>

          {likeCount > 0 && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{likeCount} likes</Text>
            </>
          )}

          {onReply && (
            <>
              <Text style={styles.dot}>·</Text>
              <TouchableOpacity onPress={() => onReply(comment)}>
                <Text style={styles.reply}>Reply</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.replies}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply
                onReply={onReply}
                onLike={onLike}
              />
            ))}
          </View>
        )}
      </View>

      {/* Like button */}
      <TouchableOpacity
        style={styles.likeButton}
        onPress={handleLikePress}
        onPressIn={handleLikePressIn}
        onPressOut={handleLikePressOut}
        activeOpacity={1}
      >
        <Animated.View style={heartAnimatedStyle}>
          <Feather
            name="heart"
            size={14}
            color={isLiked ? AppColors.primary : AppColors.textMuted}
            fill={isLiked ? AppColors.primary : 'transparent'}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  replyContainer: {
    paddingLeft: 8,
  },
  replyBar: {
    width: 2,
    backgroundColor: AppColors.border,
    marginRight: 10,
    borderRadius: 1,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontWeight: '600',
    fontSize: 13,
    color: AppColors.text,
    marginBottom: 2,
    flexShrink: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 19,
    color: AppColors.text,
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  dot: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginHorizontal: 5,
  },
  metaText: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  reply: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.textMuted,
    textTransform: 'lowercase',
  },
  replies: {
    marginTop: 4,
  },
  likeButton: {
    padding: 6,
    marginLeft: 4,
    alignSelf: 'flex-start',
  },
});
