import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';
import { User } from '../../data/mockData';
import { Avatar } from '../Avatar';

export interface CreateGroupSheetProps {
  visible: boolean;
  groupName: string;
  onChangeGroupName: (text: string) => void;
  friendSearch: string;
  onChangeFriendSearch: (text: string) => void;
  friends: User[];
  selectedMembers: User[];
  onToggleMember: (user: User) => void;
  isLoadingFriends: boolean;
  isCreatingGroup: boolean;
  bottomPadding: number;
  isUserOnline: (userId: string) => boolean;
  onRefreshFriends: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const CreateGroupSheet: React.FC<CreateGroupSheetProps> = ({
  visible,
  groupName,
  onChangeGroupName,
  friendSearch,
  onChangeFriendSearch,
  friends,
  selectedMembers,
  onToggleMember,
  isLoadingFriends,
  isCreatingGroup,
  bottomPadding,
  isUserOnline,
  onRefreshFriends,
  onSubmit,
  onClose,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const canSubmit = groupName.trim().length > 0 && selectedMembers.length >= 2 && !isCreatingGroup;

  return (
    <View style={styles.sheetOverlay}>
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Create Group</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.groupNameContainer}>
          <TextInput
            style={[styles.groupNameInput, { color: colors.text, backgroundColor: colors.borderLight }]}
            placeholder="Group name..."
            placeholderTextColor={colors.iconMuted}
            value={groupName}
            onChangeText={onChangeGroupName}
            maxLength={100}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Select at least 2 friends</Text>

        <View style={[styles.searchContainer, { backgroundColor: colors.borderLight }]}>
          <Feather name="search" size={16} color={colors.iconMuted} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search friends..."
            placeholderTextColor={colors.iconMuted}
            value={friendSearch}
            onChangeText={onChangeFriendSearch}
          />
        </View>

        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = selectedMembers.some((m) => m.id === item.id);
            return (
              <TouchableOpacity
                style={styles.userItem}
                activeOpacity={0.7}
                onPress={() => onToggleMember(item)}
              >
                <View style={styles.avatarContainer}>
                  <Avatar
                    user={item}
                    size="medium"
                    showOnlineIndicator={true}
                    isOnline={isUserOnline(item.id)}
                  />
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>{item.username}</Text>
                  <Text style={[styles.userDisplay, { color: colors.textMuted }]}>{item.displayName}</Text>
                </View>
                <View style={[styles.checkbox, { borderColor: colors.border }, selected && styles.checkboxSelected]}>
                  {selected && <Feather name="check" size={14} color="white" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            isLoadingFriends ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <TouchableOpacity style={styles.userItem} onPress={onRefreshFriends}>
                <View style={[styles.refreshIconWrap, { backgroundColor: colors.borderLight }]}>
                  <Feather name="refresh-cw" size={18} color={colors.iconMuted} />
                </View>
                <Text style={[styles.userInfoText, { color: colors.textMuted }]}>
                  {friendSearch.trim() ? 'No friends found' : 'No friends available'}
                </Text>
              </TouchableOpacity>
            )
          }
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity
          style={[
            styles.createGroupBtn,
            { marginBottom: bottomPadding },
            !canSubmit && styles.createGroupBtnDisabled,
          ]}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          {isCreatingGroup ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.createGroupBtnText}>
              Create Group ({selectedMembers.length} selected)
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: AppColors.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  sheetTitle: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.text,
  },
  groupNameContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  groupNameInput: {
    ...Typography.body,
    color: AppColors.text,
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sectionLabel: {
    ...Typography.captionSemibold,
    fontSize: 12,
    color: AppColors.iconMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
    padding: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.bodySemibold,
    fontSize: 15,
    color: AppColors.text,
  },
  userDisplay: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AppColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  refreshIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoText: {
    ...Typography.body,
    color: AppColors.iconMuted,
    marginLeft: 8,
  },
  createGroupBtn: {
    backgroundColor: AppColors.primary,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createGroupBtnDisabled: {
    opacity: 0.5,
  },
  createGroupBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});
