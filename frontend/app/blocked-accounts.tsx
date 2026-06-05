import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getBlockedUsers, unblockUser } from '../services/blockService';
import { getCurrentUserId } from '../services/session';
import {
  BlockedUserItem,
  BlockedAccountsSearchBar,
  BlockedAccountsEmptyState,
  UnblockConfirmModal,
} from '../components/blocked-accounts';
import type { BlockedUserItemData } from '../components/blocked-accounts';
import { CompactHeader } from '../components/StaticPremiumHeader';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { Text } from 'react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface UnblockTarget {
  item: BlockedUserItemData;
}

export default function BlockedAccountsScreen() {
  const router = useRouter();

  // ── Data ─────────────────────────────────────────────────────────
  const [allUsers, setAllUsers] = useState<BlockedUserItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // ── Search ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');

  // ── Unblock modal ───────────────────────────────────────────────
  const [unblockTarget, setUnblockTarget] = useState<UnblockTarget | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  // ── Derived: filtered list ───────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [allUsers, searchQuery]);

  // ── Load data ───────────────────────────────────────────────────
  const loadBlockedUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else if (!hasLoaded) setIsLoading(true);

    try {
      const userId = getCurrentUserId();
      const users = await getBlockedUsers(0, 100);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAllUsers(users);
      setHasLoaded(true);
    } catch (err) {
      console.error('[BlockedAccounts] load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [hasLoaded]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  // ── Pull-to-refresh ─────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    void loadBlockedUsers(true);
  }, [loadBlockedUsers]);

  // ── Unblock flow ────────────────────────────────────────────────
  const handleUnblockPress = useCallback((item: BlockedUserItemData) => {
    setUnblockTarget({ item });
  }, []);

  const handleUnblockCancel = useCallback(() => {
    setUnblockTarget(null);
  }, []);

  const handleUnblockConfirm = useCallback(async () => {
    if (!unblockTarget) return;

    const { item } = unblockTarget;
    setIsUnblocking(true);

    // Optimistic update — remove from list immediately
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAllUsers((prev) => prev.filter((u) => u.blockedId !== item.blockedId));
    setSearchQuery(''); // clear search so list is accurate

    try {
      await unblockUser(item.blockedId);
      setUnblockTarget(null);
    } catch (err) {
      // Rollback on failure
      console.error('[BlockedAccounts] unblock error:', err);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAllUsers((prev) => {
        // Re-insert in sorted position by blockedAt (newest first)
        const updated = [...prev, item].sort(
          (a, b) =>
            new Date(b.blockedAt).getTime() - new Date(a.blockedAt).getTime(),
        );
        return updated;
      });
    } finally {
      setIsUnblocking(false);
    }
  }, [unblockTarget]);

  // ── Render item ─────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: BlockedUserItemData; index: number }) => (
      <View key={item.blockedId}>
        <BlockedUserItem
          item={item}
          onUnblock={handleUnblockPress}
          isUnblocking={unblockTarget?.item.blockedId === item.blockedId && isUnblocking}
          isLast={index === filteredUsers.length - 1}
        />
      </View>
    ),
    [handleUnblockPress, unblockTarget, isUnblocking, filteredUsers.length],
  );

  const keyExtractor = useCallback((item: BlockedUserItemData) => item.blockedId, []);

  // ── List header: subtitle ───────────────────────────────────────
  const ListHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <Text style={styles.subtitle}>
          Accounts you blocked won't be able to message, follow, or interact
          with you.
        </Text>
      </View>
    ),
    [],
  );

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <CompactHeader title="Blocked Accounts" showBack onBack={() => router.back()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <CompactHeader title="Blocked Accounts" showBack onBack={() => router.back()} />

      {/* Search bar */}
      <BlockedAccountsSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          filteredUsers.length === 0 ? styles.emptyList : styles.list
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<BlockedAccountsEmptyState />}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      {/* Unblock confirmation modal */}
      {unblockTarget && (
        <UnblockConfirmModal
          visible
          username={unblockTarget.item.username}
          displayName={unblockTarget.item.displayName}
          avatarUrl={unblockTarget.item.avatarUrl}
          onCancel={handleUnblockCancel}
          onUnblock={handleUnblockConfirm}
          isLoading={isUnblocking}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeader: {
    paddingHorizontal: layoutPadding,
    paddingTop: 8,
    paddingBottom: 16,
  },
  subtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    lineHeight: 22,
  },
  list: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
});
