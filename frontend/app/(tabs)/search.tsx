import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { searchUsers, getPosts } from '../../services/api';
import { User, Post } from '../../data/mockData';
import { AppColors } from '../../constants/theme';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
  const router = useRouter();

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

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => router.push(`/profile/${item.id}` as any)}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.displayName}>{item.displayName}</Text>
      </View>
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color={AppColors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={AppColors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Feather name="x" size={18} color={AppColors.textMuted} />
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
            size={24}
            color={activeTab === 'posts' ? AppColors.primary : AppColors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Feather
            name="users"
            size={24}
            color={activeTab === 'users' ? AppColors.primary : AppColors.textMuted}
          />
        </TouchableOpacity>
      </View>

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
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: AppColors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
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
  username: {
    fontWeight: '600',
    fontSize: 14,
    color: AppColors.text,
  },
  displayName: {
    color: AppColors.textSecondary,
    fontSize: 14,
  },
  followButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
