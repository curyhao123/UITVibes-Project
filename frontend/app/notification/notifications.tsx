import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  SectionListData,
  SectionListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { formatDistanceToNow } from '../../utils/time';
import { CompactHeader } from '../../components/StaticPremiumHeader';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  Notification,
  getUnreadNotificationCount,
} from '../../services/notificationService';
import { useActorCache } from '../../hooks/useActorCache';
import { useToast } from '../../components/EnhancedToast';
import { borderRadius } from '../../constants/theme';

const PAGE_SIZE = 20;

// ─── Icon / Color Mapping (Instagram accent style) ──────────────────────────
const TYPE_META: Record<
  string,
  { name: keyof typeof Feather.glyphMap; color: string }
> = {
  NewFollower: { name: 'user-plus', color: '#3B82F6' },
  PostLiked: { name: 'heart', color: '#EF4444' },
  PostCommented: { name: 'message-circle', color: '#3B82F6' },
  Mentioned: { name: 'at-sign', color: '#A855F7' },
  Tagged: { name: 'tag', color: '#A855F7' },
  NewMessage: { name: 'message-square', color: '#10B981' },
  MessageRead: { name: 'check-circle', color: '#10B981' },
};

const getTypeMeta = (type: string) =>
  TYPE_META[type] ?? ({ name: 'bell', color: '#6B7280' } as const);

// ─── Section grouping (Today / Earlier this week / Earlier this month / Older)
const getSectionTitle = (date: Date): string => {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const diffMs = startOfToday.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays <= 6) return 'Earlier this week';
  if (diffDays <= 29) return 'Earlier this month';
  return 'Older';
};

const getSectionOrder = (title: string): number => {
  switch (title) {
    case 'Today':
      return 0;
    case 'Earlier this week':
      return 1;
    case 'Earlier this month':
      return 2;
    default:
      return 3;
  }
};

interface NotificationSection {
  title: string;
  data: Notification[];
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { refreshNotifications, toggleFollow } = useApp();
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Following status cache for follow-back buttons
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [pendingFollowIds, setPendingFollowIds] = useState<Set<string>>(new Set());

  // Avatar cache
  const actorIds = useMemo(
    () => notifications.map((n) => n.actorId).filter(Boolean),
    [notifications],
  );
  const { getActor } = useActorCache(actorIds);

