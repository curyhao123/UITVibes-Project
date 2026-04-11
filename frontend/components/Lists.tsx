import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Post, User } from '../data/mockData';
import { AppColors } from '../constants/theme';
import defaultAvatar from '../assets/images/default-avatar.png';

export const PostGrid: React.FC<{
  posts: Post[];
  onDeletePost?: (postId: string) => Promise<void>;
  currentUserId?: string;
}> = ({ posts, onDeletePost, currentUserId }) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLongPress = (post: Post) => {
    if (!onDeletePost) return;
    setSelectedPost(post);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedPost || !onDeletePost) return;
    setIsDeleting(true);
    try {
      await onDeletePost(selectedPost.id);
      setDeleteModalVisible(false);
      setSelectedPost(null);
    } catch {
      Alert.alert('Error', 'Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const rows: Post[][] = [];
  for (let i = 0; i < posts.length; i += 3) {
    rows.push(posts.slice(i, i + 3));
  }

  return (
    <>
      <View>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.gridRow}>
            {row.map((post) => (
              <TouchableOpacity
                key={post.id}
                onLongPress={() => void handleLongPress(post)}
                delayLongPress={400}
                style={styles.gridItem}
              >
                <Image
                  source={post.image ? { uri: post.image } : defaultAvatar}
                  style={styles.gridImage}
                />
                <View style={styles.gridOverlay}>
                  <Feather name="heart" size={14} color="white" />
                  <Text style={styles.gridText}>{post.likes}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {/* Fill empty slots */}
            {Array.from({ length: 3 - row.length }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.gridItem} />
            ))}
          </View>
        ))}
      </View>

      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={deleteStyles.backdrop}>
          <View style={deleteStyles.card}>
            <Text style={deleteStyles.title}>Delete post?</Text>
            <Text style={deleteStyles.body}>
              This post will be permanently deleted. This action cannot be undone.
            </Text>
            <TouchableOpacity
              style={deleteStyles.deleteBtn}
              onPress={() => void handleDelete()}
              disabled={isDeleting}
            >
              <Text style={deleteStyles.deleteBtnText}>
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={deleteStyles.cancelBtn}
              onPress={() => setDeleteModalVisible(false)}
              disabled={isDeleting}
            >
              <Text style={deleteStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const deleteStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  deleteBtn: {
    width: '100%',
    backgroundColor: AppColors.error,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    width: '100%',
    backgroundColor: AppColors.border,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: AppColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});

export const UserListItem: React.FC<{ user: User; onPress?: () => void }> = ({ user, onPress }) => {
  return (
    <TouchableOpacity style={styles.userItem} onPress={onPress}>
      <Image source={user.avatar ? { uri: user.avatar } : defaultAvatar} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.displayName}>{user.displayName}</Text>
      </View>
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridRow: {
    flexDirection: 'row',
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    padding: 1,
    backgroundColor: AppColors.borderLight, // Debug: thấy được grid items
  },
  gridImage: {
    flex: 1,
    backgroundColor: AppColors.surface,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    opacity: 0,
  },
  gridText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: AppColors.surface,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.text,
  },
  displayName: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  followButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
