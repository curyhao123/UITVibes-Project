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

export interface NewMessageSheetProps {
  visible: boolean;
  searchQuery: string;
  onChangeSearch: (text: string) => void;
  searchResults: User[];
  suggestedUsers: User[];
  isSearching: boolean;
  startingUserId: string | null;
  bottomPadding: number;
  isUserOnline: (userId: string) => boolean;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const NewMessageSheet: React.FC<NewMessageSheetProps> = ({
  visible,
  searchQuery,
  onChangeSearch,
  searchResults,
  suggestedUsers,
  isSearching,
  startingUserId,
  bottomPadding,
  isUserOnline,
  onSelectUser,
  onClose,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const data = searchQuery.trim().length > 0 ? searchResults : suggestedUsers;

  return (
    <View style={styles.sheetOverlay}>
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.newMsgSheet, { backgroundColor: colors.surfaceElevated }]}>
        <View style={[styles.newMsgSheetHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.newMsgSheetTitle, { color: colors.text }]}>New Message</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={[styles.newMsgSearchContainer, { backgroundColor: colors.borderLight }]}>
          <Feather name="search" size={16} color={colors.iconMuted} strokeWidth={2} />
          <TextInput
            style={[styles.newMsgSearchInput, { color: colors.text }]}
            placeholder="Search people..."
            placeholderTextColor={colors.iconMuted}
            value={searchQuery}
            onChangeText={onChangeSearch}
            autoFocus
          />
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isStarting = startingUserId === item.id;
            return (
              <TouchableOpacity
                style={[styles.newMsgUserItem, isStarting && styles.newMsgUserItemDisabled]}
                activeOpacity={isStarting ? 1 : 0.7}
                onPress={() => {
                  if (isStarting) return;
                  onSelectUser(item);
                }}
                disabled={isStarting}
              >
                <View style={styles.newMsgAvatarContainer}>
                  <Avatar
                    user={item}
                    size="small"
                    showOnlineIndicator={true}
                    isOnline={isUserOnline(item.id)}
                  />
                </View>
                <View style={styles.newMsgUserInfo}>
                  {isStarting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Text style={[styles.newMsgUserName, { color: colors.text }]}>{item.username || item.displayName}</Text>
                      <Text style={[styles.newMsgUserDisplay, { color: colors.textMuted }]}>{item.displayName}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            isSearching ? (
              <View style={styles.newMsgEmpty}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <Text style={[styles.newMsgEmpty, { color: colors.textMuted }]}>
                {searchQuery.trim().length > 0 ? 'No users found' : 'No suggested users'}
              </Text>
            )
          }
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  newMsgSheet: {
    backgroundColor: AppColors.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  newMsgSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  newMsgSheetTitle: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.text,
  },
  newMsgSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  newMsgSearchInput: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
    padding: 0,
  },
  newMsgUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  newMsgUserItemDisabled: {
    opacity: 0.5,
  },
  newMsgAvatarContainer: {
    width: 44,
    height: 44,
  },
  newMsgUserInfo: {
    flex: 1,
  },
  newMsgUserName: {
    ...Typography.bodySemibold,
    fontSize: 15,
    color: AppColors.text,
  },
  newMsgUserDisplay: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    marginTop: 2,
  },
  newMsgEmpty: {
    ...Typography.body,
    color: AppColors.iconMuted,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