  // ─── Data loading ────────────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // ignore
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
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [fetchUnreadCount, refreshNotifications]);

  useEffect(() => {
    loadFirstPage();
    fetchUnreadCount();
  }, [loadFirstPage, fetchUnreadCount]);

  // ─── Auto mark-all-read when opening history screen ────────────────────────
  // After loading first page, if any notification is unread
  // mark all as read + update badge.
  const autoMarkAllReadRef = useRef(false);
  useEffect(() => {
    if (autoMarkAllReadRef.current) return;
    if (loading) return; // chờ load xong
    if (notifications.length === 0) return;
    if (unreadCount === 0) return;

    autoMarkAllReadRef.current = true;
    (async () => {
      try {
        // Optimistic update to avoid UI flicker
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        await markAllNotificationsRead();
        // Re-sync context (badge on Home bell)
        await refreshNotifications();
      } catch (err) {
        console.warn('[Notifications] auto mark-all-read failed', err);
        // Rollback: refresh from server
        await loadFirstPage();
        await fetchUnreadCount();
      }
    })();
  }, [loading, notifications, unreadCount, refreshNotifications, loadFirstPage, fetchUnreadCount]);

  // ─── Interactions ────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn('[Notifications] mark read failed', err);
    }
  }, []);

  const getNavigationTarget = useCallback(
    (notif: Notification): string | null => {
      switch (notif.type) {
        case 'NewFollower':
          return `/profile/${notif.actorId}`;
        case 'PostLiked':
        case 'PostCommented':
        case 'Tagged':
        case 'Mentioned':
          return `/post/${notif.entityId}`;
        case 'NewMessage':
          // No conversationId on the DTO yet — fall through
          return null;
        default:
          return null;
      }
    },
    [],
  );

  const handleNotificationPress = useCallback(
    async (notif: Notification) => {
      if (!notif.isRead) {
        await markAsRead(notif.id);
      }
      const target = getNavigationTarget(notif);
      if (target) router.push(target as any);
    },
    [markAsRead, getNavigationTarget, router],
  );

  const handleFollowBack = useCallback(
    async (notif: Notification) => {
      if (pendingFollowIds.has(notif.actorId)) return;
      if (followingMap[notif.actorId]) return;
      setPendingFollowIds((prev) => new Set(prev).add(notif.actorId));
      const actorName = getActor(notif.actorId)?.username ?? 'user';
      setFollowingMap((prev) => ({ ...prev, [notif.actorId]: true }));
      try {
        await toggleFollow(notif.actorId);
        toast.success(`Following ${actorName}`);
      } catch (err) {
        console.warn('[Notifications] follow-back failed', err);
        setFollowingMap((prev) => ({ ...prev, [notif.actorId]: false }));
        toast.error('Could not follow. Please try again.');
      } finally {
        setPendingFollowIds((prev) => {
          const next = new Set(prev);
          next.delete(notif.actorId);
          return next;
        });
      }
    },
    [pendingFollowIds, followingMap, toggleFollow, toast, getActor],
  );

  // ─── Build sections ──────────────────────────────────────────────────────
  const sections: NotificationSection[] = useMemo(() => {
    const buckets = new Map<string, Notification[]>();
    for (const n of notifications) {
      const title = getSectionTitle(new Date(n.createdAt));
      if (!buckets.has(title)) buckets.set(title, []);
      buckets.get(title)!.push(n);
    }
    return Array.from(buckets.entries())
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => getSectionOrder(a.title) - getSectionOrder(b.title));
  }, [notifications]);

  // ─── Render helpers ─────────────────────────────────────────────────────
  const renderItem: SectionListRenderItem<Notification, NotificationSection> = ({
    item,
    index,
    section,
  }) => {
    const meta = getTypeMeta(item.type);
    const actor = getActor(item.actorId);
    const isFirstInSection = index === 0;
    const isLastInSection = index === section.data.length - 1;
    const isFollowed = followingMap[item.actorId] === true;
    const isFollowPending = pendingFollowIds.has(item.actorId);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleNotificationPress(item)}
        style={[
          styles.row,
          {
            backgroundColor: item.isRead
              ? colors.background
              : isDark
                ? 'rgba(217, 119, 87, 0.08)'
                : 'rgba(217, 119, 87, 0.05)',
            borderTopWidth: isFirstInSection ? 1 : 0,
            borderBottomWidth: isLastInSection ? 1 : 0,
            borderColor: colors.borderLight,
          },
        ]}
      >
        {/* Avatar with type badge */}
        <View style={styles.avatarWrap}>
          {actor?.avatar ? (
            <Image
              source={{ uri: actor.avatar }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Feather name="user" size={20} color={colors.iconMuted} />
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: meta.color }]}>
            <Feather name={meta.name} size={10} color="#FFFFFF" />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentWrap}>
          {item.type === 'NewMessage' ? (
            // For NewMessage, server already renders full content like
            // "A sent you 5 messages." — just show it directly
            <Text
              style={[
                styles.message,
                { color: colors.text },
                !item.isRead && styles.messageUnread,
              ]}
              numberOfLines={2}
            >
              {item.content}
            </Text>
          ) : (
            <Text
              style={[
                styles.message,
                { color: colors.text },
                !item.isRead && styles.messageUnread,
              ]}
              numberOfLines={2}
            >
              <Text style={styles.actorName}>
                {actor?.username ?? 'Someone'}
              </Text>
              <Text>{' '}</Text>
              <Text>{item.content}</Text>
            </Text>
          )}
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {formatDistanceToNow(new Date(item.createdAt))}
          </Text>
        </View>

        {/* Trailing element */}
        {item.type === 'NewFollower' ? (
          <TouchableOpacity
            style={[
              styles.followBackBtn,
              {
                backgroundColor: isFollowed
                  ? colors.surfaceElevated
                  : colors.primary,
                borderColor: isFollowed ? colors.border : 'transparent',
              },
            ]}
            onPress={() => {
              if (!isFollowed) handleFollowBack(item);
            }}
            disabled={isFollowed || isFollowPending}
            activeOpacity={0.8}
          >
            {isFollowPending ? (
              <ActivityIndicator
                size="small"
                color={isFollowed ? colors.text : '#FFFFFF'}
              />
            ) : (
              <Text
                style={[
                  styles.followBackText,
                  { color: isFollowed ? colors.text : '#FFFFFF' },
                ]}
              >
                {isFollowed ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        ) : item.type === 'PostLiked' || item.type === 'PostCommented' ? (
          <View
            style={[
              styles.thumbPlaceholder,
              { backgroundColor: colors.surfaceElevated },
            ]}
          >
            <Feather name="image" size={16} color={colors.iconMuted} />
          </View>
        ) : !item.isRead ? (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<Notification, NotificationSection>;
  }) => (
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: colors.background, borderBottomColor: colors.borderLight },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {section.title}
      </Text>
    </View>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <CompactHeader
        title="Notifications"
        showBack
        onBack={() => router.back()}
        rightAction={
          // Auto mark-all-read on open — no manual button needed
          <Feather name="check-circle" size={18} color={colors.textMuted} />
        }
      />

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SectionList<Notification, NotificationSection>
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={colors.primary}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Feather name="bell-off" size={36} color={colors.iconMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No notifications yet
              </Text>
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
  container: { flex: 1 },
  list: { paddingBottom: 100 },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // Item row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 76,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contentWrap: {
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 19,
  },
  messageUnread: {
    fontWeight: '600',
  },
  actorName: {
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
    marginTop: 3,
  },

  // Trailing elements
  followBackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  followBackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  thumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
