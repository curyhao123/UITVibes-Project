import { Feather } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { borderRadius, layoutPadding, type ThemeColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

interface BlockedAccountsSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const BlockedAccountsSearchBar = memo(function BlockedAccountsSearchBar({
  value,
  onChangeText,
}: BlockedAccountsSearchBarProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Feather
        name="search"
        size={16}
        color={colors.iconMuted}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search blocked accounts"
        placeholderTextColor={colors.textMuted}
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
          <View style={[styles.clearBtn, { backgroundColor: colors.textMuted }]}>
            <Feather name="x" size={12} color={colors.surface} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginHorizontal: layoutPadding,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: colors.text,
    padding: 0,
    height: '100%',
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
