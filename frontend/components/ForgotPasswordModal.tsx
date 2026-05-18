/**
 * ForgotPasswordModal — 2-step modal for password recovery.
 *
 * Step 1: Enter email → request OTP via POST /api/auth/forgot-password
 * Step 2: Enter 6-digit OTP + new password + confirm password → POST /api/auth/reset-password
 *
 * Features:
 * - Animated step transitions (slide/fade)
 * - Step 1: Email validation + loading state + error display
 * - Step 2: Elegant 6-digit OTP input + password + confirm password
 * - Password strength hint + match validation
 * - 60-second resend countdown
 * - Toast notifications for success/error
 * - Keyboard-aware layout
 * - Accessible with proper labels
 *
 * Props:
 *   visible: boolean — controls modal visibility
 *   onClose: () => void — called when user dismisses the modal
 *   onSuccess: () => void — called after password is successfully reset
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { AppColors, borderRadius } from "../constants/theme";
import { Typography } from "../constants/typography";
import { Button } from "./Button";
import { Toast } from "./Toast";
import OTPInput from "./OTPInput";
import { forgotPassword, resetPassword } from "../services/authService";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Password Strength Indicator ──────────────────────────────────────────────

function getPasswordStrength(password: string): {
  label: string;
  color: string;
  width: string;
} {
  const len = password.length;
  if (len === 0) return { label: "", color: "transparent", width: "0%" };
  if (len < 6) return { label: "Too short", color: AppColors.error, width: "20%" };
  if (len < 8) return { label: "Weak", color: "#F59E0B", width: "40%" };
  if (len < 12) return { label: "Good", color: "#3B82F6", width: "70%" };
  return { label: "Strong", color: AppColors.success, width: "95%" };
}

// ─── Step 1: Email Input ──────────────────────────────────────────────────────

interface Step1Props {
  onNext: (email: string) => void;
  isSubmitting: boolean;
  submitError: string;
}

function ForgotPasswordStep1({ onNext, isSubmitting, submitError }: Step1Props) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [localError, setLocalError] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError("Email is required.");
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleChange = (value: string) => {
    setEmail(value);
    if (emailError) validate(value);
    if (localError) setLocalError("");
  };

  const handleBlur = () => validate(email);

  const handleSubmit = () => {
    if (!validate(email)) return;
    if (isSubmitting) return;
    setLocalError("");
    onNext(email.trim().toLowerCase());
  };

  const displayError = emailError || localError || submitError;
  const canSubmit = email.trim().length > 0 && !emailError;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={stepStyles.content}
    >
      {/* Icon */}
      <View style={stepStyles.iconWrap}>
        <Feather
          name="lock"
          size={32}
          color={AppColors.primary}
          strokeWidth={1.5}
        />
      </View>

      {/* Heading */}
      <Text style={stepStyles.title}>Forgot password?</Text>
      <Text style={stepStyles.subtitle}>
        Enter your email address and we'll send you a code to reset your password.
      </Text>

      {/* Email input */}
      <View style={stepStyles.inputWrap}>
        <Text style={stepStyles.label}>Email address</Text>
        <TextInput
          style={[
            stepStyles.input,
            displayError && styles.inputError,
          ]}
          placeholder="you@example.com"
          placeholderTextColor={AppColors.iconMuted}
          value={email}
          onChangeText={handleChange}
          onBlur={handleBlur}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!isSubmitting}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {displayError ? (
          <View style={stepStyles.errorRow}>
            <Feather
              name="alert-circle"
              size={13}
              color={AppColors.error}
              strokeWidth={2}
            />
            <Text style={stepStyles.errorText}>{displayError}</Text>
          </View>
        ) : null}
      </View>

      {/* Submit */}
      <Button
        title="Send code"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        size="lg"
        style={stepStyles.submitBtn}
      />
    </Animated.View>
  );
}

// ─── Step 2: OTP + New Password ──────────────────────────────────────────────

interface Step2Props {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
  isSubmitting: boolean;
  submitError: string;
}

