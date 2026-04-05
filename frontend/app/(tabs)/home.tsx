import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PostCard, StoryBar, Avatar, Header } from '../../components';
import { useApp } from '../../context/AppContext';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { activeUserFollowingIds } from '../../data/mockData';
import { FeedSkeleton } from '../../components/SkeletonLoader';

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const {
    currentUser,
    posts,
    stories,
    isLoading,
    refreshPosts,
    refreshStories,
    feedTab,
    setFeedTab,
    unreadCount,
    isNewUser,
  } = useApp();

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPosts();
    await refreshStories();
    setRefreshing(false);
  };

  const displayedPosts = useMemo(() => {
    if (feedTab === 'following') {
      return posts.filter(
        (post) => post.userId === 'current' || activeUserFollowingIds.has(post.userId)
      );
    }
    return posts;
  }, [posts, feedTab]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Header
          title="Discover"
          showAvatar
          avatarUser={currentUser}
          rightAction={
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="bell" size={22} color={AppColors.text} strokeWidth={2} />
            </TouchableOpacity>
          }
          bottomContent={
            <View style={styles.feedTabs}>
              <View style={[styles.feedTab, styles.feedTabActive]}>
                <Text style={[styles.feedTabText, styles.feedTabTextActive]}>For You</Text>
              </View>
              <View style={styles.feedTab}>
                <Text style={styles.feedTabText}>Following</Text>
              </View>
            </View>
          }
        />
        <FeedSkeleton count={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Unified premium header */}
      <Header
        title="Discover"
        showAvatar
        avatarUser={currentUser}
        rightAction={
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            onPress={() => router.push('/notifications' as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="bell" size={22} color={AppColors.text} strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
        bottomContent={
          <View style={styles.feedTabs}>
            <TouchableOpacity
              style={[styles.feedTab, feedTab === 'foryou' && styles.feedTabActive]}
              onPress={() => setFeedTab('foryou')}
            >
              <Text style={[styles.feedTabText, feedTab === 'foryou' && styles.feedTabTextActive]}>
                For You
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedTab, feedTab === 'following' && styles.feedTabActive]}
              onPress={() => setFeedTab('following')}
            >
              <Text style={[styles.feedTabText, feedTab === 'following' && styles.feedTabTextActive]}>
                Following
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <FlatList
        data={displayedPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={
          feedTab === 'foryou' ? (
            <StoryBar stories={stories} isNewUser={isNewUser} />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isNewUser && feedTab === 'foryou' ? (
            <View style={styles.emptyFeed}>
              <View style={styles.welcomeIconWrap}>
                <Feather name="send" size={32} color={AppColors.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.welcomeTitle}>Welcome to UITVibes!</Text>
              <Text style={styles.emptyFeedSubtitle}>
                Be the first to share something with the community.
              </Text>
              <TouchableOpacity
                style={styles.createPostBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/create-post' as any)}
              >
                <Text style={styles.createPostBtnText}>Create Your First Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyFeed}>
              <Feather name="users" size={40} color={AppColors.iconMuted} strokeWidth={1.8} />
              <Text style={styles.emptyFeedTitle}>
                {feedTab === 'following' ? 'No posts from people you follow' : 'No posts yet'}
              </Text>
              <Text style={styles.emptyFeedSubtitle}>
                {feedTab === 'following'
                  ? 'Follow more people to see their posts here'
                  : 'Be the first to share something!'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={styles.feedContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: AppColors.surfaceElevated,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  // Feed Tabs
  feedTabs: {
    flexDirection: 'row',
    paddingHorizontal: layoutPadding,
  },
  feedTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  feedTabActive: {
    borderBottomColor: AppColors.primary,
  },
  feedTabText: {
    ...Typography.bodySemibold,
    fontSize: 14,
    color: AppColors.iconMuted,
  },
  feedTabTextActive: {
    color: AppColors.text,
  },
  // Feed Content
  feedContent: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 100,
  },
  // Empty State
  emptyFeed: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyFeedTitle: {
    ...Typography.sectionTitle,
    marginTop: 16,
    textAlign: 'center',
    color: AppColors.text,
  },
  emptyFeedSubtitle: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  // New user welcome state
  welcomeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    ...Typography.screenTitle,
    color: AppColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  createPostBtn: {
    marginTop: 24,
    backgroundColor: AppColors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPostBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});
