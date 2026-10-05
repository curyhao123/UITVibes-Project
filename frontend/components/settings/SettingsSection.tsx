import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';

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
 * - Adapts dynamically to light and dark theme mode
 */
export const SettingsSection = memo(function SettingsSection({
  title,
  children,
}: SettingsSectionProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderWidth: isDark ? 1 : 0,
            shadowColor: isDark ? '#000000' : '#2D3748',
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...Typography.meta,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginHorizontal: layoutPadding,
  },
  card: {
    borderRadius: borderRadius.lg,
    marginHorizontal: layoutPadding,
    overflow: 'hidden',
    // Subtle shadow — premium card depth without being heavy
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
