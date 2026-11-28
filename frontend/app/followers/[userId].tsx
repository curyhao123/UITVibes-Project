import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import defaultAvatar from "../../assets/images/default-avatar.png";
import { CompactHeader } from "../../components/StaticPremiumHeader";
import { type ThemeColors } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import { User } from "../../data/mockData";
import {
  getFollowers,
  getFollowing,
  getUserById,
  isFollowing
} from "../../services/api";
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useOpenProfile } from "../../hooks/useOpenProfile";

export default function FollowersScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const openProfile = useOpenProfile();
  const { colors } = useTheme();
  const { userId, tab } = useLocalSearchParams<{
    userId: string;
    tab?: string;
  }>();
  const { toggleFollow, currentUser } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"followers" | "following">("followers");
  const [profileDisplayName, setProfileDisplayName] = useState("");

  useEffect(() => {
    if (tab === "following") {
      setFilter("following");
    } else if (tab === "followers") {
      setFilter("followers");
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [userId, filter]);

  useEffect(() => {
    const loadProfileInfo = async () => {
      const targetId = userId || "current";
      if (targetId === "current") {
        setProfileDisplayName(currentUser?.displayName || currentUser?.username || "Me");
        return;
      }
      try {
        const profile = await getUserById(targetId);
        if (profile) {
          setProfileDisplayName(profile.displayName || targetId);
        }
      } catch {
        setProfileDisplayName(targetId);
      }
    };
    void loadProfileInfo();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const id = userId || "current";
      const data =
        filter === "followers"
          ? await getFollowers(id)
          : await getFollowing(id);

      // Enrich each user with isFollowing from API
      const enriched = await Promise.all(
        data.map(async (u) => ({
          ...u,
          isFollowing: (await isFollowing(u.id)) ?? (filter === "following"),
        })),
      );
      setUsers(enriched);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (
    targetUserId: string,
    isFollowing: boolean,
  ) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUserId
          ? { ...u, isFollowing: !isFollowing, followers: isFollowing ? Math.max(0, u.followers - 1) : u.followers + 1 }
          : u,
      ),
    );

    await toggleFollow(targetUserId);
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[styles.userItem, { borderBottomColor: colors.border }]}
      onPress={() => openProfile(item.id)}
    >
      <Image
        source={item.avatar ? { uri: item.avatar } : defaultAvatar}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
            {item.displayName}
          </Text>
          {item.isVerified && (
            <Feather
              name="check-circle"
              size={14}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
        <Text style={[styles.username, { color: colors.textMuted }]} numberOfLines={1}>
          @{item.username}
        </Text>
        <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.bio}
        </Text>
      </View>
      {item.id !== currentUser?.id && (
        <TouchableOpacity
          style={[
            styles.followBtn,
            {
              backgroundColor: item.isFollowing ? colors.surfaceElevated : colors.primary,
              borderWidth: item.isFollowing ? 1 : 0,
              borderColor: colors.border,
            },
          ]}
          onPress={() => handleFollowToggle(item.id, !!item.isFollowing)}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: item.isFollowing ? colors.text : "#FFFFFF" },
            ]}
          >
            {!!item.isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <CompactHeader
        title={profileDisplayName || "Followers"}
        showBack
        onBack={() => router.back()}
      />

      <View style={[styles.tabSwitcher, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.switchTab,
            filter === "followers" && { borderBottomWidth: 2, borderBottomColor: colors.primary },
          ]}
          onPress={() => setFilter("followers")}
        >
          <Text
            style={[
              styles.switchTabText,
              { color: filter === "followers" ? colors.primary : colors.textMuted },
            ]}
          >
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchTab,
            filter === "following" && { borderBottomWidth: 2, borderBottomColor: colors.primary },
          ]}
          onPress={() => setFilter("following")}
        >
          <Text
            style={[
              styles.switchTabText,
              { color: filter === "following" ? colors.primary : colors.textMuted },
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={40} color={colors.iconMuted} />
              <Text style={[styles.emptyTitle, { color: colors.iconMuted }]}>No {filter} yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabSwitcher: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  switchTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  switchTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
  },
  switchTabTextActive: {
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingBottom: 100,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  displayName: {
    fontWeight: "600",
    fontSize: 15,
    color: colors.text,
  },
  username: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  bio: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followBtnFollowing: {
    backgroundColor: colors.border,
  },
  followBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  followBtnTextFollowing: {
    color: colors.text,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: 16,
  },
});
