/**
 * Google OAuth Sign-In service.
 *
 * Flow differs by platform because each has different popup / redirect
 * capabilities:
 *
 * ── Native (iOS, Android) ─────────────────────────────────────────────────
 *   1. Build an AuthRequest (generates PKCE pair).
 *   2. Open the Google auth URL via `WebBrowser.openAuthSessionAsync`.
 *   3. Google → `https://auth.expo.io/@anonymous/UITVibes?code=...` →
 *      Expo proxy → `uitvibes://` (custom scheme) → app picks up `code`.
 *   4. POST { code, codeVerifier, redirectUri, platform } to backend.
 *   5. Backend exchanges code for id_token, provisions user, returns JWT.
 *
 * ── Web ───────────────────────────────────────────────────────────────────
 *   Same idea, but `WebBrowser.openAuthSessionAsync` on web uses a popup,
 *   and Expo's dev server sets `Cross-Origin-Opener-Policy: same-origin`,
 *   which makes the popup end up in the same browsing context. After
 *   Google redirects back, COOP blocks the `window.close` / `window.closed`
 *   polling and the flow silently times out.
 *
 *   Fix: skip the popup entirely. Do a full-page redirect:
 *     window.location.assign(googleAuthUrl)
 *   Google → `https://auth.expo.io/@anonymous/UITVibes?code=...` →
 *   Expo proxy → `window.location.origin/auth/google-callback?code=...`
 *   The `google-callback` page (app/auth/google-callback.tsx) reads the
 *   code + the stashed PKCE verifier from sessionStorage, calls the
 *   backend, then routes to home / onboarding.
 */
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import apiClient, { saveTokens } from "./httpClient";
import {
  mergePersistedAvatarIfMissing,
  persistUserAvatarUrl,
  setCurrentAccount,
  setCurrentUser,
  setCurrentUserEmail,
  setCurrentUserId,
  setPersistedUserRole,
  writeLocalHandle,
} from "./session";
import {
  BE_AuthResponse,
  BE_FollowStats,
  BE_GoogleLoginRequest,
  BE_UserProfile,
  normalizeAvatarUrlFromProfile,
  normalizeCoverUrlFromProfile,
} from "./backendTypes";
import { User } from "../data/mockData";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

// Keys used to hand off PKCE state across the full-page redirect on web.
// We use AsyncStorage (not sessionStorage) because:
//   - Same-origin sessionStorage is per-tab and gets wiped on full-page
//     reloads, which the Expo dev server triggers via HMR.
//   - The PKCE verifier is not user-secret (it only protects the code
//     exchange; the code itself is short-lived and one-time-use), so
//     persisting it in AsyncStorage is fine. We delete it immediately
//     after the callback consumes it.
//   - AsyncStorage works identically on web and native, so the callback
//     page doesn't need two code paths.
const SS_CODE_VERIFIER = "google_code_verifier";
const SS_REDIRECT_URI = "google_redirect_uri";

function getWebClientId(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    "REDACTED-WEB-CLIENT-ID.apps.googleusercontent.com"
  );
}

function getIosClientId(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
    "REDACTED-IOS-CLIENT-ID.apps.googleusercontent.com"
  );
}

function pickClientId(): string {
  if (Platform.OS === "ios") return getIosClientId();
  return getWebClientId();
}

/**
 * Resolves the redirect URI for the current platform.
 *
 * - Native: The Expo auth proxy
 *   (`https://auth.expo.io/@anonymous/UITVibes`). The proxy forwards
 *   the response to the app via the `uitvibes://` custom scheme. This
 *   is the redirect URI Google sees on native.
 *
 * - Web: A same-origin callback page
 *   (`window.location.origin + "/auth/google-callback"`). The browser
 *   handles the full-page redirect directly with Google (no Expo
 *   proxy involved, because the proxy only forwards back to native
 *   apps via `uitvibes://`, not to arbitrary HTTPS URLs).
 *
 * Each platform's redirect URI must be registered in Google Cloud
 * Console under "Authorized redirect URIs":
 *   - https://auth.expo.io/@anonymous/UITVibes
 *   - http://localhost:8081/auth/google-callback
 *   (and the production origin in place of localhost when deployed)
 */
