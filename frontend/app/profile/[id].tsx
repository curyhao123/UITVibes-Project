import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getUserById, getUserPosts, getUserStories, toggleFollow, type Story } from '../../services/api';
import { getCurrentUserId } from '../../services/session';
import { User, Post } from '../../data/mockData';
import { Avatar, PostGrid, StoryGrid } from '../../components';
import { AppColors, layoutPadding } from '../../constants/theme';
import defaultAvatar from '../../assets/images/default-avatar.png';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileTab, setProfileTab] = useState<'posts' | 'stories'>('posts');
  const router = useRouter();

  useEffect(() => {
    setProfileTab('posts');
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const [userData, userPosts, userStories] = await Promise.all([
        getUserById(id as string),
        getUserPosts(id as string),
        getUserStories(id as string),
      ]);
      setUser(userData || null);
      setPosts(userPosts);
      setStories(userStories);
    } catch (err) {
      console.error("[loadUserData] error:", err);
      // Try to at least load the user even if posts/stories fail
      try {
        const userData = await getUserById(id as string);
        setUser(userData || null);
      } catch {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) return;
    const result = await toggleFollow(user.id);
    setUser((prev) =>
      prev
        ? {
            ...prev,
            isFollowing: result,
            followers: result ? prev.followers + 1 : Math.max(0, prev.followers - 1),
          }
        : null
    );
  };

  const handleMessage = async () => {
    if (!user) return;
    // Navigate to message tab - in a real app, create/open a conversation
    router.push('/(tabs)/message' as any);
  };

  const formatCount = (count: number | undefined | null): string => {
    const n = Number(count) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>User not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: user.username,
          headerBackTitle: 'Back',
          headerTintColor: AppColors.primary,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.profileInfo}>
            <Avatar user={user} size="large" />
            <View style={styles.statsContainer}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push(`/followers/${user.id}` as any)}
              >
                <Text style={styles.statNumber}>{formatCount(user.posts)}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push(`/followers/${user.id}` as any)}
              >
                <Text style={styles.statNumber}>{formatCount(user.followers)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push(`/followers/${user.id}?tab=following` as any)}
              >
                <Text style={styles.statNumber}>{formatCount(user.following)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bioContainer}>
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.bio}>{user.bio}</Text>
            {user.website && (
              <Text style={styles.website}>{user.website}</Text>
            )}
          </View>

          <View style={styles.actionButtons}>
            {user.id !== getCurrentUserId() && (
              <>
                <TouchableOpacity
                  style={[styles.followButton, user.isFollowing && styles.followingButton]}
                  onPress={handleFollowToggle}
                >
                  <Text style={[styles.followButtonText, user.isFollowing && styles.followingButtonText]}>
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.storyStripScroll}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {stories.slice(0, 8).map((story) => (
                <TouchableOpacity
                  key={story.id}
                  style={styles.storyStripItem}
                  onPress={() => router.push(`/story/${story.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.storyCircle, !story.isViewed && styles.storyCircleActive]}>
                    <Image
                      source={story.previewUrl ? { uri: story.previewUrl } : defaultAvatar}
                      style={styles.storyCircleImg}
                    />
                  </View>
                  <Text style={styles.storyStripLabel} numberOfLines={1}>{story.displayName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, profileTab === 'posts' && styles.activeTab]}
              onPress={() => setProfileTab('posts')}
            >
              <Feather name="grid" size={24} color={profileTab === 'posts' ? AppColors.primary : AppColors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, profileTab === 'stories' && styles.activeTab]}
              onPress={() => setProfileTab('stories')}
            >
              <Feather name="layers" size={24} color={profileTab === 'stories' ? AppColors.primary : AppColors.textMuted} />
            </TouchableOpacity>
          </View>

          {profileTab === 'posts' ? (
            <PostGrid posts={posts} />
          ) : stories.length === 0 ? (
            <View style={styles.emptyStories}>
              <Feather name="layers" size={48} color={AppColors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyStoriesText}>No stories yet</Text>
            </View>
          ) : (
            <StoryGrid stories={stories} isCurrentUser={false} />
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  bioContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  displayName: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
    color: AppColors.text,
  },
  bio: {
    fontSize: 14,
    lineHeight: 18,
    color: AppColors.textSecondary,
  },
  website: {
    fontSize: 14,
    color: '#1a5fc9',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  followButton: {
    flex: 1,
    backgroundColor: AppColors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: AppColors.border,
  },
  followButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: AppColors.text,
  },
  messageButton: {
    flex: 1,
    backgroundColor: AppColors.border,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderTopWidth: 1,
    borderTopColor: AppColors.primary,
  },
  // Story strip
  storyStripScroll: {
    paddingVertical: 12,
  },
  storyStripItem: {
    alignItems: 'center',
    marginLeft: layoutPadding,
    marginRight: 8,
    width: 72,
  },
  storyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: AppColors.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  storyCircleActive: {
    borderColor: AppColors.primary,
  },
  storyCircleImg: {
    width: '100%',
    height: '100%',
  },
  storyStripLabel: {
    fontSize: 12,
    color: AppColors.text,
    textAlign: 'center',
  },
  // Empty stories
  emptyStories: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStoriesText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textMuted,
  },
});
