import React, { memo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';

export type HighlightVariant = 'trust' | 'warning' | 'control' | 'security';

interface HighlightCardProps {
  variant?: HighlightVariant;
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  children?: ReactNode;
}

const variantConfig: Record<
  HighlightVariant,
  {
    icon: keyof typeof Feather.glyphMap;
    bgColor: string;
    iconColor: string;
    iconBgColor: string;
    accentColor: string;
    titleColor: string;
  }
> = {
  trust: {
    icon: 'shield',
    bgColor: `${AppColors.primary}0A`,
    iconColor: AppColors.primary,
    iconBgColor: `${AppColors.primary}15`,
    accentColor: AppColors.primary,
    titleColor: AppColors.text,
  },
  warning: {
    icon: 'alert-triangle',
    bgColor: `${AppColors.error}0A`,
    iconColor: AppColors.error,
    iconBgColor: `${AppColors.error}15`,
    accentColor: AppColors.error,
    titleColor: AppColors.text,
  },
  control: {
    icon: 'eye',
    bgColor: `${AppColors.primary}0A`,
    iconColor: AppColors.primary,
    iconBgColor: `${AppColors.primary}15`,
    accentColor: AppColors.primary,
    titleColor: AppColors.text,
  },
  security: {
    icon: 'lock',
    bgColor: `${AppColors.success}0A`,
    iconColor: AppColors.success,
    iconBgColor: `${AppColors.success}15`,
    accentColor: AppColors.success,
    titleColor: AppColors.text,
  },
};

/**
 * Reusable trust/privacy highlight card.
 *
 * Variants:
 * - trust:   terracotta tint — reassuring trust signals
 * - control: terracotta tint — user control highlights
 * - security: green tint  — security-positive statements
 * - warning: red tint     — important warnings
 *
 * Design rationale:
 * - Icon in a soft-tinted circle for visual punch
 * - Short, punchy title + optional description
 * - Rounded corners, no heavy border
 * - Subtle platform shadow/elevation
 * - Horizontally scrollable when placed in a row
 * - Used for trust badges, privacy highlights, and security callouts
 */
export const HighlightCard = memo(function HighlightCard({
  variant = 'trust',
  icon,
  title,
  description,
  children,
}: HighlightCardProps) {
  const config = variantConfig[variant];
  const displayIcon = icon ?? config.icon;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View
        style={[styles.iconWrap, { backgroundColor: config.iconBgColor }]}
      >
        <Feather
          name={displayIcon}
          size={18}
          color={config.iconColor}
          strokeWidth={2.2}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View
            style={[styles.accentBar, { backgroundColor: config.accentColor }]}
          />
          <Text style={[styles.title, { color: config.titleColor }]}>
            {title}
          </Text>
        </View>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
        {children}
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
    paddingRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    flexShrink: 0,
  },
  title: {
    ...Typography.bodySemibold,
    flex: 1,
  },
  description: {
    ...Typography.body,
    color: AppColors.textSecondary,
    lineHeight: 21,
    marginTop: 4,
  },
});
