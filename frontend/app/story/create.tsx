/**
 * Story creation screen.
 *
 * Flow:
 * 1. Pick image(s) or video(s) from library
 * 2. Preview selected media
 * 3. Share → POST /post/story (multipart) → BE uploads to Cloudinary
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useApp } from "../../context/AppContext";
import { createStory } from "../../services/storyService";
import { AppColors, borderRadius, layoutPadding } from "../../constants/theme";
import { Typography } from "../../constants/typography";
import { Avatar } from "../../components/Avatar";

interface SelectedMedia {
  uri: string;
  type: "image" | "video";
}

export default function CreateStoryScreen() {
  const router = useRouter();
  const { currentUser, refreshStories } = useApp();
  const [selectedMedias, setSelectedMedias] = useState<SelectedMedia[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const pickImage = async () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedMedias((prev) => [
        ...prev,
        { uri: result.assets[0].uri, type: "image" },
      ]);
    }
  };

  const pickVideo = async () => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedMedias((prev) => [
        ...prev,
        { uri: result.assets[0].uri, type: "video" },
      ]);
    }
  };

  const removeMedia = (index: number) => {
    setSelectedMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleShare = async () => {
    if (selectedMedias.length === 0) {
      Alert.alert("Select media", "Choose a photo or video for your story.");
      return;
    }

    setIsPosting(true);
    try {
      const story = await createStory(selectedMedias);

      if (story) {
        await refreshStories();

        if (Platform.OS !== "web") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setSelectedMedias([]);
        router.replace("/(tabs)/home" as any);
      } else {
        Alert.alert("Error", "Failed to share story. Please try again.");
      }
    } catch {
      Alert.alert("Error", "An error occurred while sharing your story.");
    } finally {
      setIsPosting(false);
    }
  };

  const canShare = selectedMedias.length > 0 && !isPosting;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeBtn}
          activeOpacity={0.7}
          disabled={isPosting}
        >
          <Feather name="x" size={24} color={AppColors.text} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>New Story</Text>

        <TouchableOpacity
          onPress={handleShare}
          disabled={!canShare}
          style={styles.shareBtn}
          activeOpacity={0.7}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color={AppColors.primary} />
          ) : (
            <Text style={[styles.shareLabel, !canShare && styles.shareLabelDisabled]}>
              Share
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User avatar */}
        <View style={styles.userRow}>
          {currentUser ? (
            <Avatar user={currentUser} size="small" />
          ) : (
            <View style={styles.avatarFallback}>
              <Feather name="user" size={18} color={AppColors.iconMuted} />
            </View>
          )}
          <Text style={styles.userName}>{currentUser?.displayName || "Your story"}</Text>
        </View>

        {/* Preview */}
        {selectedMedias.length > 0 ? (
          <Animated.View
            key="preview-grid"
            entering={FadeIn.duration(260)}
            exiting={FadeOut.duration(160)}
            style={styles.previewGrid}
          >
            {selectedMedias.map((media, index) => (
              <View key={`${media.uri}-${index}`} style={styles.previewItem}>
                <Image
                  source={{ uri: media.uri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                {media.type === "video" && (
                  <View style={styles.videoBadge}>
                    <Feather name="video" size={14} color="#FFF" strokeWidth={2} />
                    <Text style={styles.videoBadgeText}>Video</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeMedia(index)}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={16} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        ) : (
          <Animated.View
            key="empty-state"
            entering={FadeIn.duration(260)}
            exiting={FadeOut.duration(160)}
            style={styles.emptyState}
          >
            <View style={styles.emptyIconRing}>
              <Feather name="camera" size={36} color={AppColors.iconMuted} strokeWidth={1.6} />
            </View>
            <Text style={styles.emptyTitle}>Create a story</Text>
            <Text style={styles.emptySubtitle}>
              Stories disappear after 24 hours
            </Text>
          </Animated.View>
        )}

        {/* Pick media buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={pickImage}
            activeOpacity={0.8}
            disabled={isPosting}
          >
            <Feather name="image" size={20} color={AppColors.text} strokeWidth={2} />
            <Text style={styles.actionBtnText}>Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={pickVideo}
            activeOpacity={0.8}
            disabled={isPosting}
          >
            <Feather name="video" size={20} color={AppColors.text} strokeWidth={2} />
            <Text style={styles.actionBtnText}>Video</Text>
          </TouchableOpacity>
        </View>

        {selectedMedias.length > 0 && (
          <Text style={styles.hint}>
            {selectedMedias.length} item(s) selected — tap to add more
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...Typography.screenTitle,
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    color: AppColors.text,
  },
  shareBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  shareLabel: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.primary,
  },
  shareLabelDisabled: {
    color: AppColors.iconMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layoutPadding,
    paddingVertical: 16,
    gap: 12,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    ...Typography.bodyMedium,
    color: AppColors.text,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: layoutPadding,
    gap: 8,
  },
  previewItem: {
    width: "48%",
    aspectRatio: 9 / 16,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    backgroundColor: AppColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...Typography.caption,
    color: AppColors.iconMuted,
  },
  actionsSection: {
    flexDirection: "row",
    paddingHorizontal: layoutPadding,
    gap: 12,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
  },
  actionBtnText: {
    ...Typography.bodyMedium,
    color: AppColors.text,
  },
  hint: {
    ...Typography.meta,
    color: AppColors.iconMuted,
    textAlign: "center",
    marginTop: 12,
  },
});
