import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components';
import { useApp } from '../../context/AppContext';
import { searchUsers, getPosts, toggleFollow as apiToggleFollow } from '../../services/api';
import { User, Post } from '../../data/mockData';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import defaultAvatar from '../../assets/images/default-avatar.png';

export default function SearchScreen() {
  const router = useRouter();
  const { toggleFollow, currentUser } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const allPosts = await getPosts();
    setPosts(allPosts);
    const allUsers = await searchUsers('');
    setUsers(allUsers);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      const results = await searchUsers(query);
      setUsers(results);
    } else {
      const allUsers = await searchUsers('');
      setUsers(allUsers);
    }
  };

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

  const handleFollowToggle = async (userId: string) => {
    await toggleFollow(userId);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            isFollowing: !u.isFollowing,
            followers: u.isFollowing ? u.followers - 1 : u.followers + 1,
          };
        }
        return u;
      })
    );
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => router.push(`/profile/${item.id}` as any)}
    >
      <Image source={item.avatar ? { uri: item.avatar } : defaultAvatar} style={styles.avatar} />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.username}>{item.username}</Text>
          {item.isVerified && (
            <Feather name="check-circle" size={12} color={AppColors.primary} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={styles.displayName}>{item.displayName}</Text>
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
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
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
  username: {
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.text,
  },
  displayName: {
    color: AppColors.textSecondary,
    fontSize: 14,
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
});