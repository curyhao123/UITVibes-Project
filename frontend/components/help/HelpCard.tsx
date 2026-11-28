import { Feather } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, type ThemeColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export interface HelpCardData {
  id: string;
  icon: string;
  title: string;
  description: string;
  action?: () => void;
}

interface HelpCardProps {
  card: HelpCardData;
  isFirst?: boolean;
  isLast?: boolean;
}

/**
 * Premium support card matching the app's earthy minimalist aesthetic.
 *
 * Design rationale:
 * - White surface card with subtle iOS/Android shadow
 * - Left-side icon in a tinted rounded container (no raw icon)
 * - Two-line text: bold title + muted description
 * - Right chevron signals interactivity
 * - Rounded outer corners only; inner borders for grouping
 */
export const HelpCard = memo(function HelpCard(
  { card, isFirst, isLast }: HelpCardProps,
) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isFirst && styles.cardFirst,
        isLast && styles.cardLast,
      ]}
      activeOpacity={0.7}
      onPress={card.action}
    >
      {/* Icon container */}
      <View style={styles.iconWrap}>
        <Feather
          name={card.icon as any}
          size={20}
          color={colors.primary}
          strokeWidth={2}
        />
      </View>

      {/* Text content */}
      <View style={styles.content}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.description}>{card.description}</Text>
      </View>

      {/* Chevron */}
      <Feather
        name="chevron-right"
        size={18}
        color={colors.iconMuted}
        strokeWidth={2}
      />
    </TouchableOpacity>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: 14,
  },
  cardFirst: {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  cardLast: {
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    paddingRight: 4,
  },
  title: {
    ...Typography.bodySemibold,
    color: colors.text,
  },
  description: {
    ...Typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
