/**
 * EditPostSheet — bottom sheet cho phép tác giả sửa nội dung bài đã đăng.
 *
 * Luồng nghiệp vụ:
 *   1. Tác giả mở sheet (từ menu "More Options" của bài, hoặc từ badge
 *      "Post was rejected" → "Edit & resubmit").
 *   2. Sửa caption, bấm "Save".
 *   3. Backend tự đưa bài về trạng thái "Pending" và gửi lại vào hàng đợi
 *      kiểm duyệt của AI. Bài tạm ẩn với người khác cho tới khi có quyết định mới.
 *
 * Sheet dùng chung cho bài viết và reel → contentType quyết định cách ghi
 * nhãn ("Edit post" / "Edit reel", "your post" / "your reel").
 *
 * Design: dùng chung pattern animation với ReportPostSheet / PostActionsSheet.
 */
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useTheme } from '../context/ThemeContext';

const MAX_CONTENT_LENGTH = 5000;

/** Loại nội dung đang sửa — quyết định cách ghi nhãn trong sheet. */
type EditContentType = 'post' | 'reel';

const CONTENT_LABEL: Record<EditContentType, { title: string; noun: string }> = {
  post: { title: 'Edit post', noun: 'post' },
  reel: { title: 'Edit reel', noun: 'reel' },
};

interface EditPostSheetProps {
  visible: boolean;
  /** Nội dung hiện tại của bài. */
  initialContent: string;
  /** Trạng thái kiểm duyệt hiện tại — dùng để đổi nội dung nhắc nhở. */
  moderationStatus?: string;
  /** Loại nội dung — "post" (mặc định) hoặc "reel". */
  contentType?: EditContentType;
  /** Được gọi khi lưu thành công. Bên trong sẽ gọi API update post. */
  onSave: (content: string) => Promise<void>;
  /** Được gọi khi đóng sheet. */
  onClose: () => void;
}

export function EditPostSheet({
  visible,
  initialContent,
  moderationStatus,
  contentType = 'post',
  onSave,
  onClose,
}: EditPostSheetProps) {
  const { colors, isDark } = useTheme();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const label = CONTENT_LABEL[contentType];

  // Local state so animation out completes before React unmounts the Modal.
  const [isRendered, setIsRendered] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  const wasRejected = moderationStatus === 'Rejected';

  // Reset form state whenever the sheet is closed
  useEffect(() => {
    if (!visible) {
      setContent(initialContent);
      setIsSaving(false);
    }
  }, [visible, initialContent]);

  // Mount animation
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 280,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Cleanup: if not visible but still rendered, animate out then unmount
  useEffect(() => {
    if (!visible && isRendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 400,
          damping: 30,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setIsRendered(false));
    }
  }, [visible, isRendered]);

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSaving) return;
    if (trimmed === initialContent.trim()) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } catch {
      // Parent hiển thị thông báo lỗi; chỉ cần gỡ trạng thái loading.
      setIsSaving(false);
    }
  };

  // Don't render anything while closing animation finishes
  if (!isRendered) return null;

  const sheetBackground = isDark
    ? colors.surface
    : Platform.OS === 'ios'
      ? 'rgba(255,255,255,0.96)'
      : colors.surfaceElevated;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]} />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: sheetBackground,
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Swipe handle */}
          <View style={[styles.swipeHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={20} color={colors.textMuted} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{label.title}</Text>
            <View style={styles.closeBtn} />
          </View>

          {/* Notice */}
          <View style={[styles.notice, { backgroundColor: `${colors.primary}12` }]}>
            <Feather name="info" size={15} color={colors.primary} strokeWidth={2} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              {wasRejected
                ? `After you save, your ${label.noun} will be reviewed again and stay hidden until a moderator approves it.`
                : `After you save, your ${label.noun} will be reviewed again before it appears in the feed.`}
            </Text>
          </View>

          {/* Content input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.iconMuted}
            editable={!isSaving}
          />
          <Text style={[styles.charCount, { color: colors.iconMuted }]}>
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>

          {/* Footer */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary },
              (!content.trim() || isSaving) && { opacity: 0.6 },
            ]}
            activeOpacity={0.75}
            onPress={handleSave}
            disabled={!content.trim() || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardAvoid: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: layoutPadding,
    paddingBottom: 34,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.sectionTitle,
    fontSize: 17,
    fontWeight: '700',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: borderRadius.md,
    marginTop: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 120,
    maxHeight: 220,
    marginTop: 16,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  saveBtn: {
    borderRadius: borderRadius.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
