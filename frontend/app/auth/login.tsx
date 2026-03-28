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
import { DEMO_ACCOUNTS } from '../../services/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isFormFilled = email.trim().length > 0 && password.trim().length > 0;

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError('Email is required.');
    } else if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError('Password is required.');
    } else if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
    } else {
      setPasswordError('');
    }
  };

  const handleLogin = async () => {
    validateEmail(email);
    validatePassword(password);
    if (emailError || passwordError) return;

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) {
      router.replace('/(tabs)/home');
    }
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
          {/* Logo / Brand */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Feather name="music" size={36} color={AppColors.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.brandName}>UITVibes</Text>
          </View>

          {/* Heading */}
          <View style={styles.headingSection}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue sharing your vibe.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <FormInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) validateEmail(text);
              }}
              onBlur={() => validateEmail(email)}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <FormInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) validatePassword(text);
              }}
              onBlur={() => validatePassword(password)}
              error={passwordError}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={AppColors.iconMuted}
                  />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity style={styles.forgotLink} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Log In Button */}
          <Button
            title="Log In"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!isFormFilled}
            size="lg"
            style={styles.logInBtn}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Demo accounts */}
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionTitle}>Try a demo account</Text>
            <TouchableOpacity
              style={styles.demoBtn}
              activeOpacity={0.7}
              onPress={() => {
                setEmail(DEMO_ACCOUNTS.newUser.email);
                setPassword(DEMO_ACCOUNTS.newUser.password);
                setEmailError('');
                setPasswordError('');
              }}
            >
              <View style={[styles.demoAvatar, { backgroundColor: '#E8F4FD' }]}>
                <Text style={styles.demoAvatarText}>🆕</Text>
              </View>
              <View style={styles.demoInfo}>
                <Text style={styles.demoName}>{DEMO_ACCOUNTS.newUser.label}</Text>
                <Text style={styles.demoDesc}>{DEMO_ACCOUNTS.newUser.description}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={AppColors.iconMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              activeOpacity={0.7}
              onPress={() => {
                setEmail(DEMO_ACCOUNTS.activeUser.email);
                setPassword(DEMO_ACCOUNTS.activeUser.password);
                setEmailError('');
                setPasswordError('');
              }}
            >
              <View style={[styles.demoAvatar, { backgroundColor: '#E8F8EE' }]}>
                <Text style={styles.demoAvatarText}>🔥</Text>
              </View>
              <View style={styles.demoInfo}>
                <Text style={styles.demoName}>{DEMO_ACCOUNTS.activeUser.label}</Text>
                <Text style={styles.demoDesc}>{DEMO_ACCOUNTS.activeUser.description}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={AppColors.iconMuted} />
            </TouchableOpacity>
          </View>

          {/* Social logins */}
          <View style={styles.socialSection}>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
              <Feather name="facebook" size={20} color={AppColors.text} />
              <Text style={styles.socialBtnText}>Continue with Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
              <Feather name="smartphone" size={20} color={AppColors.text} />
              <Text style={styles.socialBtnText}>Continue with Phone</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text
              style={styles.signUpLink}
              onPress={() => router.push('/auth/register')}
            >
              Sign up
            </Text>
          </Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 16,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FDF0EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: -0.5,
  },
  headingSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textMuted,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  formSection: {
    marginBottom: 8,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  logInBtn: {
    marginBottom: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AppColors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  socialSection: {
    gap: 12,
  },
  demoSection: {
    marginBottom: 24,
  },
  demoSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.iconMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 10,
  },
  demoAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  demoAvatarText: {
    fontSize: 20,
  },
  demoInfo: {
    flex: 1,
  },
  demoName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 2,
  },
  demoDesc: {
    fontSize: 12,
    color: AppColors.textMuted,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
    letterSpacing: -0.1,
  },
  footer: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: AppColors.textMuted,
    letterSpacing: -0.1,
  },
  signUpLink: {
    color: AppColors.primary,
    fontWeight: '700',
  },
});
