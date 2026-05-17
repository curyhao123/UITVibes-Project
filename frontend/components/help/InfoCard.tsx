import React, { memo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';

export type InfoCardVariant = 'info' | 'warning' | 'success' | 'summary';

interface InfoCardProps {
  variant?: InfoCardVariant;
  icon?: keyof typeof Feather.glyphMap;
  title?: string;
  children: ReactNode;
}

const variantConfig: Record<
  InfoCardVariant,
  {
    icon: keyof typeof Feather.glyphMap;
    bgColor: string;
    iconColor: string;
    iconBgColor: string;
    titleColor: string;
  }
> = {
  summary: {
    icon: 'book-open',
    bgColor: `${AppColors.primary}0C`,
    iconColor: AppColors.primary,
    iconBgColor: `${AppColors.primary}18`,
    titleColor: AppColors.text,
  },
  info: {
    icon: 'info',
    bgColor: `${AppColors.primary}0C`,
    iconColor: AppColors.primary,
    iconBgColor: `${AppColors.primary}18`,
    titleColor: AppColors.text,
  },
  warning: {
    icon: 'alert-triangle',
    bgColor: `${AppColors.error}0C`,
    iconColor: AppColors.error,
    iconBgColor: `${AppColors.error}18`,
    titleColor: AppColors.text,
  },
  success: {
    icon: 'check-circle',
    bgColor: `${AppColors.success}0C`,
    iconColor: AppColors.success,
    iconBgColor: `${AppColors.success}18`,
    titleColor: AppColors.text,
  },
};

/**
 * Reusable styled card for informational notices.
 *
 * Variants:
 * - summary: soft primary tint, for overview/summary cards
 * - info: primary tint, general info notices
 * - warning: error-red tint, for warnings/important notices
 * - success: green tint, for positive notices
 *
 * Design rationale:
 * - Rounded corners, soft background fill, no heavy border
 * - Left-aligned icon in a colored circle for visual punch
 * - Title + body text hierarchy
 * - Platform shadow (iOS) / elevation (Android)
 */
export const InfoCard = memo(function InfoCard({
  variant = 'info',
  icon,
  title,
  children,
}: InfoCardProps) {
  const config = variantConfig[variant];
  const displayIcon = icon ?? config.icon;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View style={[styles.iconWrap, { backgroundColor: config.iconBgColor }]}>
        <Feather
          name={displayIcon}
          size={18}
          color={config.iconColor}
          strokeWidth={2.2}
        />
      </View>
      <View style={styles.body}>
        {title ? (
          <>
            <Text style={[styles.title, { color: config.titleColor }]}>{title}</Text>
            <Text style={styles.bodyText}>{children}</Text>
          </>
        ) : (
          <Text style={styles.bodyText}>{children}</Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.lg,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...Typography.bodySemibold,
    marginBottom: 4,
  },
  bodyText: {
    ...Typography.body,
    color: AppColors.textSecondary,
    lineHeight: 22,
  },
});
