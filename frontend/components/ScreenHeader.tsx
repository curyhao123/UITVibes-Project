import React, { memo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, layoutPadding, borderRadius } from '../constants/theme';
import { Typography } from '../constants/typography';

interface ScreenHeaderProps {
  /** Screen title */
  title: string;
  /** Back button press handler */
  onBack?: () => void;
  /** Optional right-side action (icon button, text, etc.) */
  rightAction?: ReactNode;
}

/**
 * Premium screen header matching the Settings screen style.
 *
 * Design rationale:
 * - Back button in a rounded container with subtle shadow (not raw icon)
 * - Title centered with strong typography (22px, 700 weight)
 * - Clean, minimal — no bottom divider
 * - Matches Instagram/Threads style back buttons
 */
export const ScreenHeader = memo(function ScreenHeader({
  title,
  onBack,
  rightAction,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Left: Back button or spacer */}
      <View style={styles.leftSlot}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={AppColors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {/* Center: Title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right: Action or spacer */}
      <View style={styles.rightSlot}>
        {rightAction ?? <View style={styles.backBtn} />}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    backgroundColor: AppColors.background,
    gap: 12,
  },
  leftSlot: {
    flexShrink: 0,
  },
  rightSlot: {
    flexShrink: 0,
    minWidth: 36,
    alignItems: 'flex-end',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm + 2, // 10px
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  title: {
    flex: 1,
    ...Typography.screenTitle,
    color: AppColors.text,
    textAlign: 'center',
  },
});
