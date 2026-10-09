/**
 * Google OAuth Sign-In service.
 *
 * Uses expo-auth-session with the modern Authorization Code Flow + PKCE
 * (the only flow Google supports for new Web/OAuth integrations as of 2025).
 *
 * Flow:
 * 1. App opens Google OAuth in a WebView via expo-auth-session
 * 2. Google redirects back with an authorization `code`
 * 3. App sends `{ code, codeVerifier, redirectUri, platform }` to backend
 * 4. Backend exchanges the code for an `id_token` using the configured
 *    ClientSecret (server-side, secure — secret never reaches the client)
 * 5. Backend verifies id_token, provisions user, returns AuthResponse
 *
 * The response shape matches password login, so the rest of the app
 * treats Google and password users identically.
 */
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
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

// Required by expo-auth-session to complete the auth code flow on iOS/Android.
WebBrowser.maybeCompleteAuthSession();

// Google OAuth 2.0 discovery endpoints
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

function getWebClientId(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
    "REDACTED-OLD-WEB-CLIENT-ID.apps.googleusercontent.com"
  );
}

function getIosClientId(): string {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ||
    "REDACTED-OLD-IOS-CLIENT-ID.apps.googleusercontent.com"
  );
}

/** Picks the right ClientId for the current platform. */
function pickClientId(): string {
  if (Platform.OS === "ios") return getIosClientId();
  return getWebClientId();
}

export type GoogleLoginResult = {
  user: User;
  isNewUser: boolean;
};

/**
 * Triggers the Google Sign-In flow and returns a fully-provisioned User.
 * On success, tokens are saved and the user object mirrors what `login()` returns.
 *
 * @throws Error with a `.errorCode` property on failure (e.g. USER_CANCELLED, NETWORK, INVALID_GOOGLE_TOKEN).
 */
export async function loginWithGoogle(): Promise<GoogleLoginResult> {
  // ── 1. Resolve redirect URI (must match a URI registered in Google Console) ──
  // We use Expo's auth proxy (https://auth.expo.io/@<owner>/<slug>) because it
  // works across Expo Go, dev builds, and standalone native builds without
  // requiring platform-specific configuration.
  let redirectUri = AuthSession.makeRedirectUri({
    scheme: "uitvibes",
    preferLocalhost: false,
    isTripleSlashed: false,
  });

  // Sanity guard: dev web mode sometimes returns localhost — fall back to proxy
  if (
    redirectUri.startsWith("http://localhost") ||
    redirectUri.startsWith("http://127.0.0.1")
  ) {
    redirectUri = "https://auth.expo.io/@anonymous/uitvibes";
  }

  console.log("[GoogleAuth] Using redirect URI:", redirectUri);

  // ── 2. Build authorization request (Code Flow + PKCE) ──────────────────────
  // expo-auth-session's AuthRequest generates the PKCE code_verifier and
  // code_challenge automatically when usePKCE is true.
  const request = new AuthSession.AuthRequest({
    clientId: pickClientId(),
    scopes: ["openid", "profile", "email"],
    responseType: AuthSession.ResponseType.Code, // Code Flow (not implicit!)
    redirectUri,
    usePKCE: true,
  });

  // ── 3. Prompt the user ────────────────────────────────────────────────────
  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type !== "success") {
    // 'cancel' | 'dismiss' | 'locked' | 'error'
    const err = new Error("Google sign-in was cancelled") as Error & {
      errorCode: string;
    };
    err.errorCode = "USER_CANCELLED";
    throw err;
  }

  const code = (result.params as Record<string, string> | null)?.code;
  if (!code) {
    const err = new Error("Google did not return an authorization code") as Error & {
      errorCode: string;
    };
    err.errorCode = "NO_CODE";
    throw err;
  }

  // request.codeVerifier is the PKCE verifier we must send to the backend
  // so it can complete the code exchange with Google.
  if (!request.codeVerifier) {
    const err = new Error("PKCE code_verifier was not generated") as Error & {
      errorCode: string;
    };
    err.errorCode = "NO_CODE_VERIFIER";
    throw err;
  }

  // ── 4. Send code + verifier to backend for token exchange ──────────────────
  return await verifyAndProvisionOnBackend(
    code,
    request.codeVerifier,
    redirectUri,
  );
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

  // ── 5. Save tokens (same as password login) ───────────────────────────────
  await saveTokens(data.accessToken, data.refreshToken);

  const authHeaders = { Authorization: `Bearer ${data.accessToken}` };
  const userId = data.user.id;

  // ── 6. Best-effort fetch profile + stats ─────────────────────────────────
  const [profileRes, statsRes] = await Promise.allSettled([
    apiClient.get<BE_UserProfile>("/user/userprofile/me", { headers: authHeaders }),
    apiClient.get<BE_FollowStats>(`/user/follow/${userId}/stats`, {
      headers: authHeaders,
    }),
  ]);

  const profile =
    profileRes.status === "fulfilled" ? profileRes.value.data : null;
  const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null;

  // ── 7. Build User domain object ───────────────────────────────────────────
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
    isVerified: true, // Google login always means verified email
    fullName: profile?.fullName || "",
    gender: profile?.gender || "",
    role: (data.user.role as "User" | "Admin") ?? "User",
  };

  user = await mergePersistedAvatarIfMissing(user);
  if (user.avatar?.trim()) await persistUserAvatarUrl(user.id, user.avatar);

  // ── 8. Persist session (mirrors password `login()`) ────────────────────────
  setCurrentUserId(data.user.id);
  setCurrentUser(user);
  await setCurrentUserEmail(data.user.email);
  if (user.username) void writeLocalHandle(user.id, user.username);
  await setPersistedUserRole(user.role ?? null);
  setCurrentAccount("activeUser");

  // Heuristic: new Google user is one with no posts/profile yet
  const isNewUser = !profile || (stats?.postsCount ?? 0) === 0;

  return { user, isNewUser };
}
