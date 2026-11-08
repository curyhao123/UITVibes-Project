/**
 * ModerationAppealSheet — bottom sheet để tác giả gửi khiếu nại (appeal).
 *
 * Dùng khi nội dung của tác giả bị AI từ chối và tác giả không muốn sửa nội dung
 * mà muốn nhờ admin xem xét lại. Khiếu nại KHÔNG tự đảo ngược quyết định của AI —
 * nó chỉ chuyển nội dung sang vùng chờ admin quyết định lần cuối.
 */
import { borderRadius } from "@/constants/theme";
import {
  extractApiErrorMessage,
  submitModerationAppeal,
} from "@/services/moderationAppealService";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 500;

interface Props {
  visible: boolean;
  /** Id của bản ghi kiểm duyệt (ModerationResult.Id). */
  moderationResultId: string | null;
  /** Nội dung bị từ chối (hiển thị để tác giả nhớ lại đang khiếu nại cái gì). */
  targetContent?: string | null;
  onClose: () => void;
  /** Gọi sau khi gửi khiếu nại thành công. */
  onSubmitted?: () => void;
}

export const ModerationAppealSheet: React.FC<Props> = ({
  visible,
  moderationResultId,
  targetContent,
  onClose,
  onSubmitted,
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = reason.trim();
  const canSubmit =
    trimmed.length >= MIN_REASON_LENGTH &&
    trimmed.length <= MAX_REASON_LENGTH &&
    !submitting;

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || !moderationResultId) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitModerationAppeal(moderationResultId, trimmed);
      setReason("");
      onSubmitted?.();
      onClose();
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          "Could not submit your appeal. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={handleClose}
          activeOpacity={1}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Feather name="flag" size={18} color="#8B5CF6" />
              <Text style={styles.title}>Appeal this decision</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <Feather name="x" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.description}>
              Tell us why this content should be reviewed again. A moderator will
              take a look and get back to you. Editing the content and saving it
              also works — the content will be checked again from scratch.
            </Text>

            {targetContent ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>Your content</Text>
                <Text style={styles.previewText} numberOfLines={4}>
                  {targetContent}
                </Text>
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Explain why the content was rejected by mistake…"
              placeholderTextColor="#9CA3AF"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={5}
              maxLength={MAX_REASON_LENGTH}
              editable={!submitting}
              textAlignVertical="top"
            />

            <Text style={styles.counter}>
              {trimmed.length}/{MAX_REASON_LENGTH}
              {trimmed.length > 0 && trimmed.length < MIN_REASON_LENGTH
                ? ` · at least ${MIN_REASON_LENGTH} characters`
                : ""}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit appeal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "600", color: "#111827" },
  body: { maxHeight: 420 },
  bodyContent: { padding: 20, gap: 14 },
  description: { fontSize: 13, lineHeight: 19, color: "#6B7280" },
  previewBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: borderRadius.md,
    padding: 12,
    gap: 6,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewText: { fontSize: 13, lineHeight: 18, color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 100,
    backgroundColor: "#FFFFFF",
  },
  counter: { fontSize: 11, color: "#9CA3AF", textAlign: "right" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: borderRadius.sm,
  },
  errorText: { flex: 1, fontSize: 12, color: "#EF4444" },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  cancelBtn: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  submitBtn: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});
