/**
 * UserActionsSheet — animated bottom sheet with user action options.
 *
 * Uses React Native's built-in Animated API (no reanimated dependency)
 * for maximum compatibility across iOS, Android, and Expo.
 *
 * Features:
 * - Slide-up animation via Animated.timing + Animated.spring
 * - Semi-transparent backdrop with press-to-dismiss
 * - Swipe handle visual cue
 * - Actions: Report User (neutral), Block User (danger), Cancel
 * - Block action has async loading state and auto-navigates after block
 * - Report action shows a confirm-alert placeholder
 *
 * Design: Instagram-style modal, rounded sheet, frosted-like blur via tint,
 * danger action with red text.
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
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UserActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  onBlock: () => Promise<void>;
  /** Called when user taps "Report User" — parent opens ReportUserSheet */
  onReport: (reportedUserId: string) => void;
  reportedUserId: string;
  blockedUsername: string;
}

const SHEET_HEIGHT = 310;

export function UserActionsSheet({
  visible,
  onClose,
  onBlock,
  onReport,
  reportedUserId,
  blockedUsername,
}: UserActionsSheetProps) {
  const [isBlocking, setIsBlocking] = useState(false);

  // Local state so animation out completes before React unmounts the Modal.
  const [isRendered, setIsRendered] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Reset blocking state when modal closes
  useEffect(() => {
    if (!visible) setIsBlocking(false);
  }, [visible]);

  // Mount animation
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
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

  // Cleanup: if not visible but still rendered, animate out then unmount
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

  const handleBlock = async () => {
    if (isBlocking) return;
    setIsBlocking(true);
    try {
      await onBlock();
      onClose();
      Alert.alert(
        'User Blocked',
        `You have blocked @${blockedUsername}. You can unblock them anytime from Settings.`,
        [{ text: 'OK' }],
      );
    } catch {
      Alert.alert('Error', 'Could not block this user. Please try again.');
      setIsBlocking(false);
    }
  };

  const handleReport = () => {
    // Close this sheet, then open the report sheet after animation completes.
    setTimeout(() => onReport(reportedUserId), 220);
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
        <Animated.View
          style={[styles.backdropFill, { opacity: backdropOpacity }]}
        />
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
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.65}
            onPress={handleReport}
          >
            <View style={styles.actionIcon}>
              <Feather
                name="flag"
                size={20}
                color={AppColors.textSecondary}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.actionLabel}>Report User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, isBlocking && styles.actionRowDisabled]}
            activeOpacity={0.65}
            onPress={handleBlock}
            disabled={isBlocking}
          >
            <View style={styles.actionIcon}>
              <Feather
                name="slash"
                size={20}
                color="#ef4444"
                strokeWidth={2}
              />
            </View>
            <Text style={[styles.actionLabel, styles.dangerLabel]}>
              {isBlocking ? 'Please wait...' : 'Block User'}
            </Text>
            {isBlocking && (
              <ActivityIndicator
                size="small"
                color={AppColors.primary}
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
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
    paddingBottom: 34, // home indicator inset
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
  actionRowDisabled: {
    opacity: 0.6,
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
