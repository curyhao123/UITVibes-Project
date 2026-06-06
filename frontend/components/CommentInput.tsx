import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "./Avatar";
import { Comment } from "../data/mockData";
import { AppColors, layoutPadding } from "../constants/theme";
import { useApp } from "../context/AppContext";
import { MentionInput } from "./MentionInput";
import { uploadMedia } from "../services/postService";

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
    console.log("[CommentInput] handleSubmitEditing called");
    console.log("[CommentInput] - isUploadingImage:", isUploadingImage);
    console.log("[CommentInput] - pendingImageRef.current:", pendingImageRef.current);
    console.log("[CommentInput] - selectedImage:", selectedImage);
    console.log("[CommentInput] - text:", text);

    // Don't submit while an image is being uploaded
    if (isUploadingImage) {
      console.log("[CommentInput] Still uploading, ignoring submit");
      return;
    }

    // Use ref value directly to avoid race condition with setState
    const imageToSend = pendingImageRef.current ?? selectedImage;
    console.log("[CommentInput] imageToSend:", imageToSend);

    if (!trimmed && !imageToSend) {
      console.log("[CommentInput] Nothing to send, returning");
      return;
    }
    if (isSubmitting) {
      console.log("[CommentInput] Already submitting, returning");
      return;
    }

    console.log("[CommentInput] Calling onSubmit with image:", imageToSend);
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
    // Show options: Camera or Gallery
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
    console.log("[CommentInput] pickImage called, source:", source);
    try {
      const permissionResult =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      console.log("[CommentInput] Permission result:", permissionResult);

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

      console.log("[CommentInput] Picker result:", JSON.stringify(result));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        console.log("[CommentInput] Image URI:", imageUri);
        setIsUploadingImage(true);

        try {
          // Upload image to Cloudinary
          const uploadResult = await uploadMedia(imageUri, "image");
          console.log("[CommentInput] Upload success:", uploadResult.url);
          const uploadedUrl = uploadResult.url;
          setSelectedImage(uploadedUrl);
          pendingImageRef.current = uploadedUrl; // Update ref immediately
        } catch (uploadError) {
          console.error("[CommentInput] Upload failed:", uploadError);
          Alert.alert("Upload Failed", "Failed to upload image. Please try again.");
        } finally {
          setIsUploadingImage(false);
        }
      } else {
        console.log("[CommentInput] Image picker was cancelled or no assets");
      }
    } catch (error) {
      console.error("[CommentInput] Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      setIsUploadingImage(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Reply banner — only in Create Mode */}
      {!isEditMode && replyTo && (
        <View style={styles.replyBanner}>
          <Feather
            name="corner-down-left"
            size={12}
            color={AppColors.textMuted}
          />
          <View style={styles.replyBannerText}>
            Replying to{" "}
            <Text style={styles.replyBannerUsername}>
              {replyTo.user.fullName || replyTo.user.displayName}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReply}>
            <Feather name="x" size={14} color={AppColors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={handleRemoveImage}
          >
            <Feather name="x-circle" size={20} color={AppColors.text} />
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
            <View style={styles.avatarFallback} />
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
          onSubmit={handleSubmitEditing}
          style={styles.mentionInputContainer}
          inputStyle={[styles.input, styles.inputPill]}
        />

        {/* Camera button - only in Create Mode */}
        {!isEditMode && !selectedImage && (
          <TouchableOpacity
            style={styles.iconWrap}
            onPress={handleCameraPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isUploadingImage ? (
              <ActivityIndicator size="small" color={AppColors.primary} />
            ) : (
              <Feather name="camera" size={20} color={AppColors.iconMuted} />
            )}
          </TouchableOpacity>
        )}

        {/* Image upload indicator */}
        {isUploadingImage && !selectedImage && (
          <View style={styles.iconWrap}>
            <ActivityIndicator size="small" color={AppColors.primary} />
          </View>
        )}

        {/* Submit / Save button */}
        {isSubmitting ? (
          <View style={styles.iconWrap}>
            <ActivityIndicator size="small" color={AppColors.primary} />
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleSubmitEditing}
            disabled={!canSend}
            style={styles.iconWrap}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isEditMode ? (
              <Feather name="check" size={20} color={AppColors.primary} />
            ) : (
              <Feather
                name="send"
                size={20}
                color={canSend ? AppColors.primary : AppColors.iconMuted}
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
            <Feather name="x" size={20} color={AppColors.textMuted} />
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
    borderTopColor: AppColors.borderLight,
    backgroundColor: AppColors.surface,
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
    color: AppColors.textMuted,
  },
  replyBannerUsername: {
    fontWeight: "600",
    color: AppColors.text,
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
    backgroundColor: AppColors.borderLight,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: AppColors.surface,
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
    backgroundColor: AppColors.borderLight,
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
    color: AppColors.text,
  },
  inputPill: {
    backgroundColor: "#F2F2F2",
    borderRadius: 18,
  },
  iconWrap: {
    padding: 6,
    marginLeft: 4,
  },
});
