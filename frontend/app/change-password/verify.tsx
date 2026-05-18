import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '../../components/ScreenHeader';
import OTPInput, { OTPInputRef } from '../../components/OTPInput';
import { FormInput } from '../../components/FormInput';
import { resetPassword } from '../../services/authService';
import { getCurrentUserEmail } from '../../services/session';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

const OTP_LENGTH = 6;

export default function ChangePasswordVerifyScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailLoaded, setEmailLoaded] = useState(false);
  const otpRef = useRef<OTPInputRef>(null);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otpCode = useMemo(() => otp.join(''), [otp]);
  const canSubmit = useMemo(() => {
    return (
      emailLoaded &&
      !!userEmail?.trim() &&
      otpCode.trim().length === OTP_LENGTH &&
      newPassword.trim().length > 0
    );
  }, [emailLoaded, userEmail, otpCode, newPassword]);

  useEffect(() => {
    let mounted = true;
    const loadEmail = async () => {
      const stored = await getCurrentUserEmail();
      if (!mounted) return;
      setUserEmail(stored);
      setEmailLoaded(true);
    };
    void loadEmail();
    return () => {
      mounted = false;
    };
  }, []);

  const validate = () => {
    if (!emailLoaded) {
      return 'Loading your account details. Please try again.';
    }
    if (!userEmail?.trim()) {
      return 'Email is required to reset your password.';
    }
    if (otpCode.trim().length !== OTP_LENGTH) {
      return 'Verification code must be 6 digits.';
    }
    if (!newPassword.trim()) return 'New password is required.';
    if (newPassword.trim().length < 6) {
      return 'New password must be at least 6 characters.';
    }
    if (!confirmPassword.trim()) {
      return 'Please confirm your new password.';
    }
    if (confirmPassword.trim() !== newPassword.trim()) {
      return 'Passwords do not match.';
    }
    return '';
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      await resetPassword(userEmail ?? '', otpCode, newPassword);
      Alert.alert('Success', 'Your password has been updated.');
      router.replace('/settings' as any);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Confirm Change" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Enter the OTP and new password</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to your email. Enter it below to finish.
          </Text>

          <OTPInput ref={otpRef} value={otp} onChange={setOtp} />

          <View style={styles.spacer} />

          <FormInput
            label="New password"
            placeholder="Create a new password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
          />

          <FormInput
            label="Confirm new password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={AppColors.iconMuted}
                />
              </TouchableOpacity>
            }
          />

          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  title: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.body,
    color: AppColors.textMuted,
    marginBottom: 18,
  },
  spacer: {
    height: 16,
  },
  errorText: {
    ...Typography.caption,
    color: AppColors.error,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    ...Typography.bodySemibold,
    color: '#fff',
  },
});
