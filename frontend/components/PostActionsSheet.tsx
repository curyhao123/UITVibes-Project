/**
 * PostActionsSheet — animated bottom sheet for post-level actions.
 * Used in PostCard header (ellipsis button).
 *
 * Actions:
 *  - Report Post        (all users)
 *  - Block User        (all users, non-self)
 *  - Delete Post       (post owner only)
 *  - Edit Post         (post owner only) — mở sheet sửa bài & submit lại cho AI
 *
 * Design: same animation pattern as UserActionsSheet / ReportUserSheet
 */
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useTheme } from '../context/ThemeContext';

interface PostActionsSheetProps {
  visible: boolean;
  /** The user who owns the post */
  postOwnerId: string;
  /** ID of the currently logged-in user */
  currentUserId: string;
  /** Display name of the post owner (for block confirm dialog) */
  postOwnerDisplayName: string;
  /** Called when user taps "Report Post" */
  onReportPost: () => void;
  /** Called when user taps "Block User" */
  onBlockUser: () => void;
  /** Called when user taps "Delete Post" */
  onDeletePost: () => void;
  /** Called when user taps "Edit Post" */
  onEditPost?: () => void;
  /** Called when sheet is fully dismissed */
  onClose: () => void;
}

const SHEET_HEIGHT_BASE = 280;
const ACTION_ROW_HEIGHT = 52;

export function PostActionsSheet({
  visible,
  postOwnerId,
  currentUserId,
  postOwnerDisplayName,
  onReportPost,
  onBlockUser,
  onDeletePost,
  onEditPost,
  onClose,
}: PostActionsSheetProps) {
  const { colors, isDark } = useTheme();
  const isOwner = currentUserId === postOwnerId;

  // Chiều cao sheet phụ thuộc số hành động hiển thị:
  //   - Chủ bài: Report + Edit + Delete (3 hàng)
  //   - Người khác: Report + Block (2 hàng)
  const actionCount = isOwner ? 3 : 2;
  const sheetHeight = SHEET_HEIGHT_BASE + (actionCount - 2) * ACTION_ROW_HEIGHT;

  // Local state so animation out completes before React unmounts the Modal.
  const [isRendered, setIsRendered] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT_BASE)).current;

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
      ]).start();
    }
  }, [visible]);

  // Cleanup: if not visible but still rendered, animate out
  useEffect(() => {
    if (!visible && isRendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: sheetHeight,
          damping: 30,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setIsRendered(false));
    }
  }, [visible, isRendered, sheetHeight]);

  const handleClose = () => onClose();

  const handleReportPost = () => {
    // Close this sheet, then open the report sheet after animation completes.
    setTimeout(() => onReportPost(), 220);
    onClose();
  };

  const handleBlockUser = () => {
    onClose();
    Alert.alert(
      'Block User',
      `Are you sure you want to block @${postOwnerDisplayName}? You will no longer see their posts or be able to message them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: onBlockUser },
      ],
    );
  };

  const handleDeletePost = () => {
    onClose();
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDeletePost },
      ],
    );
  };

  const handleEditPost = () => {
    // Close this sheet, then open the edit sheet after animation completes.
    setTimeout(() => onEditPost?.(), 220);
    onClose();
  };

  // Don't render anything while closing animation finishes
  if (!isRendered) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: isDark ? colors.surface : (Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : colors.surfaceElevated),
            height: sheetHeight,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Swipe handle */}
        <View style={[styles.swipeHandle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>More Options</Text>
        </View>

        {/* Actions */}
        <View style={[styles.actionsContainer, { backgroundColor: colors.surfaceElevated }]}>
          {/* Report Post — available to all */}
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}
            activeOpacity={0.65}
            onPress={handleReportPost}
          >
            <View style={styles.actionIcon}>
              <Feather
                name="flag"
                size={20}
                color={colors.textSecondary}
                strokeWidth={2}
              />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Report Post</Text>
          </TouchableOpacity>

          {/* Block User — available to all except self */}
          {!isOwner && (
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}
              activeOpacity={0.65}
              onPress={handleBlockUser}
            >
              <View style={styles.actionIcon}>
                <Feather
                  name="slash"
                  size={20}
                  color="#ef4444"
                  strokeWidth={2}
                />
              </View>
              <Text style={[styles.actionLabel, styles.dangerLabel]}>Block User</Text>
            </TouchableOpacity>
          )}

          {/* Edit Post — owner only. Mở sheet sửa bài; nội dung mới sẽ được
              gửi lại cho AI kiểm duyệt (resubmit). */}
          {isOwner && (
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}
              activeOpacity={0.65}
              onPress={handleEditPost}
            >
              <View style={styles.actionIcon}>
                <Feather
                  name="edit-2"
                  size={20}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>Edit Post</Text>
            </TouchableOpacity>
          )}

          {/* Delete Post — owner only */}
          {isOwner && (
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}
              activeOpacity={0.65}
              onPress={handleDeletePost}
            >
              <View style={styles.actionIcon}>
                <Feather
                  name="trash-2"
                  size={20}
                  color="#ef4444"
                  strokeWidth={2}
                />
              </View>
              <Text style={[styles.actionLabel, styles.dangerLabel]}>Delete Post</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel */}
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.surfaceElevated }]}
          activeOpacity={0.65}
          onPress={handleClose}
        >
          <Text style={[styles.cancelLabel, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: layoutPadding,
    paddingBottom: 34,
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...Typography.sectionTitle,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 12,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  actionLabel: {
    ...Typography.bodySemibold,
    flex: 1,
  },
  dangerLabel: {
    color: '#ef4444',
  },
  cancelBtn: {
    marginTop: 10,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelLabel: {
    ...Typography.bodySemibold,
    fontWeight: '700',
  },
});
