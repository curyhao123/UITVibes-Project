import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { Notification } from '../data/mockData';
import { AppColors } from '../constants/theme';
import { formatDistanceToNow } from '../utils/time';
import defaultAvatar from '../assets/images/default-avatar.png';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, refreshNotifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useApp();

  useEffect(() => {
    refreshNotifications();
  }, []);

  const getNotificationIcon = (type: string): { name: string; color: string } => {
    switch (type) {
      case 'follow':
        return { name: 'user-plus', color: AppColors.primary };
      case 'like':
        return { name: 'heart', color: '#e74c3c' };
      case 'comment':
        return { name: 'message-circle', color: '#3498db' };
      case 'mention':
        return { name: 'at-sign', color: '#9b59b6' };
      case 'share':
        return { name: 'share', color: '#2ecc71' };
      default:
        return { name: 'bell', color: AppColors.textMuted };
    }
  };

  const handleNotificationPress = async (notif: Notification) => {
    await markNotificationRead(notif.id);
    if (notif.post) {
      router.push(`/post/${notif.post.id}` as any);
    } else if (notif.type === 'follow') {
      router.push(`/profile/${notif.user.id}` as any);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <Image source={item.user.avatar ? { uri: item.user.avatar } : defaultAvatar} style={styles.avatar} />
          <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
            <Feather name={icon.name as any} size={10} color="white" />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.notifText}>
            <Text style={styles.username}>{item.user.displayName}</Text>
            {' '}
            {item.message}
          </Text>
          <Text style={styles.time}>
            {formatDistanceToNow(new Date(item.createdAt))}
          </Text>
        </View>

        {/* Post thumbnail */}
        {item.post && (
          <Image source={{ uri: item.post.image }} style={styles.thumbnail} />
        )}

        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllNotificationsRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="bell" size={48} color={AppColors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              When someone interacts with your posts, you'll see it here.
            </Text>
          </View>
        }
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  markAllBtn: {
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
  list: {
    paddingBottom: 100,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
    backgroundColor: AppColors.surface,
  },
  notifItemUnread: {
    backgroundColor: `${AppColors.primary}06`,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  notifText: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.text,
  },
  username: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.primary,
    marginLeft: 6,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
