import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { User } from '../data/mockData';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

interface HeaderProps {
  /** Screen title shown center-left */
  title: string;
  /** Avatar shown on the left (default true) */
  showAvatar?: boolean;
  /** Avatar user data — falls back to placeholder circle if omitted */
  avatarUser?: User | null;
  /** Right-side icon node (e.g. Bell icon button, Settings, etc.) */
  rightAction?: ReactNode;
  /** Override the avatar press destination (default /profile) */
  avatarHref?: string;
  /** Extra content rendered below the title row (e.g. feed tabs, search bar) */
  bottomContent?: ReactNode;
}

/**
 * Premium tab-screen header matching the Home "Discover" style:
 * off-white (#F9F8F6) background, avatar-left / title-center / action-right,
 * subtle iOS shadow, 26px font-size with 800 weight and -0.5 tracking.
 */
export function Header({
  title,
  showAvatar = true,
  avatarUser = null,
  rightAction,
  avatarHref,
  bottomContent,
}: HeaderProps) {
  const router = useRouter();

  const handleAvatarPress = () => {
    router.push((avatarHref ?? '/(tabs)/profile') as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Left — avatar */}
        {showAvatar ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAvatarPress}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            {avatarUser ? (
              <Avatar user={avatarUser} size="small" />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}

        {/* Center — title */}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Right — action node */}
        <View style={styles.rightSlot}>
          {rightAction ?? <View style={styles.rightSpacer} />}
        </View>
      </View>

      {/* Optional bottom strip (feed tabs, search bar, etc.) */}
      {bottomContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background,
    paddingHorizontal: layoutPadding,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 0 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
  },
  title: {
    flex: 1,
    marginLeft: 10,
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.text,
    letterSpacing: -0.5,
  },
  rightSlot: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightSpacer: {
    width: 44,
    height: 44,
  },
});
