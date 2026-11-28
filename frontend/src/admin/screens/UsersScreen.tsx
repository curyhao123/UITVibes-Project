/**
 * UsersScreen — Admin view of all user profiles
 */
import { borderRadius, type ThemeColors } from "@/constants/theme";
import { banUser, getAllUsers, unbanUser } from "@/services/adminService";
import type { BE_AdminUserProfile } from "@/services/backendTypes";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../hooks/useThemedStyles';

const UserItem: React.FC<{
  user: BE_AdminUserProfile;
  onPress: (user: BE_AdminUserProfile) => void;
}> = ({ user, onPress }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
  <TouchableOpacity style={styles.userItem} onPress={() => onPress(user)} activeOpacity={0.7}>
    <View style={styles.avatarWrapper}>
      <Image
        source={
          user.avatarUrl
            ? { uri: user.avatarUrl }
            : require("@/assets/images/UITVibesLogo.png")
        }
        style={[styles.avatar, user.isBanned && styles.avatarBanned]}
      />
      {user.isBanned && (
        <View style={styles.bannedBadge}>
          <Feather name="slash" size={10} color="#fff" />
        </View>
      )}
    </View>
    <View style={styles.userInfo}>
      <Text style={styles.username}>@{user.displayName || user.userId.slice(0, 8)}</Text>
      <View style={styles.nameRow}>
        <Text style={[styles.displayName, user.isBanned && styles.textBanned]} numberOfLines={1}>
          {user.fullName || user.displayName || user.userId}
        </Text>
        {user.isVerified && (
          <Feather name="check-circle" size={14} color={colors.primary} />
        )}
      </View>
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
    <View style={styles.chevronContainer}>
      {user.isBanned && (
        <View style={styles.bannedIndicator}>
          <Text style={styles.bannedIndicatorText}>Banned</Text>
        </View>
      )}
      <Feather name="chevron-right" size={16} color={colors.textMuted} />
    </View>
  </TouchableOpacity>
);
};

interface UserDetailSheetProps {
  user: BE_AdminUserProfile;
  onClose: () => void;
  onBanToggle: (userId: string, ban: boolean) => void;
  onBanToggleComplete: (userId: string, newIsBanned: boolean) => void;
}

