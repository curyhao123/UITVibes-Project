import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import { Comment } from "../data/mockData";
import { uploadMedia } from "../services/postService";
import { Avatar } from "./Avatar";
import { MentionInput } from "./MentionInput";

interface CommentInputProps {
  /** Comment being edited; null means Create Mode */
  editingComment?: Comment | null;
  /** Currently replying to (Create Mode only) */
  replyTo?: Comment | null;
  onSubmit: (text: string, imageUrl?: string) => void;
  onCancelEdit: () => void;
  onCancelReply: () => void;
  isSubmitting?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  editingComment,
  replyTo,
  onSubmit,
  onCancelEdit,
  onCancelReply,
  isSubmitting = false,
}) => {
  const { colors, isDark } = useTheme();
  const { currentUser } = useApp();
  const isEditMode = editingComment != null;

  const [text, setText] = useState(editingComment?.text ?? "");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Use ref to track pending upload so handleSubmit can access latest value
  const pendingImageRef = useRef<string | null>(null);

  // Populate text when editingComment changes
  useEffect(() => {
    if (editingComment) {
      setText(editingComment.text);
    }
  }, [editingComment?.id]);

  // Reset image when component mounts or editing comment changes
  useEffect(() => {
    if (editingComment?.image) {
      setSelectedImage(editingComment.image);
    } else {
      setSelectedImage(null);
    }
  }, [editingComment?.id]);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 || selectedImage !== null || pendingImageRef.current !== null;

  const handleSubmitEditing = () => {
    // Don't submit while an image is being uploaded
    if (isUploadingImage) {
      return;
    }

    const imageToSend = pendingImageRef.current ?? selectedImage;
    if (!trimmed && !imageToSend) {
      return;
    }
    if (isSubmitting) {
      return;
    }

    onSubmit(trimmed, imageToSend ?? undefined);
    setText("");
    setSelectedImage(null);
    pendingImageRef.current = null;
  };

  const handleCancel = () => {
    setText("");
    setSelectedImage(null);
    if (isEditMode) {
      onCancelEdit();
    } else {
      onCancelReply();
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleCameraPress = async () => {
    Alert.alert(
      "Add Image",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: () => pickImage("camera"),
        },
        {
          text: "Choose from Gallery",
          onPress: () => pickImage("gallery"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const pickImage = async (source: "camera" | "gallery") => {
    try {
      const permissionResult =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          `Please allow access to ${source === "camera" ? "camera" : "photo library"} to continue.`
        );
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              quality: 0.8,
              aspect: [1, 1],
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              quality: 0.8,
              aspect: [1, 1],
            });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setIsUploadingImage(true);

        try {
          const uploadResult = await uploadMedia(imageUri, "image");
          const uploadedUrl = uploadResult.url;
          setSelectedImage(uploadedUrl);
          pendingImageRef.current = uploadedUrl;
        } catch (uploadError) {
          console.error("[CommentInput] Upload failed:", uploadError);
          Alert.alert("Upload Failed", "Failed to upload image. Please try again.");
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch (error) {
      console.error("[CommentInput] Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      setIsUploadingImage(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
      {/* Reply banner — only in Create Mode */}
      {!isEditMode && replyTo && (
        <View style={styles.replyBanner}>
          <Feather
            name="corner-down-left"
            size={12}
            color={colors.textMuted}
          />
          <Text style={[styles.replyBannerText, { color: colors.textMuted }]}>
            Replying to{" "}
            <Text style={[styles.replyBannerUsername, { color: colors.text }]}>
              {replyTo.user.fullName || replyTo.user.displayName}
            </Text>
          </Text>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReply}>
            <Feather name="x" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={[styles.imagePreview, { backgroundColor: colors.borderLight }]} />
          <TouchableOpacity
            style={[styles.removeImageButton, { backgroundColor: colors.surface }]}
            onPress={handleRemoveImage}
          >
            <Feather name="x-circle" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {currentUser ? (
            <Avatar user={currentUser} size="tiny" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.borderLight }]} />
          )}
        </View>

        <MentionInput
          value={text}
          onChangeText={setText}
          placeholder={
            isEditMode
              ? "Edit your comment..."
              : replyTo
              ? `Reply to ${replyTo.user.fullName || replyTo.user.displayName}...`
              : "Add a comment..."
          }
          placeholderTextColor={colors.textMuted}
          onSubmit={handleSubmitEditing}
          style={styles.mentionInputContainer}
          inputStyle={[styles.input, { backgroundColor: isDark ? colors.surfaceElevated : '#F2F2F2', color: colors.text }]}
        />

        {/* Camera button - only in Create Mode */}
        {!isEditMode && !selectedImage && (
          <TouchableOpacity
            style={styles.iconWrap}
            onPress={handleCameraPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isUploadingImage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="camera" size={20} color={colors.iconMuted} />
            )}
          </TouchableOpacity>
        )}

        {/* Image upload indicator */}
        {isUploadingImage && !selectedImage && (
          <View style={styles.iconWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* Submit / Save button */}
        {isSubmitting ? (
          <View style={styles.iconWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleSubmitEditing}
            disabled={!canSend}
            style={styles.iconWrap}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isEditMode ? (
              <Feather name="check" size={20} color={colors.primary} />
            ) : (
              <Feather
                name="send"
                size={20}
                color={canSend ? colors.primary : colors.iconMuted}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Cancel button — only in Edit Mode */}
        {isEditMode && (
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.iconWrap}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 8,
    gap: 5,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 12,
  },
  replyBannerUsername: {
    fontWeight: "600",
  },
  cancelReply: {
    padding: 2,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 10,
    marginLeft: 38,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  mentionInputContainer: {
    flex: 1,
  },
  input: {
    flex: 1,
    height: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    borderRadius: 18,
  },
  iconWrap: {
    padding: 6,
    marginLeft: 4,
  },
});
