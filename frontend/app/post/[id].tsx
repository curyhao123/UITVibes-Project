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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getPostById } from '../../services/api';
import { Post } from '../../data/mockData';
import { Avatar, CommentItem } from '../../components';
import { useApp } from '../../context/AppContext';
import { AppColors } from '../../constants/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
      setPost((prev) => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
      } : null);
    }
  };

  const handleSendComment = async () => {
    if (post && commentText.trim()) {
      await addComment(post.id, commentText.trim());
      setCommentText('');
      await loadPost();
    }
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

  if (isLoading || !post) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading post...</Text>
      </SafeAreaView>
    );
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
        <Text style={styles.username}>{post.user.username}</Text>
      </View>
      <Image source={{ uri: post.image }} style={styles.postImage} />
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
          <Feather
            name="heart"
            size={24}
            color={post.isLiked ? AppColors.primary : AppColors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Feather name="message-circle" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Feather name="send" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Feather name="bookmark" size={24} color={AppColors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.likesContainer}>
        <Text style={styles.likes}>{formatLikes(post.likes)} likes</Text>
      </View>
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{post.user.username}</Text>
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
          renderItem={({ item }) => <CommentItem comment={item} />}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={AppColors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!commentText.trim()}
          >
            <Text
              style={[
                styles.sendButton,
                !commentText.trim() && styles.sendButtonDisabled,
              ]}
            >
              Post
            </Text>
          </TouchableOpacity>
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  backButton: {
    padding: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
    padding: 12,
  },
  actionButton: {
    marginRight: 16,
  },
  likesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  likes: {
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.text,
  },
  captionContainer: {
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
    paddingBottom: 12,
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: AppColors.text,
  },
  sendButton: {
    color: AppColors.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 12,
  },
  sendButtonDisabled: {
    color: AppColors.textMuted,
  },
});
