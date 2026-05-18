import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

export const BlockedAccountsEmptyState = memo(function BlockedAccountsEmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Feather name="users" size={40} color={AppColors.textMuted} />
      </View>
      <Text style={styles.title}>No blocked accounts</Text>
      <Text style={styles.subtitle}>
        Accounts you block will appear here.
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layoutPadding + 20,
    paddingBottom: 80,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${AppColors.textMuted}14`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
