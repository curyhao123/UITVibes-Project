import React, { memo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borderRadius, type ThemeColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export type HighlightVariant = 'trust' | 'warning' | 'control' | 'security';

interface HighlightCardProps {
  variant?: HighlightVariant;
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  children?: ReactNode;
}

export const HighlightCard = memo(function HighlightCard({
  variant = 'trust',
  icon,
  title,
  description,
  children,
}: HighlightCardProps) {
  const styles = useThemedStyles(createStyles);
  const { colors, isDark } = useTheme();

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
      bgColor: isDark ? 'rgba(124, 58, 237, 0.12)' : `${colors.primary}0A`,
      iconColor: colors.primary,
      iconBgColor: isDark ? 'rgba(124, 58, 237, 0.22)' : `${colors.primary}15`,
      accentColor: colors.primary,
      titleColor: colors.text,
    },
    warning: {
      icon: 'alert-triangle',
      bgColor: isDark ? 'rgba(239, 68, 68, 0.12)' : `${colors.error || colors.error}0A`,
      iconColor: colors.error || colors.error,
      iconBgColor: isDark ? 'rgba(239, 68, 68, 0.22)' : `${colors.error || colors.error}15`,
      accentColor: colors.error || colors.error,
      titleColor: colors.text,
    },
    control: {
      icon: 'eye',
      bgColor: isDark ? 'rgba(124, 58, 237, 0.12)' : `${colors.primary}0A`,
      iconColor: colors.primary,
      iconBgColor: isDark ? 'rgba(124, 58, 237, 0.22)' : `${colors.primary}15`,
      accentColor: colors.primary,
      titleColor: colors.text,
    },
    security: {
      icon: 'lock',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.12)' : `${colors.success || colors.success}0A`,
      iconColor: colors.success || colors.success,
      iconBgColor: isDark ? 'rgba(16, 185, 129, 0.22)' : `${colors.success || colors.success}15`,
      accentColor: colors.success || colors.success,
      titleColor: colors.text,
    },
  };

  const config = variantConfig[variant];
  const displayIcon = icon ?? config.icon;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor, borderWidth: isDark ? 1 : 0, borderColor: colors.border }]}>
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
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
        {children}
      </View>
    </View>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    color: colors.textSecondary,
    lineHeight: 21,
    marginTop: 4,
  },
});
