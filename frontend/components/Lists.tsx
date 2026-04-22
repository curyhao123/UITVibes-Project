import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Post, User } from '../data/mockData';
import { AppColors } from '../constants/theme';
import defaultAvatar from '../assets/images/default-avatar.png';
import { Story } from '../services/storyService';
import { useRouter } from 'expo-router';

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

// ============================================================
// STORY GRID — Instagram-style on profile page
// ============================================================

/** Một cell trong story grid — hiển thị 1 thumbnail (ảnh đầu tiên hoặc video thumbnail) */
const StoryGridCell: React.FC<{
  story: Story;
  isFirstItem?: boolean;
}> = ({ story, isFirstItem }) => {
  const router = useRouter();
  const preview = story.previewUrl;

  const handlePress = () => {
    router.push(`/story/${story.id}` as any);
  };

  // Nếu chưa xem → viền gradient/xanh primary; đã xem → viền gray
  const borderColor = isFirstItem
    ? AppColors.primary
    : story.isViewed
    ? AppColors.border
    : AppColors.primary;

  return (
    <TouchableOpacity
      style={[storyGridStyles.cell, { borderColor }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {preview ? (
        <Image
          source={{ uri: preview }}
          style={storyGridStyles.thumbnail}
          contentFit="cover"
        />
      ) : (
        <View style={[storyGridStyles.thumbnail, storyGridStyles.placeholder]} />
      )}
      {/* Overlay hiển thị tổng số items nếu > 1 */}
      {story.totalItems > 1 && (
        <View style={storyGridStyles.countBadge}>
          <Text style={storyGridStyles.countText}>{story.totalItems}</Text>
        </View>
      )}
      {/* Icon video nếu item đầu là video */}
      {isFirstItem && story.totalItems > 0 && (
        <View style={storyGridStyles.videoIcon}>
          <Feather name="play-circle" size={16} color="#fff" strokeWidth={2} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const StoryGrid: React.FC<{
  /** Story groups của user — mỗi group = 1 cell trong grid */
  stories: Story[];
  /** User hiện tại đang xem profile — dùng để hiển thị nút "Add Story" nếu là chính mình */
  isCurrentUser?: boolean;
  /** Callback khi bấm nút Add Story (navigate tới story/create) */
  onAddStory?: () => void;
}> = ({ stories, isCurrentUser = false, onAddStory }) => {
  // Chia stories thành rows, mỗi row 3 items
  const rows: Story[][] = [];
  for (let i = 0; i < stories.length; i += 3) {
    rows.push(stories.slice(i, i + 3));
  }

  if (stories.length === 0 && !isCurrentUser) {
    return null;
  }

  return (
    <View style={storyGridStyles.container}>
      {/* Row 1: "Add Story" + 2 story groups đầu tiên */}
      <View style={storyGridStyles.row}>
        {/* Nút Add Story */}
        {isCurrentUser && (
          <TouchableOpacity
            style={[storyGridStyles.cell, storyGridStyles.addCell]}
            onPress={onAddStory}
            activeOpacity={0.7}
          >
            <View style={storyGridStyles.addCircle}>
              <Feather name="plus" size={24} color={AppColors.primary} strokeWidth={2.5} />
            </View>
            <Text style={storyGridStyles.addLabel}>Add</Text>
          </TouchableOpacity>
        )}
        {/* Story groups */}
        {stories.slice(0, isCurrentUser ? 2 : 3).map((story) => (
          <StoryGridCell key={story.id} story={story} />
        ))}
      </View>

      {/* Các rows còn lại (mỗi row 3 items) */}
      {rows.slice(1).map((row, rowIndex) => (
        <View key={`story-row-${rowIndex + 1}`} style={storyGridStyles.row}>
          {row.map((story) => (
            <StoryGridCell key={story.id} story={story} />
          ))}
          {/* Fill empty slots */}
          {Array.from({ length: 3 - row.length }).map((_, idx) => (
            <View key={`story-empty-${rowIndex + 1}-${idx}`} style={storyGridStyles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
};

const storyGridStyles = StyleSheet.create({
  container: {
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
  flexWrap: 'wrap',
  // alignItems: 'stretch' giữ aspect ratio = 1:1 cell
  },
  cell: {
    width: `${100 / 3}%`,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    overflow: 'hidden',
    backgroundColor: AppColors.surface,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: AppColors.borderLight,
  },
  countBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  videoIcon: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  // Add Story cell
  addCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  addCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addLabel: {
    fontSize: 12,
    color: AppColors.text,
    fontWeight: '500',
  },
});
