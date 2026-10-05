import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedSkeleton, PostCard, StoryBar } from '../../components';
import { StaticPremiumHeader } from '../../components/StaticPremiumHeader';
import { layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
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
    refreshNotifications,
    isNewUser,
  } = useApp();

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPosts();
    await refreshStories();
    setRefreshing(false);
  };

  // Refresh when the screen regains focus
  useFocusEffect(
    useCallback(() => {
      void refreshPosts();
      void refreshStories();
      void refreshNotifications();
    }, [refreshPosts, refreshStories, refreshNotifications]),
  );

  // Mở màn hình tạo story
  const handleAddStory = () => {
    router.push('/story/create' as any);
  };

  const displayedPosts = posts;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StaticPremiumHeader
          title="Home"
          showAvatar
          avatarUser={currentUser}
          onNotificationPress={() => router.push('/notifications' as any)}
          notificationCount={unreadCount}
        />
        <View style={[styles.feedTabsContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.feedTabs, { backgroundColor: colors.background }]}>
            <View style={[styles.feedTab, { borderBottomColor: colors.primary }]}>
              <Text style={[styles.feedTabText, { color: colors.text }]}>For You</Text>
            </View>
            <View style={styles.feedTab}>
              <Text style={[styles.feedTabText, { color: colors.iconMuted }]}>Following</Text>
            </View>
          </View>
        </View>
        <FeedSkeleton count={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Premium header với blur effect */}
      <StaticPremiumHeader
        title="Home"
        showAvatar
        avatarUser={currentUser}
        onNotificationPress={() => router.push('/notifications' as any)}
        notificationCount={unreadCount}
        largeTitle
      />

      {/* Feed tabs */}
      <View style={[styles.feedTabsContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.feedTabs, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.feedTab, feedTab === 'foryou' && { borderBottomColor: colors.primary }]}
            onPress={() => setFeedTab('foryou')}
          >
            <Text style={[styles.feedTabText, { color: feedTab === 'foryou' ? colors.text : colors.iconMuted }]}>
              For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedTab, feedTab === 'following' && { borderBottomColor: colors.primary }]}
            onPress={() => setFeedTab('following')}
          >
            <Text style={[styles.feedTabText, { color: feedTab === 'following' ? colors.text : colors.iconMuted }]}>
              Following
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayedPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={
          feedTab === 'foryou' ? (
            <StoryBar
              stories={stories}
              isNewUser={isNewUser}
              onAddStory={handleAddStory}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          posts.length === 0 && feedTab === 'foryou' ? (
            <View style={styles.emptyFeed}>
              <View style={[styles.welcomeIconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Feather name="send" size={32} color={colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>Welcome to UITVibes!</Text>
              <Text style={[styles.emptyFeedSubtitle, { color: colors.textMuted }]}>
                Be the first to share something with the community.
              </Text>
              <TouchableOpacity
                style={[styles.createPostBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/create' as any)}
              >
                <Text style={styles.createPostBtnText}>Create Your First Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyFeed}>
              <Feather name="users" size={40} color={colors.iconMuted} strokeWidth={1.8} />
              <Text style={[styles.emptyFeedTitle, { color: colors.text }]}>
                {feedTab === 'following' ? 'No posts from people you follow' : 'No posts yet'}
              </Text>
              <Text style={[styles.emptyFeedSubtitle, { color: colors.iconMuted }]}>
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
  },
  // Feed Tabs
  feedTabsContainer: {},
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
  feedTabText: {
    ...Typography.bodySemibold,
    fontSize: 14,
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
  },
  emptyFeedSubtitle: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: 6,
  },
  // New user welcome state
  welcomeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    ...Typography.screenTitle,
    marginBottom: 8,
    textAlign: 'center',
  },
  createPostBtn: {
    marginTop: 24,
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
