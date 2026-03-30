import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { FormInput } from "../../components/FormInput";
import { Button } from "../../components/Button";
import { useApp } from "../../context/AppContext";
import { AppColors, borderRadius } from "../../constants/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, authError } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isFormFilled =
    email.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0;

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError("Email is required.");
    } else if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("Password is required.");
    } else if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
    } else {
      setPasswordError("");
      if (confirmPassword && confirmPassword !== value) {
        setConfirmError("Passwords do not match.");
      } else {
        setConfirmError("");
      }
    }
  };

  const validateConfirm = (value: string) => {
    if (!value) {
      setConfirmError("Please confirm your password.");
    } else if (value !== password) {
      setConfirmError("Passwords do not match.");
    } else {
      setConfirmError("");
    }
  };

  const handleRegister = async () => {
    validateEmail(email);
    validatePassword(password);
    validateConfirm(confirmPassword);
    if (emailError || passwordError || confirmError) return;

    setIsLoading(true);
    // Backend requires username; use email prefix as placeholder
    // Real username will be set during onboarding
    const success = await register(email, password, email.split("@")[0]);
    setIsLoading(false);
    if (success) {
      router.replace("/auth/onboarding-name");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Join UITVibes and start sharing your vibe.
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
              placeholder="Create a password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) validatePassword(text);
              }}
              onBlur={() => validatePassword(password)}
              error={passwordError}
              hint="Must be at least 6 characters."
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={AppColors.iconMuted}
                  />
                </TouchableOpacity>
              }
            />

            <FormInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (confirmError) validateConfirm(text);
              }}
              onBlur={() => validateConfirm(confirmPassword)}
              error={confirmError}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
            />

            {authError ? (
              <Text style={styles.authError}>{authError}</Text>
            ) : null}
          </View>

          {/* Register Button */}
          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            disabled={!isFormFilled}
            size="lg"
            style={styles.registerBtn}
          />

          {/* Terms */}
          <Text style={styles.termsText}>
            By creating an account, you agree to our{" "}
            <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{" "}
            <Text
              style={styles.logInLink}
              onPress={() => router.push("/auth/login")}
            >
              Log in
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
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
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
  registerBtn: {
    marginBottom: 16,
  },
  termsText: {
    fontSize: 12,
    color: AppColors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: -0.05,
  },
  termsLink: {
    color: AppColors.primary,
    fontWeight: "600",
  },
  authError: {
    marginTop: 8,
    fontSize: 13,
    color: "#D64545",
  },
  footer: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.border,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: AppColors.textMuted,
    letterSpacing: -0.1,
  },
  logInLink: {
    color: AppColors.primary,
    fontWeight: "700",
  },
});
