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
import { AppColors } from "../../constants/theme";

export default function PostLikesScreen() {
  const router = useRouter();
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
    router.push(`/profile/${userId}` as any);
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
          avatar: item.avatarUrl,
          bio: "",
          followers: 0,
          following: 0,
          posts: 0,
          isVerified: false,
        }}
        size="medium"
      />
      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => <CompactHeader title="Likes" showBack onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} />
        </View>
      ) : likes.length === 0 ? (
        <View style={styles.center}>
          <Feather name="heart" size={48} color={AppColors.iconMuted} />
          <Text style={styles.emptyText}>No likes yet</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    color: AppColors.iconMuted,
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
    color: AppColors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  timeAgo: {
    color: AppColors.iconMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
