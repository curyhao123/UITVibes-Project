import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';

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
          color={AppColors.primary}
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
        color={AppColors.iconMuted}
        strokeWidth={2}
      />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
    gap: 14,
  },
  cardFirst: {
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.borderLight,
  },
  cardLast: {
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${AppColors.primary}10`,
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
    color: AppColors.text,
  },
  description: {
    ...Typography.caption,
    color: AppColors.textMuted,
    marginTop: 2,
  },
});
