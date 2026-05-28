import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { Avatar, PostGrid, EmptyPostsState, EditProfileModal } from '../../components';
import { StaticPremiumHeader } from '../../components/StaticPremiumHeader';
import { HighlightBar } from '../../components/highlight';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { getUserReposts } from '../../services/postService';
import { HighlightGroup, getUserHighlights } from '../../services/highlightService';
import { Post } from '../../data/mockData';

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, myPosts, refreshMyPosts, isNewUser, deletePost } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);

  // Loading state cho posts
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Profile tab state (posts | reposts)
  const [profileTab, setProfileTab] = useState<'posts' | 'reposts'>('posts');

  // Reposts state
  const [reposts, setReposts] = useState<Post[]>([]);
  const [isLoadingReposts, setIsLoadingReposts] = useState(false);

  // Highlights state
  const [highlights, setHighlights] = useState<HighlightGroup[]>([]);

  // Posts của user hiện tại — lấy từ AppContext myPosts
  const userPosts = myPosts.slice(0, 9);
  console.log("[Profile] Render: myPosts.length =", myPosts.length, "userPosts.length =", userPosts.length);

  // Refresh myPosts khi quay lại profile tab
  useFocusEffect(
    useCallback(() => {
      console.log("[Profile] useFocusEffect: refreshing myPosts");
      setIsLoadingPosts(true);
      refreshMyPosts().then(() => {
        setIsLoadingPosts(false);
      }).catch(() => {
        setIsLoadingPosts(false);
      });
    }, []), // Empty deps - chỉ chạy khi mount/unmount
  );

  const refreshHighlights = useCallback(async () => {
    if (!currentUser?.id) return;
    const data = await getUserHighlights(currentUser.id);
    setHighlights(data);
  }, [currentUser?.id]);

  // Load highlights when profile is focused
  useFocusEffect(
    useCallback(() => {
      void refreshHighlights();
    }, [refreshHighlights]),
  );

  // Pull-to-Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsRefreshing(true);
    try {
      await Promise.all([refreshMyPosts(), refreshHighlights()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMyPosts, refreshHighlights, currentUser?.id]);

  // Load reposts when reposts tab is active
  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id || profileTab !== 'reposts') return;
      setIsLoadingReposts(true);
      getUserReposts(currentUser.id)
        .then((data) => setReposts(data))
        .catch(() => setReposts([]))
        .finally(() => setIsLoadingReposts(false));
    }, [currentUser?.id, profileTab]),
  );

  // Wrapper xóa post
  const handleDeletePost = useCallback(
    async (postId: string) => {
      await deletePost(postId);
    },
    [deletePost],
  );

  const formatCount = (count: number | undefined | null): string => {
    const n = Number(count) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const handleShareProfile = async () => {
    if (!currentUser) return;
    try {
      await Share.share({
        message: `Check out ${currentUser.displayName} on UITVibes! @${currentUser.username}`,
        title: `${currentUser.displayName} on UITVibes`,
      });
    } catch {
      // User cancelled
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StaticPremiumHeader
        title={currentUser.displayName}
        showAvatar
        avatarUser={currentUser}
        onNotificationPress={() => router.push('/notifications')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
            colors={[AppColors.primary]}
          />
        }
      >
        <View style={styles.profileInfo}>
          <Avatar user={currentUser} size="large" />
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/current` as any)}>
              <Text style={styles.statNumber}>{formatCount(currentUser.posts)}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/current` as any)}>
              <Text style={styles.statNumber}>{formatCount(currentUser.followers)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push('/followers/current?tab=following' as any)}
            >
              <Text style={styles.statNumber}>{formatCount(currentUser.following)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioContainer}>
          <Text style={styles.displayName}>{currentUser.displayName}</Text>
          <Text style={styles.bio}>{currentUser.bio}</Text>
          {currentUser.website && (
            <Text style={styles.website}>{currentUser.website}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
            <Feather name="user" size={16} color={AppColors.text} strokeWidth={2} />
            <Text style={styles.editButtonText}> Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleShareProfile}>
            <Feather name="share" size={16} color={AppColors.text} strokeWidth={2} />
            <Text style={styles.editButtonText}> Share</Text>
          </TouchableOpacity>
        </View>

        <HighlightBar
          highlights={highlights}
          isCurrentUser={true}
          onRefresh={refreshHighlights}
        />

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, profileTab === 'posts' && styles.activeTab]}
            onPress={() => setProfileTab('posts')}
          >
            <Feather name="grid" size={22} color={profileTab === 'posts' ? AppColors.primary : AppColors.iconMuted} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, profileTab === 'reposts' && styles.activeTab]}
            onPress={() => setProfileTab('reposts')}
          >
            <Feather name="refresh-cw" size={22} color={profileTab === 'reposts' ? AppColors.primary : AppColors.iconMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {profileTab === 'posts' ? (
          isLoadingPosts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          ) : userPosts.length === 0 ? (
            <EmptyPostsState isNewUser={isNewUser ?? false} />
          ) : (
            <PostGrid posts={userPosts} onDeletePost={handleDeletePost} currentUserId={currentUser?.id} />
          )
        ) : (
          isLoadingReposts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          ) : reposts.length === 0 ? (
            <View style={styles.emptyStories}>
              <Feather name="refresh-cw" size={48} color={AppColors.iconMuted} strokeWidth={1.5} />
              <Text style={styles.emptyStoriesText}>No reposts yet</Text>
            </View>
          ) : (
            <PostGrid posts={reposts} onDeletePost={handleDeletePost} currentUserId={currentUser?.id} />
          )
        )}
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 20,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...Typography.statNumber,
    color: AppColors.text,
  },
  statLabel: {
    ...Typography.statLabel,
    color: AppColors.iconMuted,
    marginTop: 2,
  },
  bioContainer: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 16,
  },
  displayName: {
    ...Typography.captionSemibold,
    marginBottom: 2,
    color: AppColors.text,
  },
  bio: {
    ...Typography.caption,
    lineHeight: 20,
    color: AppColors.textSecondary,
  },
  website: {
    ...Typography.caption,
    color: AppColors.primary,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: layoutPadding,
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    backgroundColor: AppColors.border,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editButtonText: {
    ...Typography.captionSemibold,
    color: AppColors.text,
  },
  highlights: {
    marginBottom: 2,
  },
  storyStripScroll: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
  },
  storyStripItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  addStoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.borderLight,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
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
    ...Typography.meta,
    color: AppColors.text,
    textAlign: 'center',
  },
  highlightItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  highlightCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  highlightText: {
    ...Typography.meta,
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
  loadingPosts: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStories: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStoriesText: {
    ...Typography.sectionTitle,
    color: AppColors.iconMuted,
  },
  emptyAddBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  emptyAddBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