function resolveRedirectUri(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    // Same-origin callback page. Google will redirect the user here
    // directly after consent.
    return `${window.location.origin}/auth/google-callback`;
  }
  // Native: use the Expo auth proxy, which forwards back to the app
  // via the `uitvibes://` custom scheme.
  const uri = AuthSession.makeRedirectUri({
    scheme: "uitvibes",
    preferLocalhost: false,
    isTripleSlashed: false,
  });
  if (
    uri.startsWith("http://localhost") ||
    uri.startsWith("http://127.0.0.1")
  ) {
    return "https://auth.expo.io/@anonymous/UITVibes";
  }
  return uri;
}

/**
 * The OAuth `redirect_uri` we actually send to Google. Always the Expo
 * auth proxy — this is the single URI registered in Google Cloud Console.
 *
 * Google → Expo proxy → same-origin callback page.
 */
const GOOGLE_REDIRECT_URI = "https://auth.expo.io/@anonymous/UITVibes";

export type GoogleLoginResult = {
  user: User;
  isNewUser: boolean;
};

export async function loginWithGoogle(): Promise<GoogleLoginResult> {
  const clientId = pickClientId();
  // Web: Google redirects directly to the same-origin callback page.
  // Native: Google redirects to the Expo auth proxy, which forwards
  // to the app via the `uitvibes://` custom scheme.
  const redirectUri = resolveRedirectUri();

  console.log("[GoogleAuth] Platform:", Platform.OS);
  console.log("[GoogleAuth] Using redirect URI:", redirectUri);
  console.log("[GoogleAuth] Using clientId:", clientId);

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ["openid", "profile", "email"],
    responseType: AuthSession.ResponseType.Code,
    redirectUri,
    usePKCE: true,
  });

  const authUrl = await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  console.log("[GoogleAuth] Full auth URL:", authUrl);
  console.log("[GoogleAuth] Auth URL host:", new URL(authUrl).host);

  // Extract the redirect_uri parameter Google will see (for debugging
  // redirect_uri_mismatch errors).
  const debugUrl = new URL(authUrl);
  console.log(
    "[GoogleAuth] redirect_uri sent to Google:",
    debugUrl.searchParams.get("redirect_uri"),
  );

  // ── Web: full-page redirect to Google (avoids COOP popup issue) ─────
  if (Platform.OS === "web") {
    // Stash the PKCE verifier so the callback page can send it to the
    // backend. Use SYNCHRONOUS localStorage because `window.location
    // .assign` below tears down the JS context, and AsyncStorage on
    // web is async (IndexedDB-backed) — a write issued right before a
    // full-page navigation can be lost. localStorage is synchronous and
    // the spec guarantees it commits before the next event-loop tick.
    const verifier = request.codeVerifier ?? "";
    try {
      window.localStorage.setItem(SS_CODE_VERIFIER, verifier);
      window.localStorage.setItem(SS_REDIRECT_URI, redirectUri);
    } catch {
      // localStorage disabled (private mode / quota); callback will
      // fail loudly rather than silently — acceptable.
    }
    // Also try AsyncStorage for parity with native, but don't gate the
    // redirect on it.
    AsyncStorage.multiSet([
      [SS_CODE_VERIFIER, verifier],
      [SS_REDIRECT_URI, redirectUri],
    ]).catch(() => undefined);
    console.log(
      "[GoogleAuth] Stashed PKCE in localStorage. verifier length:",
      verifier.length,
      "redirectUri:",
      redirectUri,
    );
    // Hand off the whole window. We never resolve from this function on
    // web; the callback page does the rest and routes away.
    window.location.assign(authUrl);
    // Keep TypeScript happy (unreachable on web).
    return await new Promise<GoogleLoginResult>(() => {});
  }

  // ── Native: popup via WebBrowser ──────────────────────────────────────
  // The browser returns a URL that starts with `uitvibes://...` (our
  // custom scheme). WebBrowser recognises it as success because it
  // matches the auth proxy's redirect pattern.
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success") {
    const err = new Error("Google sign-in was cancelled") as Error & {
      errorCode: string;
    };
    err.errorCode = "USER_CANCELLED";
    throw err;
  }

  let code: string | undefined;
  // Expo SDK 57: `result.params` was removed from WebBrowserRedirectResult.
  // The only reliable field is `result.url` (the full redirect URL), so
  // we parse the `code` query parameter from there.
  if (result.url) {
    try {
      const url = new URL(result.url);
      code =
        url.searchParams.get("code") ??
        new URLSearchParams(url.hash.replace(/^#/, "")).get("code") ??
        undefined;
    } catch {
      const match = result.url.match(/[?&#]code=([^&]+)/);
      if (match) code = decodeURIComponent(match[1]);
    }
  }

  if (!code) {
    const err = new Error(
      "Google did not return an authorization code",
    ) as Error & { errorCode: string };
    err.errorCode = "NO_CODE";
    throw err;
  }
  if (!request.codeVerifier) {
    const err = new Error("PKCE code_verifier was not generated") as Error & {
      errorCode: string;
    };
    err.errorCode = "NO_CODE_VERIFIER";
    throw err;
  }

  return await verifyAndProvisionOnBackend(
    code,
    request.codeVerifier,
    redirectUri,
  );
}

/**
 * Web-only entry point used by the /auth/google-callback page after a
 * full-page redirect completes. Skips the popup/redirectUri dance and
 * goes straight to the backend.
 */
export async function loginWithGoogleBackend(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<GoogleLoginResult | null> {
  return await verifyAndProvisionOnBackend(code, codeVerifier, redirectUri);
}

async function verifyAndProvisionOnBackend(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<GoogleLoginResult> {
  const platform: BE_GoogleLoginRequest["platform"] =
    Platform.OS === "ios"
      ? "ios"
      : Platform.OS === "android"
        ? "android"
        : "web";

  const body: BE_GoogleLoginRequest = {
    code,
    codeVerifier,
    redirectUri,
    platform,
  };

  let data: BE_AuthResponse;
  try {
    const res = await apiClient.post<BE_AuthResponse>(
      "/auth/googleauth/login",
      body,
    );
    data = res.data;
  } catch (error: any) {
    const errorCode = error?.response?.data?.errorCode;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Google sign-in failed. Please try again.";

    const err = new Error(message) as Error & { errorCode: string };
    err.errorCode = errorCode || "GOOGLE_LOGIN_FAILED";
    throw err;
  }

  await saveTokens(data.accessToken, data.refreshToken);

  const authHeaders = { Authorization: `Bearer ${data.accessToken}` };
  const userId = data.user.id;

  const [profileRes, statsRes] = await Promise.allSettled([
    apiClient.get<BE_UserProfile>("/user/userprofile/me", { headers: authHeaders }),
    apiClient.get<BE_FollowStats>(`/user/follow/${userId}/stats`, {
      headers: authHeaders,
    }),
  ]);

  const profile =
    profileRes.status === "fulfilled" ? profileRes.value.data : null;
  const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null;

  let user: User = {
    id: data.user.id,
    username: data.user.username,
    displayName: profile?.displayName || data.user.username,
    avatar: profile ? normalizeAvatarUrlFromProfile(profile) : "",
    coverImage: profile ? normalizeCoverUrlFromProfile(profile) : "",
    bio: profile?.bio || "",
    website: profile?.website || undefined,
    followers: stats?.followersCount ?? 0,
    following: stats?.followingCount ?? 0,
    posts: stats?.postsCount ?? 0,
    isVerified: true,
    fullName: profile?.fullName || "",
    gender: profile?.gender || "",
    role: (data.user.role as "User" | "Admin") ?? "User",
  };

  user = await mergePersistedAvatarIfMissing(user);
  if (user.avatar?.trim()) await persistUserAvatarUrl(user.id, user.avatar);

  setCurrentUserId(data.user.id);
  setCurrentUser(user);
  await setCurrentUserEmail(data.user.email);
  if (user.username) void writeLocalHandle(user.id, user.username);
  await setPersistedUserRole(user.role ?? null);
  setCurrentAccount("activeUser");

  const isNewUser = !profile || (stats?.postsCount ?? 0) === 0;

  return { user, isNewUser };
}
