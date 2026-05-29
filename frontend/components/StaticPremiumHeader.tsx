/**
 * StaticPremiumHeader — Premium header với blur effect.
 * 
 * Phiên bản đơn giản cho các màn hình không cần scroll animation.
 * Dùng glassmorphism blur background.
 */

import React, { memo, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { User } from '../data/mockData';
import { AppColors, layoutPadding, borderRadius } from '../constants/theme';
import { Typography } from '../constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StaticPremiumHeaderProps {
  /** Screen title */
  title: string;
  /** Show back button */
  showBack?: boolean;
  /** Show avatar instead of back button */
  showAvatar?: boolean;
  /** Avatar user data */
  avatarUser?: User | null;
  /** Right-side action node */
  rightAction?: ReactNode;
  /** Custom back handler */
  onBack?: () => void;
  /** Notification count (shows animated badge if > 0) */
  notificationCount?: number;
  /** Callback when notification icon pressed */
  onNotificationPress?: () => void;
  /** Use blur background (default true) */
  useBlur?: boolean;
  /** Large title style */
  largeTitle?: boolean;
}

export const StaticPremiumHeader = memo(function StaticPremiumHeader({
  title,
  showBack = false,
  showAvatar = false,
  avatarUser = null,
  rightAction,
  onBack,
  notificationCount = 0,
  onNotificationPress,
  useBlur = true,
  largeTitle = false,
}: StaticPremiumHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleAvatarPress = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.container}>
      {/* Blur background */}
      {useBlur ? (
        <BlurView
          intensity={70}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.solidBackground]} />
      )}

      {/* Bottom border */}
      <View style={styles.bottomBorder} />

      {/* Content */}
      <View style={styles.content}>
        {/* Left slot */}
        <View style={styles.leftSlot}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={AppColors.text} />
            </TouchableOpacity>
          ) : showAvatar ? (
            <TouchableOpacity
              onPress={handleAvatarPress}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              activeOpacity={0.8}
            >
              {avatarUser ? (
                <Avatar user={avatarUser} size="small" />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Center: Title */}
        <View style={styles.centerSlot}>
          <Text
            style={[
              largeTitle ? styles.largeTitleText : styles.titleText,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right slot */}
        <View style={styles.rightSlot}>
          {rightAction ?? (
            <View style={styles.rightActions}>
              {/* Notification button */}
              {onNotificationPress && (
                <TouchableOpacity
                  onPress={onNotificationPress}
                  style={styles.iconButton}
                  hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Feather name="bell" size={20} color={AppColors.text} />
                  {notificationCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Message button */}
              <TouchableOpacity
                onPress={() => router.push('/message')}
                style={styles.iconButton}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Feather name="message-circle" size={20} color={AppColors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

// ─── Compact Header (cho profile, settings) ─────────────────────────────────────

interface CompactHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
}

export const CompactHeader = memo(function CompactHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
}: CompactHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={compactStyles.container}>
      <View style={compactStyles.content}>
        {/* Left */}
        <View style={compactStyles.leftSlot}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={compactStyles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={AppColors.text} />
            </TouchableOpacity>
          ) : (
            <View style={compactStyles.placeholder} />
          )}
        </View>

        {/* Center */}
        <Text style={compactStyles.title} numberOfLines={1}>
          {title}
        </Text>

        {/* Right */}
        <View style={compactStyles.rightSlot}>
          {rightAction ?? <View style={compactStyles.placeholder} />}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  solidBackground: {
    backgroundColor: AppColors.background,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    minHeight: 44,
  },
  leftSlot: {
    flexShrink: 0,
    width: 44,
    alignItems: 'flex-start',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
  },
  rightSlot: {
    flexShrink: 0,
    width: 88,
    alignItems: 'flex-end',
  },
  titleText: {
    ...Typography.screenTitle,
    color: AppColors.text,
  },
  largeTitleText: {
    fontSize: 28,
    fontWeight: '800',
    color: AppColors.text,
    letterSpacing: -0.6,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm + 2,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
  },
  placeholder: {
    width: 32,
    height: 32,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

const compactStyles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    paddingTop: Platform.OS === 'ios' ? 4 : 8,
    paddingBottom: 4,
    paddingHorizontal: layoutPadding,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  leftSlot: {
    flexShrink: 0,
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  rightSlot: {
    flexShrink: 0,
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  placeholder: {
    width: 32,
    height: 32,
  },
});
