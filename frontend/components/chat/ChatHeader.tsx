import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { Avatar } from '../Avatar';

export interface ChatHeaderProps {
  title: string;
  isGroup: boolean;
  otherUser: any | null;
  memberCount?: number;
  isOnline?: boolean;
  isAdmin?: boolean;
  onBack: () => void;
  onUserPress: () => void;
  onActionPress: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  isGroup,
  otherUser,
  memberCount = 0,
  isOnline = false,
  isAdmin = false,
  onBack,
  onUserPress,
  onActionPress,
}) => {
  return (
    <View style={styles.chatHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Feather name="arrow-left" size={22} color={AppColors.text} strokeWidth={2} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.chatHeaderUser}
        onPress={onUserPress}
        activeOpacity={0.7}
      >
        {otherUser ? (
          <Avatar
            user={otherUser}
            size="small"
            showOnlineIndicator={true}
            isOnline={isOnline}
          />
        ) : (
          <View style={styles.chatAvatarGroup}>
            <Feather name="users" size={18} color="white" />
          </View>
        )}
        <View style={styles.headerTextWrap}>
          <Text style={styles.chatName} numberOfLines={1}>
            {title}
          </Text>
          {isGroup && (
            <Text style={styles.chatSubtitle}>
              {memberCount} members
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerAction}
        onPress={onActionPress}
        activeOpacity={0.7}
      >
        <Feather
          name={isGroup && isAdmin ? 'settings' : 'info'}
          size={22}
          color={AppColors.text}
          strokeWidth={2}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    backgroundColor: AppColors.background,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTextWrap: {
    flex: 1,
  },
  chatAvatarGroup: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatName: {
    ...Typography.bodySemibold,
    fontWeight: '600',
    color: AppColors.text,
  },
  chatSubtitle: {
    ...Typography.caption,
    color: AppColors.textMuted,
  },
  headerAction: {
    padding: 4,
  },
});
