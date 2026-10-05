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
import { useTheme } from '../../context/ThemeContext';
import { Avatar, PostGrid, EmptyPostsState, EditProfileModal } from '../../components';
import { StaticPremiumHeader } from '../../components/StaticPremiumHeader';
import { HighlightBar } from '../../components/highlight';
import { layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { getUserReposts } from '../../services/postService';
import { HighlightGroup, getUserHighlights } from '../../services/highlightService';
import { Post } from '../../data/mockData';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { currentUser, myPosts, refreshMyPosts, isNewUser, deletePost } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileTab, setProfileTab] = useState<'posts' | 'reposts'>('posts');
  const [reposts, setReposts] = useState<Post[]>([]);
  const [isLoadingReposts, setIsLoadingReposts] = useState(false);
  const [highlights, setHighlights] = useState<HighlightGroup[]>([]);

  const userPosts = myPosts.slice(0, 9);

  useFocusEffect(
    useCallback(() => {
      setIsLoadingPosts(true);
      refreshMyPosts().then(() => {
        setIsLoadingPosts(false);
      }).catch(() => {
        setIsLoadingPosts(false);
      });
    }, []),
  );

  const refreshHighlights = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const data = await getUserHighlights(currentUser.id);
      setHighlights(data || []);
    } catch {
      setHighlights([]);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshHighlights();
    }, [refreshHighlights]),
  );

  const handleRefresh = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsRefreshing(true);
    try {
      await Promise.all([refreshMyPosts(), refreshHighlights()]);
    } catch (e) {
      console.warn("[Profile] handleRefresh error:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMyPosts, refreshHighlights, currentUser?.id]);

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StaticPremiumHeader
        title={currentUser.displayName}
        onNotificationPress={() => router.push('/notifications' as any)}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={[styles.settingsBtn, { backgroundColor: colors.surfaceElevated }]}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Feather name="settings" size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.profileInfo}>
          <Avatar user={currentUser} size="large" />
          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/current` as any)}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{formatCount(currentUser.posts)}</Text>
              <Text style={[styles.statLabel, { color: colors.iconMuted }]}>Posts</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/followers/current` as any)}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{formatCount(currentUser.followers)}</Text>
              <Text style={[styles.statLabel, { color: colors.iconMuted }]}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push('/followers/current?tab=following' as any)}
            >
              <Text style={[styles.statNumber, { color: colors.text }]}>{formatCount(currentUser.following)}</Text>
              <Text style={[styles.statLabel, { color: colors.iconMuted }]}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bioContainer}>
          <Text style={[styles.displayName, { color: colors.text }]}>{currentUser.displayName}</Text>
          <Text style={[styles.bio, { color: colors.textSecondary }]}>{currentUser.bio}</Text>
          {currentUser.website && (
            <Text style={[styles.website, { color: colors.primary }]}>{currentUser.website}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.editButton,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            onPress={() => setShowEditModal(true)}
          >
            <Feather name="user" size={16} color={colors.text} strokeWidth={2} />
            <Text style={[styles.editButtonText, { color: colors.text }]}> Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.editButton,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            onPress={handleShareProfile}
          >
            <Feather name="share" size={16} color={colors.text} strokeWidth={2} />
            <Text style={[styles.editButtonText, { color: colors.text }]}> Share</Text>
          </TouchableOpacity>
        </View>

        <HighlightBar
          highlights={highlights}
          isCurrentUser={true}
          onRefresh={refreshHighlights}
        />

        <View style={[styles.tabsContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tab, profileTab === 'posts' && { borderTopColor: colors.primary, borderTopWidth: 2 }]}
            onPress={() => setProfileTab('posts')}
          >
            <Feather name="grid" size={22} color={profileTab === 'posts' ? colors.primary : colors.iconMuted} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, profileTab === 'reposts' && { borderTopColor: colors.primary, borderTopWidth: 2 }]}
            onPress={() => setProfileTab('reposts')}
          >
            <Feather name="refresh-cw" size={22} color={profileTab === 'reposts' ? colors.primary : colors.iconMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {profileTab === 'posts' ? (
          isLoadingPosts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : userPosts.length === 0 ? (
            <EmptyPostsState isNewUser={isNewUser ?? false} />
          ) : (
            <PostGrid posts={userPosts} onDeletePost={handleDeletePost} currentUserId={currentUser?.id} />
          )
        ) : (
          isLoadingReposts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : reposts.length === 0 ? (
            <View style={styles.emptyStories}>
              <Feather name="refresh-cw" size={48} color={colors.iconMuted} strokeWidth={1.5} />
              <Text style={[styles.emptyStoriesText, { color: colors.iconMuted }]}>No reposts yet</Text>
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
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  statLabel: {
    ...Typography.statLabel,
    marginTop: 2,
  },
  bioContainer: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 16,
  },
  displayName: {
    ...Typography.captionSemibold,
    marginBottom: 2,
  },
  bio: {
    ...Typography.caption,
    lineHeight: 20,
  },
  website: {
    ...Typography.caption,
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
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  editButtonText: {
    ...Typography.captionSemibold,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
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
  },
});
