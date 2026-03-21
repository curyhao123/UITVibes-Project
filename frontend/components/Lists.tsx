import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Post, User } from '../data/mockData';
import { AppColors } from '../constants/theme';

export const PostGrid: React.FC<{ posts: Post[] }> = ({ posts }) => {
  const renderItem = ({ item, index }: { item: Post; index: number }) => (
    <View style={styles.gridItem}>
      <Image source={{ uri: item.image }} style={styles.gridImage} />
      <View style={styles.gridOverlay}>
        <Feather name="heart" size={14} color="white" />
        <Text style={styles.gridText}>{item.likes}</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
    />
  );
};

export const UserListItem: React.FC<{ user: User; onPress?: () => void }> = ({ user, onPress }) => {
  return (
    <TouchableOpacity style={styles.userItem} onPress={onPress}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.displayName}>{user.displayName}</Text>
      </View>
      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followText}>Follow</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 1,
  },
  gridImage: {
    flex: 1,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    opacity: 0,
  },
  gridText: {
    color: 'white',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
