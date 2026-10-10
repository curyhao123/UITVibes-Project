/**
 * Google OAuth full-page redirect callback (web only).
 *
 * ── Why this page exists ───────────────────────────────────────────────────
 * On web, `WebBrowser.openAuthSessionAsync` cannot be used because the Expo
 * dev server sets `Cross-Origin-Opener-Policy: same-origin`, which blocks
 * the `window.close` / `window.closed` polling that the popup-based flow
 * relies on — the popup silently times out.
 *
 * Instead, `googleAuthService.loginWithGoogle()` does a full-page redirect
 * via `window.location.assign(googleAuthUrl)`. Google then redirects back
 * to this same-origin URL (`/auth/google-callback?code=...&state=...`).
 *
 * This page:
 *   1. Reads the `code` from the URL.
 *   2. Pulls the PKCE `code_verifier` and `redirectUri` stashed in
 *      localStorage by `loginWithGoogle()` before the redirect.
 *   3. Calls `loginWithGoogleBackend(code, codeVerifier, redirectUri)`.
 *   4. Routes to onboarding (new user) or home (returning user).
 *
 * On native, this page is never reached — the auth proxy + custom scheme
 * handles the callback via `WebBrowser.openAuthSessionAsync`.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { AppColors, borderRadius } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { loginWithGoogleBackend } from "../../services/googleAuthService";

const SS_CODE_VERIFIER = "google_code_verifier";
const SS_REDIRECT_URI = "google_redirect_uri";

type Status = "loading" | "success" | "error";

export default function GoogleCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { loginWithGoogle: _hookLogin } = useApp();
  // We don't actually use the context method here because the heavy lifting
  // (popup, redirect, code extraction) already happened in loginWithGoogle().
  // We just need to land the user in the app and let AppContext pick up the
  // new session via the natural refresh path (or via the next call site).
  void _hookLogin;

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    void runCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCallback = async () => {
    // ── 1. Surface Google's own error response (e.g. access_denied) ────
    if (params.error) {
      setStatus("error");
      setErrorMessage(
        params.error === "access_denied"
          ? "Bạn đã huỷ đăng nhập bằng Google."
          : `Google trả về lỗi: ${params.error}`,
      );
      return;
    }

    const code = params.code;
    if (!code) {
      setStatus("error");
      setErrorMessage(
        "Không tìm thấy authorization code trong URL. Vui lòng thử lại.",
      );
      return;
    }

    // ── 2. Read the stashed PKCE state from localStorage ────────────────
    let codeVerifier = "";
    let redirectUri = "";
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        codeVerifier = window.localStorage.getItem(SS_CODE_VERIFIER) ?? "";
        redirectUri = window.localStorage.getItem(SS_REDIRECT_URI) ?? "";

        // Clean up immediately — we don't want a stale verifier hanging around
        // if the user opens the callback URL in a new tab later.
        window.localStorage.removeItem(SS_CODE_VERIFIER);
        window.localStorage.removeItem(SS_REDIRECT_URI);
      } catch {
        // localStorage disabled — we'll fail below with a clear message.
      }
    }

    if (!codeVerifier) {
      setStatus("error");
      setErrorMessage(
        "Không tìm thấy PKCE code_verifier trong localStorage. " +
          "Có thể bạn đã mở link callback trong tab/incognito khác. Vui lòng thử đăng nhập lại.",
      );
      return;
    }

    if (!redirectUri) {
      // Fallback: reconstruct from current origin. This should always match
      // what we sent to Google (same-origin policy), but logging a warning
      // helps future debugging.
      if (typeof window !== "undefined") {
        redirectUri = `${window.location.origin}/auth/google-callback`;
      }
    }

    // ── 3. Hand off to the service to exchange the code at the backend ─
    try {
      const result = await loginWithGoogleBackend(
        code,
        codeVerifier,
        redirectUri,
      );
      if (!result) {
        setStatus("error");
        setErrorMessage("Đăng nhập Google thất bại. Vui lòng thử lại.");
        return;
      }
      setStatus("success");
      // Brief delay so the user sees the success state before we route away.
      await new Promise((r) => setTimeout(r, 400));
      const target =
        result.isNewUser || result.user.posts === 0
          ? "/auth/onboarding-username"
          : result.user.role === "Admin"
            ? "/admin/dashboard"
            : "/(tabs)/home";
      router.replace(target as any);
    } catch (err: any) {
      console.error("[GoogleCallback] backend error", err);
      setStatus("error");
      setErrorMessage(
        err?.message ??
          "Đăng nhập Google thất bại. Vui lòng thử lại.",
      );
    }
  };

  const handleRetry = () => {
    router.replace("/auth/login");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === "loading" && (
          <>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.title}>Đang hoàn tất đăng nhập…</Text>
            <Text style={styles.subtitle}>
              Đang trao đổi authorization code với Google và tạo phiên của bạn.
            </Text>
          </>
        )}

        {status === "success" && (
          <>
            <View style={styles.iconWrap}>
              <Feather name="check-circle" size={48} color="#22C55E" />
            </View>
            <Text style={styles.title}>Đăng nhập thành công!</Text>
            <Text style={styles.subtitle}>Đang chuyển hướng…</Text>
          </>
        )}

        {status === "error" && (
          <>
            <View style={[styles.iconWrap, styles.iconWrapError]}>
              <Feather name="alert-circle" size={48} color={AppColors.error} />
            </View>
            <Text style={styles.title}>Đăng nhập thất bại</Text>
            <Text style={styles.subtitle}>
              {errorMessage ?? "Đã có lỗi xảy ra. Vui lòng thử lại."}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Quay lại trang đăng nhập</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconWrapError: {
    backgroundColor: "#FEE2E2",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.text,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: AppColors.primary,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: -0.1,
  },
});
