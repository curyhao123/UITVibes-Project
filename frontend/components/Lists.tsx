import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Post, User } from "../data/mockData";
import { AppColors } from "../constants/theme";
import defaultAvatar from "../assets/images/default-avatar.png";
import { useRouter } from "expo-router";
import { ConfirmationModal } from "./ConfirmationModal";

export const PostGrid: React.FC<{
  posts: Post[];
  onDeletePost?: (postId: string) => Promise<void>;
  currentUserId?: string;
}> = ({ posts, onDeletePost, currentUserId }) => {
  const router = useRouter();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePostPress = (post: Post) => {
    // Navigate to post detail page
    router.push(`/post/${post.id}` as any);
  };

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
      Alert.alert("Error", "Failed to delete post. Please try again.");
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
                onPress={() => handlePostPress(post)}
                onLongPress={() => void handleLongPress(post)}
                delayLongPress={400}
                activeOpacity={0.7}
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
                {(post.images?.length ?? 0) > 1 && (
                  <View style={styles.multiImageIndicator}>
                    <Feather name="layers" size={10} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.multiImageText}>{post.images!.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {/* Fill empty slots */}
            {Array.from({ length: 3 - row.length }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.gridItem} />
            ))}
          </View>
        ))}
      </View>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete post?"
        message="This post will be permanently deleted. This action cannot be undone."
        icon="trash-2"
        variant="danger"
        confirmLabel="Delete"
        busy={isDeleting}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
};

export const UserListItem: React.FC<{ user: User; onPress?: () => void }> = ({
  user,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.userItem} onPress={onPress}>
      <Image
        source={user.avatar ? { uri: user.avatar } : defaultAvatar}
        style={styles.avatar}
      />
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
    flexDirection: "row",
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    opacity: 0,
  },
  gridText: {
    color: "white",
    marginLeft: 4,
    fontWeight: "600",
    fontSize: 12,
  },
  multiImageIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  multiImageText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
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
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});

