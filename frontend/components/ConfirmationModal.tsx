import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borderRadius } from '../constants/theme';
import { Typography } from '../constants/typography';
import { useTheme } from '../context/ThemeContext';

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
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const actionColor = variant === 'danger' ? colors.error : colors.primary;
  const resolvedIconColor = iconColor ?? actionColor;
  const resolvedIconBackgroundColor =
    iconBackgroundColor ?? `${resolvedIconColor}18`;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { backgroundColor: colors.surfaceElevated, transform: [{ scale: scaleAnim }] }]}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: resolvedIconBackgroundColor },
            ]}
          >
            <Feather name={icon} size={24} color={resolvedIconColor} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={onCancel}
              disabled={busy}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{cancelLabel}</Text>
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
        </Animated.View>
      </Animated.View>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    ...Typography.body,
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
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    ...Typography.bodySemibold,
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
