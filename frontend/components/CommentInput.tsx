import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Avatar } from "./Avatar";
import { Comment } from "../data/mockData";
import { AppColors } from "../constants/theme";
import { useApp } from "../context/AppContext";

interface CommentInputProps {
  /** Comment being edited; null means Create Mode */
  editingComment?: Comment | null;
  /** Currently replying to (Create Mode only) */
  replyTo?: Comment | null;
  onSubmit: (text: string) => void;
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

  // Populate text when editingComment changes
  useEffect(() => {
    if (editingComment) {
      setText(editingComment.text);
    }
  }, [editingComment?.id]);

  // Auto-focus when entering edit mode
  const inputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (isEditMode) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isEditMode]);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0;

  const handleSubmitEditing = () => {
    if (!canSend || isSubmitting) return;
    onSubmit(trimmed);
    setText("");
  };

  const handleCancel = () => {
    setText("");
    if (isEditMode) {
      onCancelEdit();
    } else {
      onCancelReply();
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

        <TextInput
          ref={inputRef}
          style={[styles.input, styles.inputPill]}
          placeholder={
            isEditMode
              ? "Edit your comment..."
              : replyTo
              ? `Reply to ${replyTo.user.fullName || replyTo.user.displayName}...`
              : "Add a comment..."
          }
          placeholderTextColor={AppColors.iconMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          autoCapitalize="none"
          autoCorrect={false}
          key={editingComment?.id} // remount to reset focus state per comment
        />

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
  input: {
    flex: 1,
    height: 36,
    paddingVertical: 8,
    fontSize: 14,
    color: AppColors.text,
  },
  inputPill: {
    backgroundColor: "#F2F2F2",
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  iconWrap: {
    padding: 6,
    marginLeft: 4,
  },
});
