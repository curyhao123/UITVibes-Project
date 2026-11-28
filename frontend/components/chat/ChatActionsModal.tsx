import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';

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
  const { colors } = useTheme();
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
          style={[styles.chatActionsSheet, { backgroundColor: colors.surfaceElevated }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.settingsSheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingsSheetTitle, { color: colors.text }]}>Chat actions</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionRow, { borderTopColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              setTimeout(onBlockAction, 120);
            }}
          >
            <Feather
              name={chatActionIcon}
              size={20}
              color={blockedByMe ? colors.text : colors.error}
              strokeWidth={2}
            />
            <Text
              style={[styles.actionText, { color: blockedByMe ? colors.text : colors.error }]}
            >
              {chatActionLabel}
            </Text>
            <Feather name="chevron-right" size={20} color={colors.textMuted} strokeWidth={2} />
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
  },
  settingsSheetTitle: {
    ...Typography.bodySemibold,
    fontWeight: '600',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layoutPadding,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    minHeight: 50,
  },
  actionText: {
    ...Typography.body,
    flex: 1,
  },
});
