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
// This MUST be called at module scope (top-level, not inside a function).
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
 * Resolves the redirect URI based on the current runtime.
 *
 * The redirect URI MUST be a URI that the runtime can actually receive a
 * response on, AND that is registered in Google Cloud Console.
 *
 * - Native (Expo Go, dev build, standalone): use the Expo auth proxy
 *   `https://auth.expo.io/@anonymous/uitvibes` — the proxy holds the
 *   code and re-opens the app via the dev server's exp:// URL.
 *   (Google only sees the proxy URL; the proxy handles the round trip.)
 *
 * - Web (browser): we cannot use the proxy because the proxy has no way
 *   to "re-open" a browser tab. We use the dev server's HTTP URL directly
 *   so the browser does a full page navigation back to our app, which
 *   expo-auth-session's web polyfill catches via the URL hash.
 */
function pickRedirectUri(): string {
  if (Platform.OS === "web") {
    return "http://localhost:8081";
  }
  // iOS, Android (Expo Go, dev build, or standalone)
  return "https://auth.expo.io/@anonymous/uitvibes";
}

/**
 * Triggers the Google Sign-In flow and returns a fully-provisioned User.
 * On success, tokens are saved and the user object mirrors what `login()` returns.
 *
 * @throws Error with a `.errorCode` property on failure (e.g. USER_CANCELLED, NETWORK, INVALID_GOOGLE_TOKEN).
 */
export async function loginWithGoogle(): Promise<GoogleLoginResult> {
  // ── 1. Resolve redirect URI (must match a URI registered in Google Console) ──
  const redirectUri = pickRedirectUri();

  console.log("[GoogleAuth] Platform:", Platform.OS, "→ redirect URI:", redirectUri);

  // Warm up the browser session — this pre-establishes the connection
  // so the auth callback can complete faster and more reliably.
  // Particularly important on Android where the first openAuthSessionAsync
  // can race with the result-handling.
  try {
    await WebBrowser.warmUpAsync();
  } catch (e) {
    console.warn("[GoogleAuth] warmUpAsync failed (non-fatal):", e);
  }

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
  // promptAsync handles the full OAuth dance:
  //   - Opens WebView / browser with Google's auth URL
  //   - User signs in
  //   - Google redirects to `redirectUri` with `?code=...`
  //   - For Expo Go, the auth.expo.io proxy forwards the redirect back
  //     to the Expo dev server, which hands it back to the app.
  let result: AuthSession.AuthSessionResult;
  try {
    result = await request.promptAsync(GOOGLE_DISCOVERY);
  } catch (err: any) {
    console.error("[GoogleAuth] promptAsync threw:", err);
    const e = new Error(
      "Google sign-in failed to start. Please check your network and try again.",
    ) as Error & { errorCode: string };
    e.errorCode = "NETWORK";
    throw e;
  } finally {
    // Cool down the browser session to free resources
    try {
      await WebBrowser.coolDownAsync();
    } catch {
      /* ignore */
    }
  }

  // ── 4. Handle result ──────────────────────────────────────────────────────
  if (result.type !== "success") {
    // Log full result for debugging
    console.warn("[GoogleAuth] Non-success result:", JSON.stringify(result, null, 2));

    if (result.type === "cancel" || result.type === "dismiss") {
      const err = new Error("Google sign-in was cancelled") as Error & {
        errorCode: string;
      };
      err.errorCode = "USER_CANCELLED";
      throw err;
    }

    if (result.type === "error") {
      // The error message comes from Expo's auth proxy or Google.
      // Common messages:
      //   - "Something went wrong trying to finish signing in"  → proxy handshake failed
      //   - "Network request failed"                              → offline
      //   - "redirect_uri_mismatch"                                → not in Google Console
      const params = ((result as any).params ?? {}) as Record<string, string>;
      const errorFromServer =
        params.error_description || params.error || "Unknown error";
      const errorCode = params.error || "OAUTH_ERROR";

      console.error(
        "[GoogleAuth] Server returned error:",
        errorFromServer,
        "code:",
        errorCode,
      );

      const err = new Error(
        `Google sign-in failed: ${errorFromServer}`,
      ) as Error & { errorCode: string };
      err.errorCode = errorCode;
      throw err;
    }

    // 'locked' or unknown type
    const err = new Error(
      `Google sign-in ended unexpectedly (${result.type})`,
    ) as Error & { errorCode: string };
    err.errorCode = "OAUTH_ERROR";
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

  // ── 5. Send code + verifier to backend for token exchange ──────────────────
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
