import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as api from "../../services/api";
import { saveTokens } from "../../services/httpClient";
import { setCurrentUser, setCurrentUserId } from "../../services/session";
import { Button } from "../../components/Button";
import { Toast } from "../../components/Toast";
import { AppColors, borderRadius } from "../../constants/theme";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { email, fromLogin } = useLocalSearchParams<{ email?: string; fromLogin?: string }>();
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
        // ── Luồng 1: Register → Verify → Token đã có từ register ──
        await api.verifyEmail(verifiedEmail, code);
        console.log("[Verify] Email verified (register flow). Navigating to onboarding.");
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
            <Feather name="arrow-left" size={18} color={AppColors.text} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Feather name="mail" size={36} color={AppColors.primary} strokeWidth={1.5} />
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
              <Feather name="alert-circle" size={14} color={AppColors.error} strokeWidth={2} />
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
            <Text style={styles.resendLabel}>Didn't receive the code?</Text>
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
    paddingBottom: 40,
  },
  backRow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${AppColors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: AppColors.text,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textMuted,
    lineHeight: 22,
    marginBottom: 36,
    letterSpacing: -0.1,
  },
  emailHighlight: {
    color: AppColors.text,
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
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.surface,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.text,
    letterSpacing: 0,
  },
  otpBoxFilled: {
    borderColor: AppColors.primary,
    backgroundColor: `${AppColors.primary}08`,
  },
  otpBoxError: {
    borderColor: AppColors.error,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: AppColors.error,
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
    color: AppColors.textMuted,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "700",
    color: AppColors.primary,
    letterSpacing: -0.1,
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textMuted,
    letterSpacing: -0.1,
  },
});
