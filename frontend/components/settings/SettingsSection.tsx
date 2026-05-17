import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Premium grouped settings section.
 *
 * WHY: Replaces flat divider-based sections with a card-style container.
 * - Provides clear visual grouping via rounded corners and shadow
 * - Creates breathing room between sections
 * - Reduces visual noise compared to endless horizontal dividers
 * - Mirrors the card-based approach used in Instagram/Threads/TikTok settings
 */
export const SettingsSection = memo(function SettingsSection({
  title,
  children,
}: SettingsSectionProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.meta,
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginHorizontal: layoutPadding,
  },
  card: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.lg,
    marginHorizontal: layoutPadding,
    overflow: 'hidden',
    // Subtle shadow — premium card depth without being heavy
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
