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

export default function OnboardingFullNameScreen() {
  const router = useRouter();
  const { saveOnboardingData } = useApp();

  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isFormFilled = fullName.trim().length > 0;

  const validateFullName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Full name is required.');
      return false;
    }
    if (trimmed.length < 2) {
      setError('Full name must be at least 2 characters.');
      return false;
    }
    if (trimmed.length > 100) {
      setError('Full name must be less than 100 characters.');
      return false;
    }
    setError('');
    return true;
  };

  const handleContinue = async () => {
    if (!validateFullName(fullName)) return;

    setIsLoading(true);
    saveOnboardingData({ fullName: fullName.trim() });
    await new Promise((r) => setTimeout(r, 300));
    setIsLoading(false);
    router.push('/auth/onboarding-username');
  };

  // Progress indicator (4 steps: fullName, displayName, avatar/bio, find friends)
  const [step1Active, step2Active, step3Active, step4Active] = [true, false, false, false];

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
            <View style={[styles.progressDot, step1Active && styles.progressDotActive]} />
            <View style={[styles.progressDot, step2Active && styles.progressDotActive]} />
            <View style={[styles.progressDot, step3Active && styles.progressDotActive]} />
            <View style={[styles.progressDot, step4Active && styles.progressDotActive]} />
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
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.subtitle}>
            Enter your full name so friends can recognize you. This can be updated later in your profile settings.
          </Text>

          {/* Full name preview */}
          {fullName.trim().length > 0 && (
            <View style={styles.namePreview}>
              <Feather name="user" size={18} color={AppColors.textMuted} style={{ marginRight: 8 }} />
              <Text style={styles.previewName} numberOfLines={1}>
                {fullName.trim()}
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formSection}>
            <FormInput
              placeholder="Your full name"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (error) setError('');
              }}
              onBlur={() => validateFullName(fullName)}
              error={error}
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="name"
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
  namePreview: {
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
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
    letterSpacing: -0.2,
  },
  formSection: { marginBottom: 24 },
});
