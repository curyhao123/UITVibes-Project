import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { PostCard, StoryBar, Avatar } from '../../components';
import { useApp } from '../../context/AppContext';
import { AppColors } from '../../constants/theme';

export default function HomeScreen() {
  const { currentUser, posts, stories, isLoading, refreshPosts, refreshStories } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshPosts();
    await refreshStories();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {currentUser ? (
            <TouchableOpacity activeOpacity={0.8}>
              <Avatar user={currentUser} size="small" />
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
            <Feather name="bell" size={22} color={AppColors.text} />
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={
          stories.length > 0 ? <StoryBar stories={stories} /> : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: AppColors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
  },
});
