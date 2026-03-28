import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FormInput } from '../../components/FormInput';
import { Button } from '../../components/Button';
import { useApp } from '../../context/AppContext';
import { AppColors, borderRadius } from '../../constants/theme';

export default function OnboardingUsernameScreen() {
  const router = useRouter();
  const { completeOnboardingStep, saveOnboardingData } = useApp();

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isFormFilled = username.trim().length > 0;

  const validateUsername = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Username is required.');
      return false;
    }
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters.');
      return false;
    }
    if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
      setError('Only letters, numbers, periods, and underscores allowed.');
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = async () => {
    if (!validateUsername(username)) return;
    setIsLoading(true);
    saveOnboardingData({ username: username.trim() });
    await new Promise((r) => setTimeout(r, 300));
    completeOnboardingStep();
    setIsLoading(false);
    router.push('/auth/onboarding-avatar-bio');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress indicator */}
          <View style={styles.progressRow}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>

          {/* Back */}
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={AppColors.text} />
          </TouchableOpacity>

          {/* Heading */}
          <Text style={styles.title}>Choose your username</Text>
          <Text style={styles.subtitle}>
            Pick a unique handle for your profile. You can always change it later.
          </Text>

          {/* Username preview */}
          {username.trim().length > 0 && (
            <View style={styles.usernamePreview}>
              <Text style={styles.previewAt}>@</Text>
              <Text style={styles.previewHandle} numberOfLines={1}>
                {username.replace(/\s+/g, '_').toLowerCase()}
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formSection}>
            <FormInput
              placeholder="username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (error) validateUsername(text);
              }}
              onBlur={() => validateUsername(username)}
              error={error}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              autoFocus
            />
          </View>

          <Button
            title="Continue"
            onPress={handleContinue}
            loading={isLoading}
            disabled={!isFormFilled}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
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
  backRow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  usernamePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 24,
    overflow: 'hidden',
  },
  previewAt: {
    fontSize: 16,
    color: AppColors.textMuted,
    marginRight: 2,
  },
  previewHandle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  formSection: { marginBottom: 24 },
});
