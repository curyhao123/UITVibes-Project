import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../constants/theme';
import { Typography } from '../constants/typography';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: FeatherIconName;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  busy?: boolean;
  iconColor?: string;
  iconBackgroundColor?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  icon = 'alert-circle',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  busy = false,
  iconColor,
  iconBackgroundColor,
  onCancel,
  onConfirm,
}) => {
  const actionColor = variant === 'danger' ? AppColors.error : AppColors.primary;
  const resolvedIconColor = iconColor ?? actionColor;
  const resolvedIconBackgroundColor =
    iconBackgroundColor ?? `${resolvedIconColor}18`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: resolvedIconBackgroundColor },
            ]}
          >
            <Feather name={icon} size={24} color={resolvedIconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: actionColor }]}
              onPress={onConfirm}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.screenTitle,
    color: AppColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.background,
    borderWidth: 1.5,
    borderColor: AppColors.border,
  },
  secondaryButtonText: {
    ...Typography.bodySemibold,
    color: AppColors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  confirmButtonText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
});
