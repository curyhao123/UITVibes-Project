import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components';
import { useApp } from '../../context/AppContext';
import {
  searchUsers,
  getPosts,
  toggleFollow as apiToggleFollow,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearAllRecentSearches,
} from '../../services/api';
import { User, Post } from '../../data/mockData';
import { RecentSearch } from '../../services/session';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import defaultAvatar from '../../assets/images/default-avatar.png';

export default function SearchScreen() {
  const router = useRouter();
  const { toggleFollow, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('users');
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const allPosts = await getPosts();
    setPosts(allPosts);
    await loadRecentSearches();
  };

  const loadRecentSearches = async () => {
    setIsLoadingRecent(true);
    try {
      const searches = await getRecentSearches();
      setRecentSearches(searches);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const trimmed = query.trim();
        if (trimmed) {
          const results = await searchUsers(trimmed);
          setUsers(results);
        } else {
          setUsers([]);
          await loadRecentSearches();
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const handleUserClick = async (user: User) => {
    await saveRecentSearch({
      userId: user.id,
      displayName: user.displayName,
      bio: user.bio || "",
      avatarUrl: user.avatar || "",
      followersCount: user.followers,
    });
    router.push(`/profile/${user.id}` as any);
  };

  const handleRecentClick = async (item: RecentSearch) => {
    await removeRecentSearch(item.userId);
    await saveRecentSearch(item);
    router.push(`/profile/${item.userId}` as any);
  };

  const handleRemoveRecent = async (userId: string, e: any) => {
    e.stopPropagation();
    await removeRecentSearch(userId);
    setRecentSearches((prev) => prev.filter((s) => s.userId !== userId));
  };

  const handleClearAll = async () => {
    await clearAllRecentSearches();
    setRecentSearches([]);
  };

  const handleFollowToggle = async (userId: string) => {
    // Capture original state before optimistic update so revert can use it
    let originalState: { isFollowing: boolean; followers: number } | null = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId && originalState === null) {
          originalState = { isFollowing: u.isFollowing, followers: u.followers };
          return {
            ...u,
            isFollowing: !u.isFollowing,
            followers: u.isFollowing ? u.followers - 1 : u.followers + 1,
          };
        }
        return u;
      }),
    );

    try {
      const nextIsFollowing = await toggleFollow(userId);
      // Sync with server truth: only correct isFollowing (followers already correct from optimistic)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isFollowing: nextIsFollowing } : u,
        ),
      );
    } catch (error) {
      // Revert to original state on failure
      if (originalState) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, isFollowing: originalState!.isFollowing, followers: originalState!.followers }
              : u,
          ),
        );
      }
      console.error("Failed to toggle follow:", error);
    }
  };

  const renderRecentItem = ({ item }: { item: RecentSearch }) => (
    <TouchableOpacity
      style={styles.recentItem}
      onPress={() => handleRecentClick(item)}
    >
      <Image
        source={item.avatarUrl ? { uri: item.avatarUrl } : defaultAvatar}
        style={styles.recentAvatar}
      />
      <View style={styles.recentInfo}>
        <Text style={styles.recentDisplayName} numberOfLines={1}>
          {item.displayName}
        </Text>
        {item.bio ? (
          <Text style={styles.recentBio} numberOfLines={1}>
            {item.bio}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.recentRemoveBtn}
        onPress={(e) => handleRemoveRecent(item.userId, e)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="x" size={16} color={AppColors.iconMuted} strokeWidth={2} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserClick(item)}
    >
      <Image source={item.avatar ? { uri: item.avatar } : defaultAvatar} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.displayNameHandle}>@{item.displayName}</Text>
        {item.bio ? (
          <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.followButton, item.isFollowing && styles.followingButton]}
        onPress={() => handleFollowToggle(item.id)}
      >
        <Text style={[styles.followText, item.isFollowing && styles.followingText]}>
          {item.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => router.push(`/post/${item.id}` as any)}
    >
      <Image source={{ uri: item.image }} style={styles.postImage} />
      <View style={styles.postOverlay}>
        <Feather name="heart" size={14} color="white" />
        <Text style={styles.postOverlayText}>{item.likes}</Text>
      </View>
    </TouchableOpacity>
  );

  const showRecentSearches =
    activeTab === 'users' && !searchQuery.trim() && !isSearching;

  const renderRecentHeader = () => (
    <View style={styles.recentHeader}>
      <Text style={styles.recentTitle}>Recent</Text>
      {recentSearches.length > 0 && (
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearAllText}>Clear All</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRecentList = () => {
    if (isLoadingRecent) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={AppColors.primary} />
        </View>
      );
    }

    if (recentSearches.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={48} color={AppColors.border} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No recent searches</Text>
          <Text style={styles.emptySubtitle}>
            Search for people you want to find
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={recentSearches}
        renderItem={renderRecentItem}
        keyExtractor={(item) => item.userId}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderRecentHeader}
        contentContainerStyle={styles.recentListContent}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Search"
        avatarUser={currentUser}
        rightAction={
          <View style={styles.searchIconWrap}>
            <Feather name="search" size={20} color={AppColors.iconMuted} strokeWidth={2} />
          </View>
        }
        bottomContent={
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Feather name="search" size={18} color={AppColors.iconMuted} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search"
                  placeholderTextColor={AppColors.iconMuted}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Feather name="x" size={18} color={AppColors.iconMuted} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
                onPress={() => setActiveTab('posts')}
              >
                <Feather
                  name="grid"
                  size={22}
                  color={activeTab === 'posts' ? AppColors.primary : AppColors.iconMuted}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                onPress={() => setActiveTab('users')}
              >
                <Feather
                  name="users"
                  size={22}
                  color={activeTab === 'users' ? AppColors.primary : AppColors.iconMuted}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </>
        }
      />

      {activeTab === 'posts' ? (
        <View key="posts-tab">
          <FlatList
            data={posts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            numColumns={3}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : showRecentSearches ? (
        renderRecentList()
      ) : (
        <View key="users-tab">
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Feather name="users" size={48} color={AppColors.border} strokeWidth={1.5} />
                  <Text style={styles.emptyTitle}>
                    {searchQuery.length > 0 ? `No users found for "@${searchQuery}"` : 'Search for people'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery.length > 0
                      ? 'Try a different search term'
                      : 'Find friends by their display name'}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    paddingHorizontal: layoutPadding,
    paddingTop: 8,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    marginLeft: 8,
    color: AppColors.text,
    padding: 0,
  },
  tabContainer: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: AppColors.primary,
  },
  postItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 1,
  },
  postImage: {
    flex: 1,
  },
  postOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    opacity: 0,
  },
  postOverlayText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  displayNameHandle: {
    fontWeight: '700',
    fontSize: 15,
    color: AppColors.text,
    letterSpacing: -0.2,
  },
  userBio: {
    color: AppColors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followingButton: {
    backgroundColor: AppColors.border,
  },
  followText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  followingText: {
    color: AppColors.text,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: AppColors.text,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  emptySubtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 14,
  },
  emptyText: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layoutPadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  recentTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: AppColors.text,
  },
  clearAllText: {
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.primary,
  },
  recentListContent: {
    paddingBottom: 20,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 10,
  },
  recentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentDisplayName: {
    fontWeight: '600',
    fontSize: 15,
    color: AppColors.text,
  },
  recentBio: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  recentRemoveBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