function ForgotPasswordStep2({
  email,
  onBack,
  onSuccess,
  isSubmitting,
  submitError,
}: Step2Props) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [localError, setLocalError] = useState("");
  const otpInputRef = useRef<{ focus: () => void; clear: () => void } | null>(null);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Start countdown on step 2 mount
  useEffect(() => {
    setResendCountdown(RESEND_COOLDOWN);
  }, []);

  const allDigitsFilled = otp.every((d) => d.length === 1);
  const otpCode = otp.join("");

  // Password strength
  const strength = getPasswordStrength(password);

  // Validation
  const passwordError =
    password.length > 0 && password.length < 6
      ? "Password must be at least 6 characters."
      : "";
  const confirmError =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "Passwords do not match."
      : "";
  const displayError = localError || submitError;

  const canSubmit =
    allDigitsFilled &&
    otpCode.length === OTP_LENGTH &&
    password.length >= 6 &&
    password === confirmPassword &&
    !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLocalError("");
    try {
      await resetPassword(email, otpCode, password);
      onSuccess();
    } catch (err: any) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Failed to reset password. Please check your code.",
      );
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    setLocalError("");
    try {
      await forgotPassword(email);
      setResendCountdown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
      otpInputRef.current?.clear();
    } catch (err: any) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to resend code.",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(150)}
      style={stepStyles.content}
    >
      {/* Icon */}
      <View style={stepStyles.iconWrap}>
        <Feather
          name="lock"
          size={32}
          color={AppColors.primary}
          strokeWidth={1.5}
        />
      </View>

      {/* Heading */}
      <Text style={stepStyles.title}>Reset password</Text>
      <Text style={stepStyles.subtitle}>
        Enter the 6-digit code sent to{"\n"}
        <Text style={stepStyles.emailHighlight}>{email}</Text>
      </Text>

      {/* OTP Input */}
      <View style={stepStyles.otpSection}>
        <OTPInput
          ref={otpInputRef}
          value={otp}
          onChange={(newOtp) => {
            setOtp(newOtp);
            if (localError) setLocalError("");
          }}
          autoFocus
          editable={!isSubmitting}
          length={OTP_LENGTH}
        />
      </View>

      {/* Password input */}
      <View style={stepStyles.inputWrap}>
        <Text style={stepStyles.label}>New password</Text>
        <View style={stepStyles.passwordWrap}>
          <TextInput
            style={[stepStyles.input, stepStyles.passwordInput, passwordError && styles.inputError]}
            placeholder="At least 6 characters"
            placeholderTextColor={AppColors.iconMuted}
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (localError) setLocalError("");
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            returnKeyType="next"
          />
          <TouchableOpacity
            style={stepStyles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={18}
              color={AppColors.iconMuted}
            />
          </TouchableOpacity>
        </View>
        {/* Password strength bar */}
        {password.length > 0 && (
          <View style={stepStyles.strengthBarWrap}>
            <View
              style={[
                stepStyles.strengthBar,
                {
                  width: strength.width,
                  backgroundColor: strength.color,
                },
              ]}
            />
            <Text style={[stepStyles.strengthLabel, { color: strength.color }]}>
              {strength.label}
            </Text>
          </View>
        )}
        {passwordError ? (
          <View style={stepStyles.errorRow}>
            <Feather name="alert-circle" size={13} color={AppColors.error} strokeWidth={2} />
            <Text style={stepStyles.errorText}>{passwordError}</Text>
          </View>
        ) : null}
      </View>

      {/* Confirm password */}
      <View style={stepStyles.inputWrap}>
        <Text style={stepStyles.label}>Confirm password</Text>
        <View style={stepStyles.passwordWrap}>
          <TextInput
            style={[
              stepStyles.input,
              stepStyles.passwordInput,
              confirmError && styles.inputError,
            ]}
            placeholder="Re-enter your password"
            placeholderTextColor={AppColors.iconMuted}
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (localError) setLocalError("");
            }}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity
            style={stepStyles.eyeBtn}
            onPress={() => setShowConfirm(!showConfirm)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather
              name={showConfirm ? "eye-off" : "eye"}
              size={18}
              color={AppColors.iconMuted}
            />
          </TouchableOpacity>
        </View>
        {confirmError ? (
          <View style={stepStyles.errorRow}>
            <Feather name="alert-circle" size={13} color={AppColors.error} strokeWidth={2} />
            <Text style={stepStyles.errorText}>{confirmError}</Text>
          </View>
        ) : null}
      </View>

      {/* Global error */}
      {displayError ? (
        <View style={stepStyles.globalErrorRow}>
          <Feather name="alert-triangle" size={15} color={AppColors.error} strokeWidth={2} />
          <Text style={stepStyles.globalErrorText}>{displayError}</Text>
        </View>
      ) : null}

      {/* Submit */}
      <Button
        title="Reset password"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!canSubmit}
        size="lg"
        style={stepStyles.submitBtn}
      />

      {/* Resend */}
      <View style={stepStyles.resendRow}>
        <Text style={stepStyles.resendLabel}>Didn't receive the code?</Text>
        {resendCountdown > 0 ? (
          <Text style={stepStyles.countdownText}>Resend in {resendCountdown}s</Text>
        ) : (
          <TouchableOpacity
            onPress={handleResend}
            disabled={isResending}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={[stepStyles.resendLink, isResending && stepStyles.resendLinkDisabled]}>
              {isResending ? "Sending..." : "Resend code"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Back */}
      <TouchableOpacity style={stepStyles.backRow} onPress={onBack} disabled={isSubmitting}>
        <Feather name="arrow-left" size={15} color={AppColors.textMuted} />
        <Text style={stepStyles.backText}>Back</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Modal Component ──────────────────────────────────────────────────────

export function ForgotPasswordModal({
  visible,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setStep(1);
      setEmail("");
      setIsSubmitting(false);
      setSubmitError("");
      setToastVisible(false);
    }
  }, [visible]);

  const handleStep1Next = async (inputEmail: string) => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await forgotPassword(inputEmail);
      setEmail(inputEmail);
      setStep(2);
    } catch (err: any) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to send code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccess = () => {
    setToastType("success");
    setToastMessage("Password reset successfully! You can now log in with your new password.");
    setToastVisible(true);
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 1800);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={modalStyles.header}>
          <TouchableOpacity
            style={modalStyles.closeBtn}
            onPress={handleClose}
            disabled={isSubmitting}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={20} color={AppColors.text} />
          </TouchableOpacity>
          <View style={modalStyles.progressWrap}>
            <View
              style={[
                modalStyles.progressDot,
                step >= 1 && modalStyles.progressDotActive,
              ]}
            />
            <View style={modalStyles.progressLine} />
            <View
              style={[
                modalStyles.progressDot,
                step >= 2 && modalStyles.progressDotActive,
              ]}
            />
          </View>
          <View style={modalStyles.closeBtn} />
        </View>

        <ScrollView
          style={modalStyles.scroll}
          contentContainerStyle={modalStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 ? (
            <ForgotPasswordStep1
              onNext={handleStep1Next}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          ) : (
            <ForgotPasswordStep2
              email={email}
              onBack={() => setStep(1)}
              onSuccess={handleSuccess}
              isSubmitting={isSubmitting}
              submitError={submitError}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </Modal>
  );
}

