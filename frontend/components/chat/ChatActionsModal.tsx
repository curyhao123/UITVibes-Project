import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

export interface ChatActionsModalProps {
  visible: boolean;
  blockedByMe: boolean;
  onBlockAction: () => void;
  onClose: () => void;
}

export const ChatActionsModal: React.FC<ChatActionsModalProps> = ({
  visible,
  blockedByMe,
  onBlockAction,
  onClose,
}) => {
  const chatActionLabel = blockedByMe ? 'Unblock user' : 'Block user';
  const chatActionIcon = blockedByMe ? 'user-check' : 'user-x';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.chatActionsSheet}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.settingsSheetHeader}>
            <Text style={styles.settingsSheetTitle}>Chat actions</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              setTimeout(onBlockAction, 120);
            }}
          >
            <Feather
              name={chatActionIcon}
              size={20}
              color={blockedByMe ? AppColors.text : AppColors.error}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.actionText,
                !blockedByMe && styles.dangerActionText,
              ]}
            >
              {chatActionLabel}
            </Text>
            <Feather name="chevron-right" size={20} color={AppColors.textMuted} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatActionsSheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 20,
  },
  settingsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layoutPadding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  settingsSheetTitle: {
    ...Typography.bodySemibold,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layoutPadding,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    minHeight: 50,
  },
  actionText: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
  },
  dangerActionText: {
    color: AppColors.error,
  },
});
