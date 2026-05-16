/**
 * DeleteConfirmModal — confirmation dialog before permanently deleting a comment.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../constants/theme';

interface DeleteConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  visible,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Warning icon */}
          <View style={styles.iconWrap}>
            <Feather name="trash-2" size={24} color={AppColors.error} />
          </View>

          <Text style={styles.title}>Delete comment?</Text>
          <Text style={styles.body}>
            This comment will be permanently deleted and cannot be recovered.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.deleteBtn]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${AppColors.error}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: AppColors.borderLight,
  },
  deleteBtn: {
    backgroundColor: AppColors.error,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
