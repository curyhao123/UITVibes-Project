import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FormInput } from '../../components/FormInput';
import { useApp } from '../../context/AppContext';
import { AppColors, borderRadius } from '../../constants/theme';

export default function OnboardingNameScreen() {
  const router = useRouter();
  const { completeOnboardingStep, saveOnboardingData } = useApp();

  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      setError('Please enter your full name.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    setError('');
    setIsLoading(true);
    saveOnboardingData({ fullName: trimmed });
    await new Promise((r) => setTimeout(r, 300));
    setIsLoading(false);
    completeOnboardingStep();
    router.push('/auth/onboarding-username');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Progress indicator */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>

          {/* Header */}
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>
            Enter your full name so friends can find you.
          </Text>

          {/* Form */}
          <View style={styles.formSection}>
            <FormInput
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (error) setError('');
              }}
              error={error}
              autoFocus
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 48,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.border,
  },
  progressDotActive: {
    backgroundColor: AppColors.primary,
    width: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: AppColors.textMuted,
    lineHeight: 22,
    marginBottom: 36,
  },
  formSection: {
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: AppColors.primary,
    height: 52,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
