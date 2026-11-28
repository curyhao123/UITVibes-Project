import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { layoutPadding, type ThemeColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { Avatar } from '../Avatar';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export interface AddMemberModalProps {
  visible: boolean;
  friends: any[];
  friendSearch: string;
  onChangeFriendSearch: (text: string) => void;
  isLoadingFriends: boolean;
  addingMemberId: string | null;
  isUserOnline: (userId: string) => boolean;
  onAddMember: (userId: string) => void;
  onClose: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  visible,
  friends,
  friendSearch,
  onChangeFriendSearch,
  isLoadingFriends,
  addingMemberId,
  isUserOnline,
  onAddMember,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.settingsSheet}>
          <View style={styles.settingsSheetHeader}>
            <Text style={styles.settingsSheetTitle}>Add Member</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={styles.friendSearchContainer}>
            <Feather name="search" size={16} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              style={styles.friendSearchInput}
              placeholder="Search friends..."
              placeholderTextColor={colors.textMuted}
              value={friendSearch}
              onChangeText={onChangeFriendSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isAdding = addingMemberId === item.id;
              return (
                <TouchableOpacity
                  style={styles.memberRow}
                  activeOpacity={0.7}
                  onPress={() => onAddMember(item.id)}
                  disabled={addingMemberId != null}
                >
                  <Avatar
                    user={item}
                    size="small"
                    showOnlineIndicator={true}
                    isOnline={isUserOnline(item.id)}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {item.displayName || item.username || 'User'}
                    </Text>
                  </View>
                  {isAdding ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name="user-plus" size={20} color={colors.primary} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              isLoadingFriends ? (
                <View style={styles.emptyFriends}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <Text style={styles.emptyFriends}>
                  {friendSearch.trim() ? 'No friends found' : 'No friends available to add'}
                </Text>
              )
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '85%',
  },
  settingsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layoutPadding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsSheetTitle: {
    ...Typography.bodySemibold,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  friendSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layoutPadding,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    gap: 8,
  },
  friendSearchInput: {
    ...Typography.body,
    flex: 1,
    color: colors.text,
    padding: 0,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 11,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...Typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  emptyFriends: {
    ...Typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
