import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors, isDark } = useTheme();
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
          {
            backgroundColor: isDark ? colors.surface : (Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : colors.surfaceElevated),
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
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderLight }]}
            activeOpacity={0.65}
            onPress={handleReport}
          >
            <View style={styles.actionIcon}>
              <Feather
                name="flag"
                size={20}
                color={colors.textSecondary}
                strokeWidth={2}
              />
            </View>
            <Text style={[styles.actionLabel, { color: colors.text }]}>Report User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.borderLight }, isBlocking && styles.actionRowDisabled]}
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
                color={colors.primary}
                style={{ marginLeft: 8 }}
              />
            )}
          </TouchableOpacity>
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
    height: SHEET_HEIGHT,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
  actionRowDisabled: {
    opacity: 0.5,
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