const UserDetailSheet: React.FC<UserDetailSheetProps> = ({ user, onClose, onBanToggle, onBanToggleComplete }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isLoading, setIsLoading] = useState(false);

  const handleBanToggle = async () => {
    console.log("[BanToggle] Clicked, isBanned:", user.isBanned);
    const action = user.isBanned ? "unban" : "ban";
    Alert.alert(
      user.isBanned ? "Unban User" : "Ban User",
      user.isBanned
        ? `Are you sure you want to unban ${user.displayName || user.fullName || "this user"}? They will be able to login again.`
        : `Are you sure you want to ban ${user.displayName || user.fullName || "this user"}? They will not be able to login until unbanned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: user.isBanned ? "Unban" : "Ban",
          style: user.isBanned ? "default" : "destructive",
          onPress: async () => {
            console.log("[BanToggle] Confirmed, calling API...");
            setIsLoading(true);
            try {
              await onBanToggle(user.userId, !user.isBanned);
              console.log("[BanToggle] API success, closing sheet");
              onBanToggleComplete(user.userId, !user.isBanned);
            } catch (err) {
              console.error("[BanToggle] API error:", err);
              Alert.alert("Error", `Failed to ${action} user. Please try again.`);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.sheetOverlay}>
      <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>User Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetBody} contentContainerStyle={styles.sheetBodyContent} showsVerticalScrollIndicator={true}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                user.avatarUrl ? { uri: user.avatarUrl } : require("@/assets/images/UITVibesLogo.png")
              }
              style={[styles.sheetAvatar, user.isBanned && styles.avatarBanned]}
            />
            {user.isBanned && (
              <View style={styles.bannedOverlay}>
                <Feather name="slash" size={28} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.sheetDisplayName}>
            {user.fullName || user.displayName || user.userId}
          </Text>
          <Text style={styles.sheetUsername}>@{user.displayName || user.userId}</Text>

          {user.isBanned && (
            <View style={styles.bannedTag}>
              <Feather name="slash" size={12} color="#EF4444" />
              <Text style={styles.bannedTagText}>Banned</Text>
            </View>
          )}

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
                <Feather name="map-pin" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>{user.location}</Text>
              </View>
            ) : null}
            {user.website ? (
              <View style={styles.metaRow}>
                <Feather name="link" size={13} color={colors.textMuted} />
                <Text style={styles.metaText}>{user.website}</Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Feather name="calendar" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>
                Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: user.isActive ? "#22C55E" : "#EF4444" },
                ]}
              />
              <Text style={styles.metaText}>
                {user.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[
                styles.sheetBtn,
                user.isBanned ? styles.sheetBtnSuccess : styles.sheetBtnDanger,
              ]}
              onPress={handleBanToggle}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={user.isBanned ? "#22C55E" : "#EF4444"} />
              ) : (
                <>
                  <Feather
                    name={user.isBanned ? "check-circle" : "slash"}
                    size={15}
                    color={user.isBanned ? "#22C55E" : "#EF4444"}
                  />
                  <Text
                    style={[
                      styles.sheetBtnText,
                      user.isBanned ? styles.sheetBtnSuccessText : styles.sheetBtnDangerText,
                    ]}
                  >
                    {user.isBanned ? "Unban Account" : "Ban Account"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default function UsersScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [users, setUsers] = useState<BE_AdminUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState<BE_AdminUserProfile | null>(null);
  const usersRef = useRef<BE_AdminUserProfile[]>([]);

  const PAGE_SIZE = 20;

  const fetchUsers = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      const data = await getAllUsers(pageNum * PAGE_SIZE, PAGE_SIZE);
      if (isRefresh) {
        setUsers(data);
        usersRef.current = data;
      } else {
        setUsers((prev) => {
          const newData = [...prev, ...data];
          usersRef.current = newData;
          return newData;
        });
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

  // Keep selectedUser in sync with the latest data when it's open
  useEffect(() => {
    if (selectedUser) {
      const latestUser = usersRef.current.find((u) => u.userId === selectedUser.userId);
      if (latestUser && latestUser.isBanned !== selectedUser.isBanned) {
        setSelectedUser(latestUser);
      }
    }
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleBanToggle = async (userId: string, ban: boolean) => {
    try {
      if (ban) {
        await banUser(userId);
      } else {
        await unbanUser(userId);
      }
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, isBanned: ban } : u))
      );
      // Refresh to get latest data
      await fetchUsers(0, true);
    } catch (err) {
      console.error("[AdminUsers] handleBanToggle failed:", err);
      throw err;
    }
  };

  const renderItem = ({ item }: { item: BE_AdminUserProfile }) => (
    <UserItem user={item} onPress={(user) => {
      // Get the latest user data from usersRef to ensure isBanned is up to date
      const latestUser = usersRef.current.find((u) => u.userId === user.userId) || user;
      setSelectedUser(latestUser);
    }} />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      {selectedUser && (
        <UserDetailSheet
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBanToggle={handleBanToggle}
          onBanToggleComplete={(userId: string, newIsBanned: boolean) => {
            // Update users list
            setUsers((prev) =>
              prev.map((u) => (u.userId === userId ? { ...u, isBanned: newIsBanned } : u))
            );
            // Update usersRef
            usersRef.current = usersRef.current.map((u) =>
              u.userId === userId ? { ...u, isBanned: newIsBanned } : u
            );
            // Close sheet
            setSelectedUser(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.text, letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.textMuted },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  avatarWrapper: { position: "relative" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  avatarBanned: { opacity: 0.5 },
  bannedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  displayName: { fontSize: 15, fontWeight: "600", color: colors.text },
  textBanned: { color: "#EF4444" },
  username: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  bio: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  stat: { fontSize: 11, color: colors.textMuted },
  chevronContainer: { alignItems: "center", gap: 4 },
  bannedIndicator: {
    backgroundColor: `${colors.error}1F`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bannedIndicatorText: { fontSize: 10, color: "#EF4444", fontWeight: "600" },
  // Sheet
  sheetOverlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: "92%",
    flex: 1,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
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
    borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  sheetBody: { flex: 1 },
  sheetBodyContent: { padding: 20, alignItems: "center", paddingBottom: 40 },
  avatarContainer: { position: "relative" },
  sheetAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border, marginBottom: 12 },
  bannedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 12,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetDisplayName: { fontSize: 20, fontWeight: "700", color: colors.text },
  sheetUsername: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  bannedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.error}1F`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  bannedTagText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  sheetBio: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  sheetStats: { flexDirection: "row", gap: 28, marginTop: 16 },
  sheetStatItem: { alignItems: "center" },
  sheetStatValue: { fontSize: 17, fontWeight: "700", color: colors.text },
  sheetStatLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sheetMeta: { alignSelf: "stretch", marginTop: 16, gap: 8, paddingHorizontal: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, color: colors.textMuted },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 20, alignSelf: "stretch", paddingVertical: 10 },
  sheetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  sheetBtnDanger: { borderColor: `${colors.error}40`, backgroundColor: `${colors.error}14` },
  sheetBtnDangerText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
  sheetBtnSuccess: { borderColor: `${colors.success}40`, backgroundColor: `${colors.success}14` },
  sheetBtnSuccessText: { fontSize: 14, fontWeight: "600", color: "#22C55E" },
  sheetBtnText: { fontSize: 14, fontWeight: "600" },
});
