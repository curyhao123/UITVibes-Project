import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getUserById, getUserPosts, toggleFollow } from '../../services/api';
import { getUserReposts } from '../../services/postService';
import { HighlightGroup, getUserHighlights } from '../../services/highlightService';
import { getCurrentUserId } from '../../services/session';
import { User, Post } from '../../data/mockData';
import { Avatar, PostGrid } from '../../components';
import { HighlightBar } from '../../components/highlight';
import { AppColors, layoutPadding, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { ScreenHeader } from '../../components/ScreenHeader';
import { UserActionsSheet } from '../../components/profile/UserActionsSheet';
import { blockUser, getBlockStatus, type BlockStatusDto } from '../../services/blockService';
import { ReportUserSheet } from '../../components/profile/ReportUserSheet';
import { Toast } from '../../components/Toast';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockStatus, setBlockStatus] = useState<BlockStatusDto | null>(null);
  const [profileTab, setProfileTab] = useState<'posts' | 'reposts'>('posts');
  const [reposts, setReposts] = useState<Post[]>([]);
  const [isLoadingReposts, setIsLoadingReposts] = useState(false);

  // Highlights state
  const [highlights, setHighlights] = useState<HighlightGroup[]>([]);
  const [actionsSheetVisible, setActionsSheetVisible] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [reportToastVisible, setReportToastVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setProfileTab('posts');
    setReposts([]);
    loadUserData();
  }, [id]);

  // Load reposts when reposts tab is active
  useFocusEffect(
    useCallback(() => {
      if (!id || profileTab !== 'reposts') return;
      setIsLoadingReposts(true);
      getUserReposts(id as string)
        .then((data) => setReposts(data))
        .catch(() => setReposts([]))
        .finally(() => setIsLoadingReposts(false));
    }, [id, profileTab]),
  );

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const targetId = id as string;
      const currentUserId = getCurrentUserId();
      setBlockStatus(null);
      if (targetId && currentUserId && targetId !== currentUserId) {
        const status = await getBlockStatus(targetId);
        setBlockStatus(status);
        if (status.blockedByMe || status.blockedMe) {
          setUser(null);
          setPosts([]);
          return;
        }
      }

      const [userData, userPosts] = await Promise.all([
        getUserById(targetId),
        getUserPosts(targetId),
      ]);
      setUser(userData || null);
      setPosts(userPosts);

      // Load highlights for this user
      const userHighlights = await getUserHighlights(targetId);
      setHighlights(userHighlights);
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

  const handleBlockUser = async () => {
    if (!user) return;
    console.log('[handleBlockUser] currentUserId:', getCurrentUserId(), 'blockedId:', user.id);
    await blockUser(user.id);
    setBlockStatus({ blockedByMe: true, blockedMe: false });
    setUser(null);
    setPosts([]);
  };

  const handleReportUser = () => {
    setActionsSheetVisible(false);
    setReportSheetVisible(true);
  };

  const handleReportSuccess = () => {
    setReportSheetVisible(false);
    setReportToastVisible(true);
  };

  const formatCount = (count: number | undefined | null): string => {
    const n = Number(count) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    const isBlocked = !!(blockStatus?.blockedByMe || blockStatus?.blockedMe);
    if (isBlocked) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScreenHeader title="Profile" onBack={() => router.back()} />
          <View style={styles.blockedContainer}>
            <Feather name="slash" size={48} color={AppColors.iconMuted} strokeWidth={1.5} />
            <Text style={styles.blockedTitle}>Profile unavailable</Text>
            <Text style={styles.blockedText}>
              You cannot view this profile.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Profile" onBack={() => router.back()} />
        <View style={styles.notFoundContainer}>
          <Feather name="user-x" size={48} color={AppColors.iconMuted} strokeWidth={1.5} />
          <Text style={styles.notFoundText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader
          title={user.username}
          onBack={() => router.back()}
          rightAction={
            <TouchableOpacity
              style={styles.moreBtn}
              activeOpacity={0.7}
              onPress={() => setActionsSheetVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="more-horizontal" size={22} color={AppColors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          }
        />
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

          <HighlightBar
            highlights={highlights}
            isCurrentUser={false}
          />

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, profileTab === 'posts' && styles.activeTab]}
              onPress={() => setProfileTab('posts')}
            >
              <Feather name="grid" size={24} color={profileTab === 'posts' ? AppColors.primary : AppColors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, profileTab === 'reposts' && styles.activeTab]}
              onPress={() => setProfileTab('reposts')}
            >
              <Feather name="refresh-cw" size={24} color={profileTab === 'reposts' ? AppColors.primary : AppColors.textMuted} />
            </TouchableOpacity>
          </View>

          {profileTab === 'posts' ? (
            posts.length === 0 ? (
              <View style={styles.emptyStories}>
                <Feather name="grid" size={48} color={AppColors.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyStoriesText}>No posts yet</Text>
              </View>
            ) : (
              <PostGrid posts={posts} />
            )
          ) : (
            isLoadingReposts ? (
              <View style={styles.emptyStories}>
                <ActivityIndicator size="small" color={AppColors.primary} />
              </View>
            ) : reposts.length === 0 ? (
              <View style={styles.emptyStories}>
                <Feather name="refresh-cw" size={48} color={AppColors.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyStoriesText}>No reposts yet</Text>
              </View>
            ) : (
              <PostGrid posts={reposts} />
            )
          )}
        </ScrollView>

        <UserActionsSheet
          visible={actionsSheetVisible}
          onClose={() => setActionsSheetVisible(false)}
          onBlock={handleBlockUser}
          onReport={handleReportUser}
          reportedUserId={user.id}
          blockedUsername={user.username}
        />

        <ReportUserSheet
          visible={reportSheetVisible}
          reportedDisplayName={user.displayName}
          reportedUserId={user.id}
          onClose={() => setReportSheetVisible(false)}
          onReportSuccess={handleReportSuccess}
        />

        <Toast
          visible={reportToastVisible}
          message="Report submitted. Thanks for helping keep the community safe."
          type="success"
          onHide={() => setReportToastVisible(false)}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm + 2,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
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
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    ...Typography.sectionTitle,
    color: AppColors.iconMuted,
  },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layoutPadding + 20,
  },
  blockedTitle: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    marginTop: 12,
  },
  blockedText: {
    ...Typography.body,
    color: AppColors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
});
