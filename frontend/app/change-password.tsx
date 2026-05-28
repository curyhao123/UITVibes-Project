import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ScreenHeader } from '../components/ScreenHeader';
import { CompactHeader } from '../components/StaticPremiumHeader';
import { FormInput } from '../components/FormInput';
import { getCurrentUserEmail } from '../services/session';
import { sendChangePasswordOtp } from '../services/authService';
import { AppColors, borderRadius, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailLoaded, setEmailLoaded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      emailLoaded &&
      !!userEmail?.trim() &&
      currentPassword.trim().length > 0 &&
      confirmPassword.trim().length > 0
    );
  }, [emailLoaded, userEmail, currentPassword, confirmPassword]);

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
    const current = currentPassword.trim();
    const confirm = confirmPassword.trim();

    if (!userEmail?.trim()) {
      return 'Your account email is missing. Please log in again.';
    }
    if (!current) return 'Current password is required.';
    if (current.length < 6) return 'Current password must be at least 6 characters.';
    if (!confirm) return 'Please confirm your current password.';
    if (confirm !== current) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async () => {
    if (!emailLoaded) {
      setSubmitError('Loading your account details. Please try again.');
      return;
    }
    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    try {
      await sendChangePasswordOtp(currentPassword);
      router.push('/change-password/verify' as any);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CompactHeader title="Change Password" showBack onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Verify your current password</Text>
          <Text style={styles.subtitle}>
            Enter your current password to request a one-time code.
          </Text>

          <FormInput
            label="Current password"
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
          />

          <FormInput
            label="Confirm current password"
            placeholder="Re-enter current password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
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
              <Text style={styles.primaryBtnText}>Send OTP</Text>
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
