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
import { Button } from '../../components/Button';
import { FormInput } from '../../components/FormInput';
import { useApp } from '../../context/AppContext';
import { AppColors, borderRadius } from '../../constants/theme';

type GenderOption = { label: string; value: string };
const GENDER_OPTIONS: GenderOption[] = [
  { label: 'Not specified', value: '' },
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export default function OnboardingAvatarBioScreen() {
  const router = useRouter();
  const { completeOnboardingStep, saveOnboardingData } = useApp();

  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const bioLength = bio.length;
  const bioMaxLength = 160;
  const isOverLimit = bioLength > bioMaxLength;

  const handleSkip = async () => {
    setIsLoading(true);
    saveOnboardingData({ gender, bio });
    await new Promise((r) => setTimeout(r, 300));
    completeOnboardingStep();
    setIsLoading(false);
    router.replace('/auth/onboarding-find-friends');
  };

  const handleContinue = async () => {
    if (isOverLimit) return;
    setIsLoading(true);
    saveOnboardingData({ gender, bio });
    await new Promise((r) => setTimeout(r, 300));
    completeOnboardingStep();
    setIsLoading(false);
    router.replace('/auth/onboarding-find-friends');
  };

  // Progress indicator (4 steps: fullName, displayName, avatar/bio, find friends)
  const [step1Active, step2Active, step3Active, step4Active] = [false, false, true, false];

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

          {/* Heading */}
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>
            Add a photo and write a short bio to help others get to know you.
          </Text>

          {/* Avatar placeholder */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarWrapper} activeOpacity={0.75}>
              <View style={styles.avatarPlaceholder}>
                <Feather name="camera" size={28} color={AppColors.textMuted} strokeWidth={1.8} />
              </View>
              <View style={styles.addBadge}>
                <Feather name="plus" size={14} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.uploadText}>Add photo</Text>
            </TouchableOpacity>
          </View>

          {/* Gender picker */}
          <View style={styles.genderSection}>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.genderPickerRow}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.genderOption,
                    gender === opt.value && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGender(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      gender === opt.value && styles.genderOptionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bio */}
          <View style={styles.formSection}>
            <View style={styles.bioLabelRow}>
              <Text style={styles.label}>Bio</Text>
              <Text
                style={[
                  styles.charCount,
                  isOverLimit && styles.charCountError,
                ]}
              >
                {bioLength}/{bioMaxLength}
              </Text>
            </View>
            <View
              style={[
                styles.bioInputWrapper,
                isOverLimit && styles.bioInputError,
              ]}
            >
              <FormInput
                placeholder="Tell us about yourself..."
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={bioMaxLength + 20}
                style={styles.bioInput}
              />
            </View>
            {bio.length === 0 && (
              <Text style={styles.bioHint}>
                Write something fun or leave it blank for now.
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Finish Setup"
              onPress={handleContinue}
              loading={isLoading}
              disabled={isOverLimit}
              size="lg"
              style={styles.finishBtn}
            />
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  avatarWrapper: {
    position: 'relative',
    width: 108,
    height: 108,
  },
  avatarPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: AppColors.surface,
    borderWidth: 2,
    borderColor: AppColors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: AppColors.background,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
    letterSpacing: -0.1,
  },
  genderSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    letterSpacing: -0.1,
    marginBottom: 10,
  },
  genderPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  genderOptionSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  genderOptionText: {
    fontSize: 13,
    color: AppColors.text,
  },
  genderOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  formSection: { marginBottom: 24 },
  bioLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
    letterSpacing: -0.1,
  },
  charCount: {
    fontSize: 13,
    color: AppColors.textMuted,
  },
  charCountError: {
    color: AppColors.error,
    fontWeight: '600',
  },
  bioInputWrapper: {
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    minHeight: 100,
  },
  bioInputError: {
    borderColor: AppColors.error,
    backgroundColor: '#FDF6F6',
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  bioHint: {
    marginTop: 6,
    fontSize: 13,
    color: AppColors.textMuted,
  },
  actions: { gap: 14 },
  finishBtn: { width: '100%' },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    color: AppColors.textMuted,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
