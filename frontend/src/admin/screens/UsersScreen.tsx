/**
 * UsersScreen — Admin view of all user profiles
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getAllUsers } from "@/services/adminService";
import type { BE_AdminUserProfile } from "@/services/backendTypes";
import { AppColors, borderRadius } from "@/constants/theme";

const UserItem: React.FC<{
  user: BE_AdminUserProfile;
  onPress: (user: BE_AdminUserProfile) => void;
}> = ({ user, onPress }) => (
  <TouchableOpacity style={styles.userItem} onPress={() => onPress(user)} activeOpacity={0.7}>
    <Image
      source={
        user.avatarUrl
          ? { uri: user.avatarUrl }
          : require("@/assets/images/UITVibesLogo.png")
      }
      style={styles.avatar}
    />
    <View style={styles.userInfo}>
      <View style={styles.nameRow}>
        <Text style={styles.displayName} numberOfLines={1}>
          {user.displayName || user.fullName || user.userId}
        </Text>
        {user.isVerified && (
          <Feather name="check-circle" size={14} color={AppColors.primary} />
        )}
      </View>
      <Text style={styles.username}>@{user.userId.slice(0, 8)}</Text>
      {user.bio ? (
        <Text style={styles.bio} numberOfLines={1}>
          {user.bio}
        </Text>
      ) : null}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>Posts {user.postsCount}</Text>
        <Text style={styles.stat}>Followers {user.followersCount}</Text>
        <Text style={styles.stat}>Following {user.followingCount}</Text>
      </View>
    </View>
    <Feather name="chevron-right" size={16} color={AppColors.textMuted} />
  </TouchableOpacity>
);

const UserDetailSheet: React.FC<{
  user: BE_AdminUserProfile;
  onClose: () => void;
}> = ({ user, onClose }) => (
  <View style={styles.sheetOverlay}>
    <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>User Details</Text>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={20} color={AppColors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.sheetBody}>
        <Image
          source={
            user.avatarUrl ? { uri: user.avatarUrl } : require("@/assets/images/UITVibesLogo.png")
          }
          style={styles.sheetAvatar}
        />
        <Text style={styles.sheetDisplayName}>{user.displayName || user.fullName}</Text>
        <Text style={styles.sheetUsername}>@{user.userId}</Text>
        {user.bio ? <Text style={styles.sheetBio}>{user.bio}</Text> : null}
        <View style={styles.sheetStats}>
          <View style={styles.sheetStatItem}>
            <Text style={styles.sheetStatValue}>{user.postsCount}</Text>
            <Text style={styles.sheetStatLabel}>Posts</Text>
          </View>
          <View style={styles.sheetStatItem}>
            <Text style={styles.sheetStatValue}>{user.followersCount}</Text>
            <Text style={styles.sheetStatLabel}>Followers</Text>
          </View>
          <View style={styles.sheetStatItem}>
            <Text style={styles.sheetStatValue}>{user.followingCount}</Text>
            <Text style={styles.sheetStatLabel}>Following</Text>
          </View>
        </View>
        <View style={styles.sheetMeta}>
          {user.location ? (
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color={AppColors.textMuted} />
              <Text style={styles.metaText}>{user.location}</Text>
            </View>
          ) : null}
          {user.website ? (
            <View style={styles.metaRow}>
              <Feather name="link" size={13} color={AppColors.textMuted} />
              <Text style={styles.metaText}>{user.website}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <Feather name="calendar" size={13} color={AppColors.textMuted} />
            <Text style={styles.metaText}>
              Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: user.isActive ? "#22C55E" : "#EF4444" }]}>
              {user.isActive ? "● Active" : "● Inactive"}
            </Text>
          </View>
        </View>
        <View style={styles.sheetActions}>
          <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnDanger]}>
            <Feather name="slash" size={15} color="#EF4444" />
            <Text style={styles.sheetBtnDangerText}>Suspend Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

export default function UsersScreen() {
  const [users, setUsers] = useState<BE_AdminUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<BE_AdminUserProfile | null>(null);

  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      const data = await getAllUsers(pageNum * PAGE_SIZE, PAGE_SIZE);
      if (isRefresh) {
        setUsers(data);
      } else {
        setUsers((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error("[AdminUsers] fetchUsers failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(0, true);
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(0);
    fetchUsers(0, true);
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setPage((p) => {
        const next = p + 1;
        fetchUsers(next, false);
        return next;
      });
    }
  };

  const renderItem = ({ item }: { item: BE_AdminUserProfile }) => (
    <UserItem user={item} onPress={setSelectedUser} />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={AppColors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users</Text>
        <Text style={styles.headerSubtitle}>{users.length} users</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={AppColors.textMuted} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {selectedUser && (
        <UserDetailSheet user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: AppColors.text, letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: AppColors.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: AppColors.textMuted },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: AppColors.border },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  displayName: { fontSize: 15, fontWeight: "600", color: AppColors.text },
  username: { fontSize: 12, color: AppColors.textMuted, marginTop: 1 },
  bio: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  stat: { fontSize: 11, color: AppColors.textMuted },
  // Sheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: AppColors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: "600", color: AppColors.text },
  sheetBody: { padding: 20, alignItems: "center" },
  sheetAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: AppColors.border, marginBottom: 12 },
  sheetDisplayName: { fontSize: 20, fontWeight: "700", color: AppColors.text },
  sheetUsername: { fontSize: 14, color: AppColors.textMuted, marginTop: 2 },
  sheetBio: { fontSize: 14, color: AppColors.textMuted, textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  sheetStats: { flexDirection: "row", gap: 28, marginTop: 16 },
  sheetStatItem: { alignItems: "center" },
  sheetStatValue: { fontSize: 17, fontWeight: "700", color: AppColors.text },
  sheetStatLabel: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },
  sheetMeta: { alignSelf: "stretch", marginTop: 16, gap: 8, paddingHorizontal: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, color: AppColors.textMuted },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 20, alignSelf: "stretch" },
  sheetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  sheetBtnDanger: { borderColor: "#FEE2E2", backgroundColor: "#FEF2F2" },
  sheetBtnDangerText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
});
