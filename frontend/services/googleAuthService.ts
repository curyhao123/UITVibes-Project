/**
 * Google OAuth Sign-In service.
 *
 * Uses expo-auth-session to obtain a Google id_token via the Web-based OAuth flow
 * (works on iOS, Android, and Web — including Expo Go, without native config).
 *
 * The id_token is then sent to the backend (POST /api/googleauth/login) for
 * verification and account provisioning. Backend returns the same AuthResponse
 * shape as password login, so the rest of the app treats Google and password
 * users identically.
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

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  // We use the implicit response_type=token so we receive id_token directly,
  // no need to exchange an authorization code for tokens (no client secret
  // required on the client side). The id_token is then verified by the backend.
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
  // ── 1. Open Google OAuth WebView ───────────────────────────────────────────
  // Use Expo's proxy redirect URI when running in Expo Go, otherwise use the
  // app's custom scheme (uitvibes://) which is configured in app.json.
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "uitvibes",
    preferLocalhost: false,
    // expo-auth-session auto-generates an https://auth.expo.io/@... URI in Expo Go
  });

  const request = new AuthSession.AuthRequest({
    clientId: pickClientId(),
    scopes: ["openid", "profile", "email"],
    responseType: AuthSession.ResponseType.IdToken, // returns id_token directly
    redirectUri,
    usePKCE: false,
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  // ── 2. Handle result ───────────────────────────────────────────────────────
  if (result.type !== "success") {
    // 'cancel' | 'dismiss' | 'locked' | 'error'
    const err = new Error("Google sign-in was cancelled") as Error & {
      errorCode: string;
    };
    err.errorCode = "USER_CANCELLED";
    throw err;
  }

  const idToken = (result.params as Record<string, string> | null)?.id_token;
  if (!idToken) {
    const err = new Error("Google did not return an id_token") as Error & {
      errorCode: string;
    };
    err.errorCode = "NO_ID_TOKEN";
    throw err;
  }

  // ── 3. Send id_token to backend for verification ───────────────────────────
  return await verifyAndProvisionOnBackend(idToken);
}

async function verifyAndProvisionOnBackend(
  idToken: string,
): Promise<GoogleLoginResult> {
  const platform: BE_GoogleLoginRequest["platform"] =
    Platform.OS === "ios"
      ? "ios"
      : Platform.OS === "android"
        ? "android"
        : "web";

  const body: BE_GoogleLoginRequest = { idToken, platform };

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

  // ── 4. Save tokens (same as password login) ───────────────────────────────
  await saveTokens(data.accessToken, data.refreshToken);

  const authHeaders = { Authorization: `Bearer ${data.accessToken}` };
  const userId = data.user.id;

  // ── 5. Best-effort fetch profile + stats (same pattern as password login) ─
  const [profileRes, statsRes] = await Promise.allSettled([
    apiClient.get<BE_UserProfile>("/user/userprofile/me", { headers: authHeaders }),
    apiClient.get<BE_FollowStats>(`/user/follow/${userId}/stats`, {
      headers: authHeaders,
    }),
  ]);

  const profile =
    profileRes.status === "fulfilled" ? profileRes.value.data : null;
  const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null;

  // ── 6. Build User domain object ───────────────────────────────────────────
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

  // ── 7. Persist session (mirrors password `login()`) ────────────────────────
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
