import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";
import { borderRadius, type ThemeColors } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import * as api from "../../services/api";
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function EmailVerificationScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { email, fromLogin } = useLocalSearchParams<{ email?: string; fromLogin?: string }>();
  const { currentUser, confirmPendingAuth } = useApp();
  const isFromLogin = fromLogin === "1";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [error, setError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Auto-send verification code on mount
  useEffect(() => {
    if (email) {
      handleResend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allDigitsFilled = otp.every((d) => d.length === 1);

  const handleOtpChange = (index: number, value: string) => {
    setError("");

    // Allow only digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      // Move focus to next box
      inputRefs.current[index + 1]?.focus();
    }

    if (digit === "" && index > 0) {
      // Move focus back on backspace
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!allDigitsFilled) return;
    const code = otp.join("");

    setIsVerifying(true);
    setError("");
    try {
      let verifiedEmail = email!;

      if (isFromLogin) {
        // ── Luồng 2: Login → Verify → quay về Login ──
        await api.verifyEmail(verifiedEmail, code);
        setToastType("success");
        setToastMessage("Email verified. Please log in to continue.");
        setToastVisible(true);
        router.replace("/auth/login");
      } else {
        // ── Luồng 1: Register → Verify → complete auth & go to onboarding ──
        await api.verifyEmail(verifiedEmail, code);
        // Activate authentication now — AuthGuard will allow navigation to onboarding
        if (currentUser) {
          confirmPendingAuth(currentUser);
        }
        router.replace("/auth/onboarding-fullname");
      }
    } catch (err: any) {
      console.error("[Verify] Verification failed:", err?.response?.data ?? err);
      setToastType("error");
      setToastMessage(
        err?.response?.data?.message ??
          err?.message ??
          "Invalid or expired OTP code."
      );
      setToastVisible(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;

    setIsResending(true);
    setError("");
    try {
      await api.sendVerificationEmail(email!);
      setResendCountdown(RESEND_COOLDOWN);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Không thể gửi lại mã. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setIsResending(false);
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
          {/* Back */}
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Feather name="mail" size={36} color={colors.primary} strokeWidth={1.5} />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            A verification code has been sent to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* OTP Inputs */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                style={[
                  styles.otpBox,
                  digit.length > 0 && styles.otpBoxFilled,
                  error && otp.every((d) => d === "") && styles.otpBoxError,
                ]}
                value={digit}
                onChangeText={(val) => handleOtpChange(index, val)}
                onKeyPress={(e) => handleKeyPress(index, e)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
                contextMenuHidden
              />
            ))}
          </View>

          {/* Error message */}
          {error ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color={colors.error} strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Verify Button */}
          <Button
            title="Verify"
            onPress={handleVerify}
            loading={isVerifying}
            disabled={!allDigitsFilled}
            size="lg"
            style={styles.verifyBtn}
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn&apos;t receive the code?</Text>
            {resendCountdown > 0 ? (
              <Text style={styles.countdownText}>
                Resend in {resendCountdown}s
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending}>
                <Text
                  style={[
                    styles.resendLink,
                    isResending && styles.resendLinkDisabled,
                  ]}
                >
                  {isResending ? "Sending..." : "Resend"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
  },
  backRow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 36,
    letterSpacing: -0.1,
  },
  emailHighlight: {
    color: colors.text,
    fontWeight: "600",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  otpBoxError: {
    borderColor: colors.error,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    letterSpacing: -0.1,
    flex: 1,
  },
  verifyBtn: {
    marginBottom: 28,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  resendLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: -0.1,
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: -0.1,
  },
});
