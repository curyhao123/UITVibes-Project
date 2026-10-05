import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
}

export function FormInput({ label, error, hint, rightIcon, style, ...props }: FormInputProps) {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          isFocused && {
            borderColor: colors.primary,
            backgroundColor: isDark ? `${colors.primary}18` : '#FDF8F6',
          },
          hasError && {
            borderColor: colors.error,
            backgroundColor: isDark ? `${colors.error}18` : '#FDF6F6',
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.text }, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon}
        {props.value && props.value.length > 0 && !hasError && !rightIcon && (
          <TouchableOpacity
            onPress={() => props.onChangeText?.('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x-circle" size={18} color={colors.iconMuted} />
          </TouchableOpacity>
        )}
      </View>
      {hasError && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          <Feather name="alert-circle" size={13} color={colors.error} /> {error}
        </Text>
      )}
      {hint && !hasError && <Text style={[styles.hintText, { color: colors.textMuted }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    letterSpacing: -0.15,
  },
  errorText: {
    marginTop: 5,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  hintText: {
    marginTop: 5,
    fontSize: 13,
    letterSpacing: -0.1,
  },
});
