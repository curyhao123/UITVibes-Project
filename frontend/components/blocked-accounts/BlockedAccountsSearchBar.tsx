import React, { memo, useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

interface BlockedAccountsSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const BlockedAccountsSearchBar = memo(function BlockedAccountsSearchBar({
  value,
  onChangeText,
}: BlockedAccountsSearchBarProps) {
  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={styles.container}>
      <Feather
        name="search"
        size={16}
        color={AppColors.textMuted}
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search blocked accounts"
        placeholderTextColor={AppColors.textMuted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <View style={styles.clearBtn}>
            <Feather name="x" size={12} color={AppColors.surface} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: layoutPadding,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: AppColors.text,
    padding: 0,
    height: '100%',
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
