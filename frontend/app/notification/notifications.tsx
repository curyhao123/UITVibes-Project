import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from '../../utils/time';
import { CompactHeader } from '../../components/StaticPremiumHeader';
import { useTheme } from '../../context/ThemeContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
  getUnreadNotificationCount
} from '../../services/notificationService';

const PAGE_SIZE = 20;

const getNotificationIcon = (type: string, primaryColor: string, textMutedColor: string): { name: keyof typeof Feather.glyphMap; color: string } => {
  switch (type) {
    case 'NewFollower':
      return { name: 'user-plus', color: primaryColor };
    case 'PostLiked':
      return { name: 'heart', color: '#e74c3c' };
    case 'PostCommented':
      return { name: 'message-circle', color: '#3498db' };
    case 'Mentioned':
    case 'Tagged':
      return { name: 'at-sign', color: '#9b59b6' };
    case 'NewMessage':
      return { name: 'message-square', color: primaryColor };
    case 'MessageRead':
      return { name: 'check-circle', color: '#2ecc71' };
    default:
      return { name: 'bell', color: textMutedColor };
  }
};

// TODO: xác nhận route điều hướng theo entityId cho từng loại type.
function getNavigationTarget(notif: Notification): string | null {
  switch (notif.type) {
    case 'NewFollower':
      return `/profile/${notif.actorId}`;
    case 'PostLiked':
    case 'PostCommented':
    case 'Tagged':
    case 'Mentioned':
      return `/post/${notif.entityId}`;
    default:
      return null;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // im lặng — không critical cho màn hình này
    }
  }, []);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNotifications(1, PAGE_SIZE);
      setNotifications(result.items);
      setPage(result.page);
      setHasNext(result.hasNext);
    } catch (err) {
      console.warn('[Notifications] load failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getNotifications(nextPage, PAGE_SIZE);
      setNotifications((prev) => [...prev, ...result.items]);
      setPage(result.page);
      setHasNext(result.hasNext);
    } catch (err) {
      console.warn('[Notifications] load more failed', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNext, loadingMore, page]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getNotifications(1, PAGE_SIZE);
      setNotifications(result.items);
      setPage(result.page);
      setHasNext(result.hasNext);
      await fetchUnreadCount();
    } finally {
      setRefreshing(false);
    }
  }, [fetchUnreadCount]);

  useEffect(() => {
    loadFirstPage();
    fetchUnreadCount();
  }, [loadFirstPage, fetchUnreadCount]);

  const handleNotificationPress = async (notif: Notification) => {
    if (!notif.isRead) {
      // optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await markNotificationRead(notif.id);
      } catch (err) {
        console.warn('[Notifications] mark read failed', err);
      }
    }

    const target = getNavigationTarget(notif);
    if (target) router.push(target as any);
  };

  const handleMarkAllRead = async () => {
    const prevNotifications = notifications;
    const prevUnread = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn('[Notifications] mark all read failed', err);
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getNotificationIcon(item.type, colors.primary, colors.textMuted);

    return (
      <TouchableOpacity
        style={[
          styles.notifItem,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
          !item.isRead && {
            backgroundColor: isDark ? `${colors.primary}15` : `${colors.primary}08`,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.iconWrap}>
          <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
            <Feather name={icon.name} size={16} color="white" />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.notifText, { color: colors.text }]}>{item.content}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {formatDistanceToNow(new Date(item.createdAt))}
          </Text>
        </View>

        {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <CompactHeader
        title="Notifications"
        showBack
        onBack={() => router.back()}
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="bell" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                When someone interacts with your posts, you&apos;ll see it here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 100,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});