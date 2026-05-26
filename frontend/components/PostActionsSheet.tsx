/**
 * PostActionsSheet — animated bottom sheet for post-level actions.
 * Used in PostCard header (ellipsis button).
 *
 * Actions:
 *  - Report Post        (all users)
 *  - Block User        (all users, non-self)
 *  - Delete Post       (post owner only)
 *
 * Design: same animation pattern as UserActionsSheet / ReportUserSheet
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  /** Called when sheet is fully dismissed */
  onClose: () => void;
}

const SHEET_HEIGHT = 280;

export function PostActionsSheet({
  visible,
  postOwnerId,
  currentUserId,
  postOwnerDisplayName,
  onReportPost,
  onBlockUser,
  onDeletePost,
  onClose,
}: PostActionsSheetProps) {
  const isOwner = currentUserId === postOwnerId;

  // Local state so animation out completes before React unmounts the Modal.
  const [isRendered, setIsRendered] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

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
          toValue: SHEET_HEIGHT,
          damping: 30,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setIsRendered(false));
    }
  }, [visible, isRendered]);

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
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        {/* Swipe handle */}
        <View style={styles.swipeHandle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>More Options</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Report Post — available to all */}
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.65}
            onPress={handleReportPost}
          >
            <View style={styles.actionIcon}>
              <Feather
                name="flag"
                size={20}
                color={AppColors.textSecondary}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.actionLabel}>Report Post</Text>
          </TouchableOpacity>

          {/* Block User — available to all except self */}
          {!isOwner && (
            <TouchableOpacity
              style={styles.actionRow}
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

          {/* Delete Post — owner only */}
          {isOwner && (
            <TouchableOpacity
              style={styles.actionRow}
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
          style={styles.cancelBtn}
          activeOpacity={0.65}
          onPress={handleClose}
        >
          <Text style={styles.cancelLabel}>Cancel</Text>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : AppColors.surfaceElevated,
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
    backgroundColor: AppColors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  headerTitle: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 12,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
  },
  actionIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  actionLabel: {
    ...Typography.bodySemibold,
    color: AppColors.text,
    flex: 1,
  },
  dangerLabel: {
    color: '#ef4444',
  },
  cancelBtn: {
    marginTop: 10,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelLabel: {
    ...Typography.bodySemibold,
    color: AppColors.primary,
    fontWeight: '700',
  },
});
