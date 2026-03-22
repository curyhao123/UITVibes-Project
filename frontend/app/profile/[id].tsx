import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getUserById, getUserPosts, toggleFollow } from '../../services/api';
import { User, Post } from '../../data/mockData';
import { Avatar, PostGrid } from '../../components';
import { AppColors } from '../../constants/theme';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, [id]);

  const loadUserData = async () => {
    setIsLoading(true);
    const userData = await getUserById(id as string);
    const userPosts = await getUserPosts(id as string);
    setUser(userData || null);
    setPosts(userPosts);
    setIsLoading(false);
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

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
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
          </View>

          <View style={styles.tabsContainer}>
            <View style={[styles.tab, styles.activeTab]}>
              <Feather name="grid" size={24} color={AppColors.primary} />
            </View>
            <View style={styles.tab}>
              <Feather name="tag" size={24} color={AppColors.textMuted} />
            </View>
          </View>

          <PostGrid posts={posts} />
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
});
