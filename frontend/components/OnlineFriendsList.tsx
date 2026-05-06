/**
 * OnlineFriendsList — horizontal scroll friend strip (Instagram Stories style)
 *
 * Design:
 *  - Horizontal scroll, Instagram Stories layout (avatar + name below)
 *  - Avatar size 64px with border ring; green dot outside for online
 *  - Name truncated to 1 line below avatar
 *  - Spring press animation on each item
 *  - Header: "Friends" + online badge + refresh icon
 *  - "Everyone is busy" italic when all friends are offline
 *  - Data from getOnlineFriends() REST API
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { Avatar } from "./Avatar";
import { AppColors } from "../constants/theme";
import { SPRING_PRESS, SPRING_SOFT } from "../animations/spring";
import { getOnlineFriends, OnlineFriendDto } from "../services/onlineTrackingService";

// ── Config ─────────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 64;
const ITEM_WIDTH = 76;
const ITEM_MARGIN = 12;
const DOT_SIZE = 14;
const DOT_OFFSET = -2;
const LAYOUT_PADDING = 16;
const TOP_PADDING = 10;

// ── Status helpers ──────────────────────────────────────────────────────────────

function getDotStyle(friend: OnlineFriendDto): {
  backgroundColor: string;
  borderColor: string;
} {
  if (friend.isOnline) return { backgroundColor: "#22c55e", borderColor: "#fff" };
  return { backgroundColor: "#9ca3af", borderColor: "#fff" };
}

// ── Friend Item ────────────────────────────────────────────────────────────────

interface FriendItemProps {
  friend: OnlineFriendDto;
  onPress: (friend: OnlineFriendDto) => void;
}

const FriendItem: React.FC<FriendItemProps> = ({ friend, onPress }) => {
  const pressScale = useSharedValue(1);

  const startPress = () => {
    pressScale.value = withSpring(0.88, SPRING_PRESS);
  };
  const endPress = () => {
    pressScale.value = withSpring(1.0, SPRING_SOFT);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const dotStyle = getDotStyle(friend);

  const user = {
    id: friend.userId,
    username: friend.displayName,
    displayName: friend.displayName,
    avatar: friend.avatarUrl ?? "",
    bio: "",
    coverImage: "",
    followers: 0,
    following: 0,
    posts: 0,
    isVerified: false,
    fullName: friend.displayName,
    gender: "other" as const,
  };

  return (
    <Pressable
      onPressIn={startPress}
      onPressOut={endPress}
      onPress={() => onPress(friend)}
    >
      <Animated.View style={[styles.item, animatedStyle]}>
        {/* Avatar + online dot outside ring */}
        <View style={styles.avatarOuter}>
          <Avatar
            user={user}
            size="story"
            showBorder={true}
            isViewed={false}
            showOnlineIndicator={false}
          />
          <View
            style={[
              styles.dot,
              dotStyle,
              {
                width: DOT_SIZE,
                height: DOT_SIZE,
                borderRadius: DOT_SIZE / 2,
                bottom: DOT_OFFSET,
                right: DOT_OFFSET,
              },
            ]}
          />
        </View>

        {/* Name below avatar */}
        <Text style={styles.itemName} numberOfLines={1}>
          {friend.displayName.split(" ")[0]}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

interface OnlineFriendsListProps {
  onFriendPress?: (friend: OnlineFriendDto) => void;
}

export const OnlineFriendsList: React.FC<OnlineFriendsListProps> = ({
  onFriendPress = () => {},
}) => {
  const [friends, setFriends] = useState<OnlineFriendDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRotation = useSharedValue(0);

  const fetchOnlineFriends = useCallback(async () => {
    refreshRotation.value = withTiming(360, { duration: 500 }, () => {
      refreshRotation.value = 0;
    });
    try {
      const data = await getOnlineFriends(0, 30);
      setFriends(data);
    } catch (err) {
      console.warn("[OnlineFriendsList] fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineFriends();
  }, [fetchOnlineFriends]);

  useEffect(() => {
    refreshTimerRef.current = setInterval(fetchOnlineFriends, 30_000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchOnlineFriends]);

  const onlineCount = friends.filter((f) => f.isOnline).length;
  const allOffline = !isLoading && friends.length > 0 && onlineCount === 0;

  const refreshAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshRotation.value}deg` }],
  }));

  if (isLoading && friends.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Friends</Text>
          {onlineCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{onlineCount} Online</Text>
            </View>
          )}
        </View>
        <Animated.View style={refreshAnimatedStyle}>
          <Pressable
            onPress={fetchOnlineFriends}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="refresh-cw" size={14} color={AppColors.iconMuted} strokeWidth={2} />
          </Pressable>
        </Animated.View>
      </View>

      {/* Horizontal scroll strip */}
      <FlatList
        horizontal
        data={friends}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <FriendItem friend={item} onPress={onFriendPress} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListFooterComponent={<View style={styles.footerSpacer} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No friends yet</Text>
          </View>
        }
      />

      {/* Everyone is busy */}
      {allOffline && (
        <View style={styles.busyBanner}>
          <Text style={styles.busyText}>Everyone is busy</Text>
        </View>
      )}
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: LAYOUT_PADDING,
    paddingTop: TOP_PADDING,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    letterSpacing: 0.1,
  },
  badge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
    letterSpacing: 0.2,
  },

  // ── Horizontal scroll ───────────────────────────────────────────────────────
  scrollContent: {
    paddingLeft: LAYOUT_PADDING - ITEM_MARGIN + ITEM_WIDTH / 2,
    paddingRight: LAYOUT_PADDING,
    paddingTop: 10,
    paddingBottom: 12,
  },
  footerSpacer: {
    width: LAYOUT_PADDING,
  },

  // ── Friend item (Stories-style column) ──────────────────────────────────────
  item: {
    width: ITEM_WIDTH,
    alignItems: "center",
    marginRight: ITEM_MARGIN,
  },
  avatarOuter: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    position: "absolute",
    borderWidth: 2,
  },
  itemName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginTop: 5,
    textAlign: "center",
    width: ITEM_WIDTH,
    letterSpacing: 0.02,
  },

  // ── Empty / Busy ────────────────────────────────────────────────────────────
  emptyContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#d1d5db",
    fontStyle: "italic",
  },
  busyBanner: {
    paddingHorizontal: LAYOUT_PADDING,
    paddingTop: 4,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  busyText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },
});
