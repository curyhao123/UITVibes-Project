import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Avatar } from "../../components/Avatar";
import { CompactHeader } from "../../components/StaticPremiumHeader";
import { getPostLikes } from "../../services/postService";
import { BE_LikeDto } from "../../services/backendTypes";
import { type ThemeColors } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useOpenProfile } from "../../hooks/useOpenProfile";

export default function PostLikesScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const openProfile = useOpenProfile();
  const { colors } = useTheme();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [likes, setLikes] = useState<BE_LikeDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    loadLikes();
  }, [postId]);

  const loadLikes = async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const data = await getPostLikes(postId);
      setLikes(data);
    } catch (err) {
      console.error("[PostLikesScreen] loadLikes error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (userId: string) => {
    openProfile(userId);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString("en-US");
  };

  const renderItem = ({ item }: { item: BE_LikeDto }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => handleUserPress(item.userId)}
      activeOpacity={0.7}
    >
      <Avatar
        user={{
          id: item.userId,
          username: item.displayName,
          displayName: item.displayName,
          fullName: item.displayName,
          avatar: item.avatarUrl,
          coverImage: "",
          bio: "",
          gender: "",
          followers: 0,
          following: 0,
          posts: 0,
          isVerified: false,
        }}
        size="medium"
      />
      <View style={styles.info}>
        <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={[styles.timeAgo, { color: colors.iconMuted }]}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => <CompactHeader title="Likes" showBack onBack={() => router.back()} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : likes.length === 0 ? (
        <View style={styles.center}>
          <Feather name="heart" size={48} color={colors.iconMuted} />
          <Text style={[styles.emptyText, { color: colors.iconMuted }]}>No likes yet</Text>
        </View>
      ) : (
        <FlatList
          data={likes}
          keyExtractor={(item) => item.likeId}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: colors.iconMuted,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  info: {
    flex: 1,
  },
  displayName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  timeAgo: {
    color: colors.iconMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
