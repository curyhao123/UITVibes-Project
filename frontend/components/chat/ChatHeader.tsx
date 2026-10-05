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
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../Avatar';
import { PushButton } from '../PushButton';

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
  const { colors } = useTheme();

  return (
    <View style={[styles.chatHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.backBtnWrap}>
        <PushButton
          onPress={onBack}
          shadowColor={colors.border}
          frontColor={colors.surfaceElevated}
          frontTextColor={colors.text}
          liftPx={3}
          borderRadius={12}
          contentStyle={styles.backBtnContent}
        >
          <Feather name="arrow-left" size={22} color={colors.text} strokeWidth={2.2} />
        </PushButton>
      </View>
      <TouchableOpacity
        style={styles.chatHeaderUser}
        onPress={onUserPress}
        activeOpacity={0.7}
      >
        {otherUser ? (
          <Avatar
            user={otherUser}
            size="medium"
            showOnlineIndicator={true}
            isOnline={isOnline}
          />
        ) : (
          <View style={styles.chatAvatarGroup}>
            <Feather name="users" size={20} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.headerTextWrap}>
          <Text style={[styles.chatName, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {isGroup && (
            <Text style={[styles.chatSubtitle, { color: colors.textMuted }]}>
              {memberCount} members
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerAction}
        onPress={onActionPress}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather
          name={isGroup && isAdmin ? 'settings' : 'info'}
          size={24}
          color={colors.text}
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
    paddingVertical: 14,
    minHeight: 70,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
    gap: 12,
  },
  backBtnWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnContent: {
    width: 40,
    height: 40,
    minHeight: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  chatAvatarGroup: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatName: {
    ...Typography.screenTitle,
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: -0.3,
  },
  chatSubtitle: {
    ...Typography.caption,
    fontSize: 13,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
