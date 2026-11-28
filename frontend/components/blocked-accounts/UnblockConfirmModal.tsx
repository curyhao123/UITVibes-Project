import React, { memo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borderRadius, layoutPadding, type ThemeColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface UnblockConfirmModalProps {
  visible: boolean;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  onCancel: () => void;
  onUnblock: () => void;
  isLoading?: boolean;
}

export const UnblockConfirmModal = memo(function UnblockConfirmModal({
  visible,
  username,
  displayName,
  avatarUrl,
  onCancel,
  onUnblock,
  isLoading = false,
}: UnblockConfirmModalProps) {
  const styles = useThemedStyles(createStyles);
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.card, { backgroundColor: colors.surfaceElevated, borderWidth: isDark ? 1 : 0, borderColor: colors.border }]}
          onPress={() => {}}
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Feather name="user-x" size={32} color={colors.error || colors.error} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Unblock @{username}?
          </Text>

          {/* Description */}
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            They will be able to follow, message, and interact with your profile again.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.unblockBtn, isLoading && styles.unblockBtnLoading]}
              activeOpacity={0.7}
              onPress={onUnblock}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.unblockBtnLoadingText}>Unblocking...</Text>
              ) : (
                <Text style={styles.unblockBtnText}>Unblock</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.error}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.sectionTitle,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  hint: {
    ...Typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...Typography.bodySemibold,
    color: colors.text,
  },
  unblockBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  unblockBtnLoading: {
    opacity: 0.7,
  },
  unblockBtnText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
  unblockBtnLoadingText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
});
