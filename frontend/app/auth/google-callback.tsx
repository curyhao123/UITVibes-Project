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
  const { adoptGoogleSession } = useApp();
  // loginWithGoogleBackend() performs the PKCE exchange itself and stores the
  // tokens, so this hook never sees them. We must therefore push the resulting
  // user into the context explicitly — otherwise isAuthenticated stays false and
  // every subsequent API call is sent without a token → 401.

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
          ? "You cancelled Google sign-in."
          : `Google returned an error: ${params.error}`,
      );
      return;
    }

    const code = params.code;
    if (!code) {
      setStatus("error");
      setErrorMessage(
        "No authorization code found in the URL. Please try again.",
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
        "PKCE code_verifier was not found in localStorage. " +
          "You may have opened the callback link in a different tab or incognito window. Please sign in again.",
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
        setErrorMessage("Google sign-in failed. Please try again.");
        return;
      }
      setStatus("success");
      // Push the freshly provisioned user into context BEFORE routing, so the
      // screens rendered on /(tabs) already have auth state and a token.
      adoptGoogleSession(result.user, result.isNewUser);
      // Brief delay so the user sees the success state before we route away.
      await new Promise((r) => setTimeout(r, 400));
      // Route on isNewUser only — post count says nothing about onboarding state,
      // and a user with 0 posts who already finished onboarding must land on home.
      const target = result.isNewUser
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
          "Google sign-in failed. Please try again.",
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
            <Text style={styles.title}>Completing sign-in…</Text>
            <Text style={styles.subtitle}>
              Exchanging the authorization code with Google and creating your session.
            </Text>
          </>
        )}

        {status === "success" && (
          <>
            <View style={styles.iconWrap}>
              <Feather name="check-circle" size={48} color="#22C55E" />
            </View>
            <Text style={styles.title}>Signed in successfully!</Text>
            <Text style={styles.subtitle}>Redirecting…</Text>
          </>
        )}

        {status === "error" && (
          <>
            <View style={[styles.iconWrap, styles.iconWrapError]}>
              <Feather name="alert-circle" size={48} color={AppColors.error} />
            </View>
            <Text style={styles.title}>Sign-in failed</Text>
            <Text style={styles.subtitle}>
              {errorMessage ?? "Something went wrong. Please try again."}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Back to sign-in</Text>
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
