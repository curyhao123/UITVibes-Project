import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { Comment } from '../data/mockData';
import { Feather } from '@expo/vector-icons';
import { AppColors } from '../constants/theme';

interface CommentItemProps {
  comment: Comment;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment }) => {
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

  return (
    <View style={styles.container}>
      <Avatar user={comment.user} size="small" />
      <View style={styles.content}>
        <Text style={styles.commentText}>
          <Text style={styles.username}>{comment.user.username}</Text>
          {' '}{comment.text}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatTimeAgo(comment.createdAt)}</Text>
          <Text style={styles.likes}>{comment.likes} likes</Text>
          <TouchableOpacity>
            <Text style={styles.reply}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.likeButton}>
        <Feather name="heart" size={14} color={AppColors.textMuted} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  username: {
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginRight: 12,
  },
  likes: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginRight: 12,
  },
  reply: {
    fontSize: 12,
    color: AppColors.textMuted,
    fontWeight: '600',
  },
  likeButton: {
    padding: 4,
  },
});
