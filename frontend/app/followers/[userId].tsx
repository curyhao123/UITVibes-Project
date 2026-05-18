import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useApp } from "../../context/AppContext";
import { User } from "../../data/mockData";
import {
  getFollowers,
  getFollowing,
  toggleFollow,
  getUserById,
  isFollowing,
} from "../../services/api";
import { AppColors } from "../../constants/theme";
import { ScreenHeader } from "../../components/ScreenHeader";
import defaultAvatar from "../../assets/images/default-avatar.png";

export default function FollowersScreen() {
  const router = useRouter();
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
      style={styles.userItem}
      onPress={() => router.push(`/profile/${item.id}` as any)}
    >
      <Image
        source={item.avatar ? { uri: item.avatar } : defaultAvatar}
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.displayName}
          </Text>
          {item.isVerified && (
            <Feather
              name="check-circle"
              size={14}
              color={AppColors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
        <Text style={styles.username} numberOfLines={1}>
          @{item.username}
        </Text>
        <Text style={styles.bio} numberOfLines={1}>
          {item.bio}
        </Text>
      </View>
      {item.id !== "current" && (
        <TouchableOpacity
          style={[
            styles.followBtn,
            !!item.isFollowing && styles.followBtnFollowing,
          ]}
          onPress={() => handleFollowToggle(item.id, !!item.isFollowing)}
        >
          <Text
            style={[
              styles.followBtnText,
              !!item.isFollowing && styles.followBtnTextFollowing,
            ]}
          >
            {!!item.isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title={profileDisplayName || "Followers"}
        onBack={() => router.back()}
      />

      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[
            styles.switchTab,
            filter === "followers" && styles.switchTabActive,
          ]}
          onPress={() => setFilter("followers")}
        >
          <Text
            style={[
              styles.switchTabText,
              filter === "followers" && styles.switchTabTextActive,
            ]}
          >
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switchTab,
            filter === "following" && styles.switchTabActive,
          ]}
          onPress={() => setFilter("following")}
        >
          <Text
            style={[
              styles.switchTabText,
              filter === "following" && styles.switchTabTextActive,
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
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
              <Feather name="users" size={40} color={AppColors.textMuted} />
              <Text style={styles.emptyTitle}>No {filter} yet</Text>
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
    backgroundColor: AppColors.background,
  },
  tabSwitcher: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  switchTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  switchTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: AppColors.primary,
  },
  switchTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textMuted,
  },
  switchTabTextActive: {
    color: AppColors.primary,
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
    borderBottomColor: AppColors.borderLight,
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
    color: AppColors.text,
  },
  username: {
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 1,
  },
  bio: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followBtnFollowing: {
    backgroundColor: AppColors.border,
  },
  followBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  followBtnTextFollowing: {
    color: AppColors.text,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textMuted,
    marginTop: 16,
  },
});
