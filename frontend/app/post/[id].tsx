/**
 * PostDetailScreen — full post with comments, enhanced with:
 * 1. Spring like animation on the heart button
 * 2. Smooth skeleton loader on initial load
 * 3. Real-time comment submission with reply support
 * 4. Hierarchical comment display with nested replies
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { getPostById, toggleCommentLike, repostPost, undoRepost, toggleBookmark, removeBookmark } from "../../services/postService";
import { Post, Comment } from "../../data/mockData";
import { Avatar, CommentItem, ImageCarousel } from "../../components";
import { CommentContextMenu, DeleteConfirmModal } from "../../components";
import { useApp } from "../../context/AppContext";
import { AppColors, layoutPadding } from "../../constants/theme";
import { SkeletonShimmer } from "../../components/SkeletonLoader";
import { updateComment, deleteComment } from "../../services/postService";
import { CommentInput } from "../../components/CommentInput";
import { CompactHeader } from "../../components/StaticPremiumHeader";

// ─── Skeleton for initial load ────────────────────────────────────────────────
const PostDetailSkeleton = () => (
  <SafeAreaView style={styles.container}>
    <Stack.Screen options={{ headerShown: false }} />
    {/* Header skeleton */}
    <View style={skelStyles.header}>
      <SkeletonShimmer width={36} height={36} borderRadius={10} />
      <SkeletonShimmer width={100} height={14} style={{ marginLeft: 10 }} />
      <View style={{ flex: 1 }} />
      <SkeletonShimmer width={36} height={36} borderRadius={10} />
    </View>
    {/* Image skeleton */}
    <SkeletonShimmer width="100%" height={320} borderRadius={0} />
    {/* Actions skeleton */}
    <View style={skelStyles.actionsRow}>
      <SkeletonShimmer width={28} height={28} borderRadius={14} />
      <SkeletonShimmer
        width={28}
        height={28}
        borderRadius={14}
        style={{ marginLeft: 16 }}
      />
      <SkeletonShimmer
        width={28}
        height={28}
        borderRadius={14}
        style={{ marginLeft: 16 }}
      />
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toggleLike, addComment, currentUser, toggleFollow } = useApp();
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [localReposted, setLocalReposted] = useState(false);
  const [localRepostCount, setLocalRepostCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    setIsLoading(true);
    const data = await getPostById(id as string);
    if (data) {
      setPost(data);
      setIsFollowingAuthor(!!data.user.isFollowing);
      setLocalReposted(data.isReposted ?? false);
      setLocalRepostCount(data.repostCount ?? 0);
      setIsBookmarked(data.isBookmarked ?? false);
    }
    setIsLoading(false);
  };

  const handleLike = async () => {
    if (post) {
      const wasLiked = post.isLiked;
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLiked: !wasLiked,
              likes: wasLiked ? prev.likes - 1 : prev.likes + 1,
            }
          : null,
      );
      try {
        const newLikedState = await toggleLike(post.id, wasLiked);
        setPost((prev) =>
          prev ? { ...prev, isLiked: newLikedState } : null,
        );
      } catch {
        // Revert on error
        setPost((prev) =>
          prev
            ? { ...prev, isLiked: wasLiked }
            : null,
        );
      }
    }
  };

  const handleFollowToggle = async () => {
    if (!post) return;
    setIsFollowingAuthor((prev) => !prev);
    await toggleFollow(post.user.id);
  };

  const handleRepost = async () => {
    if (!post) return;
    const wasReposted = localReposted;
    setLocalReposted(!wasReposted);
    setLocalRepostCount((prev) => (wasReposted ? prev - 1 : prev + 1));

    try {
      if (wasReposted) {
        const fresh = await undoRepost(post.id);
        setLocalReposted(fresh.isReposted ?? false);
        setLocalRepostCount(fresh.repostCount ?? localRepostCount - 1);
      } else {
        const fresh = await repostPost(post.id);
        setLocalReposted(fresh.isReposted ?? true);
        setLocalRepostCount(fresh.repostCount ?? localRepostCount + 1);
      }
    } catch (err) {
      setLocalReposted(wasReposted);
      setLocalRepostCount((prev) => (wasReposted ? prev + 1 : prev - 1));
      console.error('[PostDetail] Repost error:', err);
    }
  };

  // Recursively finds the comment with matching parentId at any nesting level
  // and inserts the new reply into its replies array.
  const insertReply = (
    comments: Comment[],
    parentId: string,
    newReply: Comment,
  ): Comment[] => {
    return comments.map((c) => {
      if (c.id === parentId) {
        return { ...c, replies: [newReply, ...(c.replies || [])] };
      }
      if (c.replies && c.replies.length > 0) {
        return { ...c, replies: insertReply(c.replies, parentId, newReply) };
      }
      return c;
    });
  };

  // Recursively removes the comment at any nesting level
  const removeComment = (
    comments: Comment[],
    commentId: string,
  ): Comment[] => {
    return comments
      .filter((c) => c.id !== commentId)
      .map((c) => {
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: removeComment(c.replies, commentId) };
        }
        return c;
      });
  };

  const handleSendComment = async (text: string) => {
    if (!post || !text.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const newComment = await addComment(post.id, text, replyTo?.id);
      if (newComment) {
        setPost((prev) => {
          if (!prev) return prev;

          // Add reply at any nesting level via recursive insert
          if (replyTo) {
            return {
              ...prev,
              comments: insertReply(prev.comments, replyTo.id, newComment),
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
      console.error("[PostDetail] Failed to submit comment:", error);
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

  const handleCommentLike = async (commentId: string) => {
    try {
      await toggleCommentLike(commentId);
    } catch (err) {
      console.error("[PostDetail] Failed to toggle comment like:", err);
    }
  };

  const handleEditComment = (commentId: string) => {
    const findComment = (comments: Comment[]): Comment | null => {
      for (const c of comments) {
        if (c.id === commentId) return c;
        if (c.replies?.length) {
          const found = findComment(c.replies);
          if (found) return found;
        }
      }
      return null;
    };
    const comment = findComment(post.comments);
    if (comment) {
      setEditingComment(comment);
      setReplyTo(null);
    }
  };

  const handleSubmitEdit = async (text: string) => {
    if (!post || !editingComment || isSubmitting) return;
    const savedText = editingComment.text;
    setIsSubmitting(true);

    const replaceComment = (comments: Comment[]): Comment[] =>
      comments.map((c) => {
        if (c.id === editingComment.id) return { ...c, text };
        if (c.replies?.length) return { ...c, replies: replaceComment(c.replies) };
        return c;
      });

    setPost((prev) =>
      prev ? { ...prev, comments: replaceComment(prev.comments) } : prev,
    );
    setEditingComment(null);

    try {
      await updateComment(editingComment.id, text);
    } catch (err) {
      setPost((prev) =>
        prev ? { ...prev, comments: replaceComment(prev.comments) } : prev,
      );
      console.error('[PostDetail] Failed to update comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
  };

  const handleDeleteComment = (commentId: string) => {
    setDeleteTarget(commentId);
  };

  const handleConfirmDelete = async () => {
    if (!post || !deleteTarget) return;
    const target = deleteTarget;
    const prevComments = post.comments;
    setDeleteTarget(null);

    setPost((prev) =>
      prev ? { ...prev, comments: removeComment(prev.comments, target) } : prev,
    );

    try {
      await deleteComment(target);
    } catch (err) {
      setPost((prev) =>
        prev ? { ...prev, comments: prevComments } : prev,
      );
      console.error('[PostDetail] Failed to delete comment:', err);
    }
  };

  const formatLikes = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 604800)}w ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const handleBookmarkToggle = async () => {
    try {
      if (isBookmarked) {
        await removeBookmark(post.id);
        setIsBookmarked(false);
      } else {
        await toggleBookmark(post.id);
        setIsBookmarked(true);
      }
    } catch (error) {
      console.error("[PostDetail] Failed to toggle bookmark:", error);
    }
  };

  if (isLoading || !post) {
    return <PostDetailSkeleton />;
  }

  const renderHeader = () => (
    <>
      <CompactHeader title="Post" showBack onBack={() => router.back()} />

      {/* Post Header: User Info */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => router.push(`/profile/${post.user.id}` as any)}
          style={styles.userInfoRow}
        >
          <Avatar user={post.user} size="small" showBorder />
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {post.user.fullName || post.user.displayName}
            </Text>
            <Text style={styles.userHandle}>@{post.user.username}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.followBtn, isFollowingAuthor && styles.followBtnFollowing]}
          onPress={handleFollowToggle}
        >
          <Text style={[styles.followBtnText, isFollowingAuthor && styles.followBtnTextFollowing]}>
            {isFollowingAuthor ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Post Image(s) — Instagram-style carousel for multi-image */}
      {(() => {
        const images = post.images && post.images.length > 0
          ? post.images
          : post.image ? [post.image] : [];
        if (images.length === 0) return null;
        return (
          <ImageCarousel
            images={images}
            height={styles.postImage.aspectRatio ? 400 : 400}
            showDots={images.length > 1}
            showCarouselIcon={images.length > 1}
          />
        );
      })()}

      {/* Engagement Actions — single horizontal row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={handleLike} style={styles.actionGroup} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Feather
            name="heart"
            size={24}
            color={post.isLiked ? AppColors.primary : AppColors.iconMuted}
            fill={post.isLiked ? AppColors.primary : 'transparent'}
            strokeWidth={2}
          />
          <Text style={styles.actionText}>{formatLikes(post.likes)} {post.likes === 1 ? 'Like' : 'Likes'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionGroup} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Feather name="message-circle" size={24} color={AppColors.iconMuted} strokeWidth={2} />
          <Text style={styles.actionText}>
            {post.comments?.length || post.commentsCount || 0} {(post.comments?.length || post.commentsCount || 0) === 1 ? 'Comment' : 'Comments'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionGroup}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={handleRepost}
        >
          <Feather
            name="refresh-cw"
            size={24}
            color={localReposted ? AppColors.primary : AppColors.iconMuted}
            strokeWidth={2}
          />
          <Text style={styles.actionText}>
            {localRepostCount} {localRepostCount === 1 ? 'Repost' : 'Reposts'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookmarkGroup} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} onPress={handleBookmarkToggle}>
          <Feather name="bookmark" size={24} color={isBookmarked ? AppColors.primary : AppColors.iconMuted} fill={isBookmarked ? AppColors.primary : 'transparent'} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>
            {post.user.fullName || post.user.displayName}
          </Text>{" "}
          {post.caption}
        </Text>
        <Text style={styles.timestamp}>{formatDate(post.createdAt)}</Text>
      </View>

      {/* Comments Header */}
      {post.comments.length > 0 && (
        <Text style={styles.commentsHeader}>
          Comments ({post.comments.length})
        </Text>
      )}
    </>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.kavContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <FlatList
          data={post.comments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              onReply={handleReply}
              onLike={handleCommentLike}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              currentUserId={currentUser?.id}
            />
          )}
        />
        <CommentInput
          editingComment={editingComment}
          replyTo={replyTo}
          onSubmit={(text) => {
            if (editingComment) {
              handleSubmitEdit(text);
            } else {
              handleSendComment(text);
            }
          }}
          onCancelEdit={handleCancelEdit}
          onCancelReply={handleCancelReply}
          isSubmitting={isSubmitting}
        />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <DeleteConfirmModal
        visible={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  kavContainer: {
    flex: 1,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  username: {
    fontWeight: "600",
    fontSize: 14,
    color: AppColors.text,
  },
  userHandle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followBtnFollowing: {
    backgroundColor: AppColors.border,
  },
  followBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  followBtnTextFollowing: {
    color: AppColors.text,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
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
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.iconMuted,
  },
  captionContainer: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.text,
    marginBottom: 6,
  },
  captionUsername: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  commentsHeader: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    color: AppColors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
});

const skelStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  actionsRow: {
    flexDirection: "row",
    padding: 12,
  },
  captionArea: {
    padding: 12,
  },
});
