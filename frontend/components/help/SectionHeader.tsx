import React, { memo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { AppColors, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

/**
 * Clean section header with optional subtitle and right-side action.
 * Used to separate major content blocks in Help Center and Settings.
 */
export const SectionHeader = memo(function SectionHeader({
  title,
  subtitle,
  right,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 10,
  },
  left: {
    flex: 1,
  },
  right: {
    flexShrink: 0,
  },
  title: {
    ...Typography.sectionTitle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textMuted,
  },
  subtitle: {
    ...Typography.caption,
    color: AppColors.textMuted,
    marginTop: 2,
  },
});
