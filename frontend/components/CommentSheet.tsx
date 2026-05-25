/**
 * CommentSheet — Bottom sheet for reel comments.
 * Instagram-style comment section with reply support.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { AppColors } from '../constants/theme';
import { SPRING_SOFT, SPRING_PRESS, TIMING_FAST } from '../animations/spring';
import { Comment } from '../data/mockData';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  reelId: string;
  onPostComment: (text: string) => void;
  onLikeComment: (commentId: string) => void;
  onReply: (commentId: string) => void;
}

interface CommentItemProps {
  comment: Comment;
  onLike: () => void;
  onReply: () => void;
  isReply?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
  isReply = false,
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const likeScale = useSharedValue(1);

  const handleLike = () => {
    likeScale.value = withSpring(1.3, SPRING_PRESS, () => {
      likeScale.value = withSpring(1, SPRING_SOFT);
    });
    onLike();
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
      <TouchableOpacity onPress={onReply}>
        <Image source={{ uri: comment.user.avatar }} style={styles.commentAvatar} />
      </TouchableOpacity>

      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{comment.user.username}</Text>
          <Text style={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
        </View>

        <Text style={styles.commentText}>{comment.text}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity onPress={handleLike} style={styles.commentAction}>
            <Animated.View style={likeAnimatedStyle}>
              <Feather
                name="heart"
                size={14}
                color={comment.isLiked ? AppColors.primary : AppColors.textMuted}
                fill={comment.isLiked ? AppColors.primary : 'transparent'}
              />
            </Animated.View>
            {comment.likes > 0 && (
              <Text style={styles.commentLikeCount}>{comment.likes}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onReply} style={styles.commentAction}>
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>

          {comment.replies && comment.replies.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowReplies(!showReplies)}
              style={styles.commentAction}
            >
              <Text style={styles.viewRepliesText}>
                {showReplies ? 'Hide' : `View`} {comment.replies.length} replies
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showReplies && comment.replies && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onLike={() => {}}
                onReply={() => {}}
                isReply
              />
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
        <Animated.View style={likeAnimatedStyle}>
          <Feather
            name="heart"
            size={14}
            color={comment.isLiked ? AppColors.primary : AppColors.iconMuted}
            fill={comment.isLiked ? AppColors.primary : 'transparent'}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export const CommentSheet: React.FC<CommentSheetProps> = ({
  visible,
  onClose,
  comments,
  onPostComment,
  onLikeComment,
  onReply,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_SOFT);
      backdropOpacity.value = withTiming(1, TIMING_FAST);
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, SPRING_SOFT);
      backdropOpacity.value = withTiming(0, TIMING_FAST);
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handlePost = useCallback(() => {
    if (commentText.trim()) {
      onPostComment(commentText.trim());
      setCommentText('');
      setReplyingTo(null);
    }
  }, [commentText, onPostComment]);

  const handleClose = useCallback(() => {
    setReplyingTo(null);
    setCommentText('');
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={AppColors.text} />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                onLike={() => onLikeComment(item.id)}
                onReply={() => {
                  setReplyingTo(item);
                  onReply(item.id);
                }}
              />
            )}
            style={styles.commentsList}
            contentContainerStyle={styles.commentsListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Feather name="message-circle" size={48} color={AppColors.iconMuted} />
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>
                  Be the first to share your thoughts
                </Text>
              </View>
            }
          />

          {/* Input area */}
          <View style={styles.inputContainer}>
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>
                  Replying to @{replyingTo.user.username}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Feather name="x" size={16} color={AppColors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=33' }}
                style={styles.inputAvatar}
              />
              <TextInput
                style={styles.input}
                placeholder="Add a comment..."
                placeholderTextColor={AppColors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handlePost}
                disabled={!commentText.trim()}
                style={[
                  styles.postButton,
                  !commentText.trim() && styles.postButtonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.postButtonText,
                    !commentText.trim() && styles.postButtonTextDisabled,
                  ]}
                >
                  Post
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
  },
  commentsListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  replyItem: {
    marginBottom: 12,
    marginLeft: 0,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  commentText: {
    fontSize: 14,
    color: AppColors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  commentLikeCount: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginLeft: 4,
  },
  replyText: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  viewRepliesText: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: AppColors.borderLight,
  },
  likeButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textMuted,
    marginTop: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 13,
    color: AppColors.textMuted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: AppColors.text,
    maxHeight: 100,
    paddingVertical: 8,
  },
  postButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  postButtonDisabled: {
    opacity: 0.4,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  postButtonTextDisabled: {
    color: AppColors.primary,
  },
});
