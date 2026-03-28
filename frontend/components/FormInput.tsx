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
import { AppColors, borderRadius } from '../constants/theme';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: React.ReactNode;
}

export function FormInput({ label, error, hint, rightIcon, style, ...props }: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          hasError && styles.inputError,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={AppColors.textMuted}
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
            <Feather name="x-circle" size={18} color={AppColors.iconMuted} />
          </TouchableOpacity>
        )}
      </View>
      {hasError && (
        <Text style={styles.errorText}>
          <Feather name="alert-circle" size={13} color={AppColors.error} /> {error}
        </Text>
      )}
      {hint && !hasError && <Text style={styles.hintText}>{hint}</Text>}
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
    color: AppColors.text,
    marginBottom: 6,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputFocused: {
    borderColor: AppColors.primary,
    backgroundColor: '#FDF8F6',
  },
  inputError: {
    borderColor: AppColors.error,
    backgroundColor: '#FDF6F6',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    paddingVertical: 0,
    letterSpacing: -0.15,
  },
  errorText: {
    marginTop: 5,
    fontSize: 13,
    color: AppColors.error,
    letterSpacing: -0.1,
  },
  hintText: {
    marginTop: 5,
    fontSize: 13,
    color: AppColors.textMuted,
    letterSpacing: -0.1,
  },
});
