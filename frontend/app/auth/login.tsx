import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { FormInput } from "../../components/FormInput";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";
import { useApp } from "../../context/AppContext";
import { AppColors, borderRadius } from "../../constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login} = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const modalScale = useState(new Animated.Value(0.8))[0];
  const modalOpacity = useState(new Animated.Value(0))[0];

  const isFormFilled = email.trim().length > 0 && password.trim().length > 0;

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
    }
  };

  const handleLogin = async () => {
    validateEmail(email);
    validatePassword(password);
    if (emailError || passwordError) return;

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result) {
        router.replace("/(tabs)/home");
      }
    } catch (err: any) {
      if (err?.errorCode === "NOT_VERIFIED") {
        handleNotVerified(err?.email ?? email);
      } else {
        // Fallback: show inline error for other errors
        setToastType("error");
        setToastMessage(err?.message ?? "Login failed. Please try again.");
        setToastVisible(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotVerified = (errEmail: string) => {
    setPendingEmail(errEmail);
    setVerifyModalVisible(true);
    Animated.parallel([
      Animated.spring(modalScale, { toValue: 1, friction: 8, tension: 65, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handleVerifyNow = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(modalScale, { toValue: 0.8, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setVerifyModalVisible(false);
      router.push({ pathname: "/auth/email-verification", params: { email: pendingEmail, fromLogin: "1" } });
    });
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
          {/* Logo / Brand */}
          <View style={styles.logoSection}>
            <Image
              source={require("../../assets/images/UITVibesLogo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
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
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={AppColors.iconMuted}
                  />
                </TouchableOpacity>
              }
            />

          
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
            Don't have an account?{" "}
            <Text
              style={styles.signUpLink}
              onPress={() => router.push("/auth/register")}
            >
              Sign up
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      <Modal
        visible={verifyModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVerifyModalVisible(false)}
        >
          <Animated.View
            style={[
              styles.modalCard,
              { opacity: modalOpacity, transform: [{ scale: modalScale }] },
            ]}
          >
            <View style={styles.modalIconWrap}>
              <Feather name="mail" size={32} color={AppColors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.modalTitle}>Verify your email</Text>
            <Text style={styles.modalMessage}>
              Your account is not verified yet. Please verify your email to continue.
            </Text>
            <Text style={styles.modalEmail}>{pendingEmail}</Text>
            <Button
              title="Verify Now"
              onPress={handleVerifyNow}
              size="lg"
              style={styles.modalBtn}
            />
            <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
              <Text style={styles.modalLater}>Maybe later</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
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
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  headingSection: {
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
  forgotLink: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  logInBtn: {
    marginBottom: 24,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
  },
  socialSection: {
    gap: 12,
  },
  authError: {
    marginTop: 8,
    fontSize: 13,
    color: "#D64545",
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 50,
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppColors.text,
    letterSpacing: -0.1,
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
  signUpLink: {
    color: AppColors.primary,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.xl,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${AppColors.primary}14`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.text,
    marginBottom: 10,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 6,
  },
  modalEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.text,
    marginBottom: 24,
  },
  modalBtn: {
    width: "100%",
    marginBottom: 12,
  },
  modalLater: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textMuted,
    letterSpacing: -0.1,
  },
});