export default ForgotPasswordModal;

// ─── Styles ───────────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 4 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.background,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.border,
  },
  progressDotActive: {
    backgroundColor: AppColors.primary,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: AppColors.border,
    marginHorizontal: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },
});

const stepStyles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${AppColors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: AppColors.text,
    marginBottom: 10,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: AppColors.textMuted,
    lineHeight: 22,
    marginBottom: 32,
    letterSpacing: -0.1,
    textAlign: "center",
  },
  emailHighlight: {
    color: AppColors.text,
    fontWeight: "600",
  },
  inputWrap: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    ...Typography.captionSemibold,
    color: AppColors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0,
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    fontSize: 16,
    color: AppColors.text,
    letterSpacing: -0.1,
  },
  passwordWrap: {
    width: "100%",
    position: "relative",
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  strengthBarWrap: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  strengthBar: {
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 7,
  },
  errorText: {
    fontSize: 13,
    color: AppColors.error,
    letterSpacing: -0.1,
    flex: 1,
  },
  globalErrorRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${AppColors.error}10`,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  globalErrorText: {
    fontSize: 14,
    color: AppColors.error,
    letterSpacing: -0.1,
    flex: 1,
    lineHeight: 20,
  },
  submitBtn: {
    width: "100%",
    marginTop: 4,
    marginBottom: 20,
  },
  otpSection: {
    width: "100%",
    marginBottom: 24,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textMuted,
    letterSpacing: -0.1,
  },
});

const styles = StyleSheet.create({
  inputError: {
    borderColor: AppColors.error,
    backgroundColor: `${AppColors.error}06`,
  },
});
