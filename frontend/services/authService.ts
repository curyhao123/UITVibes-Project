import { User } from "../data/mockData";
import apiClient, {
  saveTokens,
  getAccessToken,
  getRefreshTokenFromStorage,
  clearTokens,
  delay,
} from "./httpClient";
import {
  applyLocalUsernameToUser,
  clearLocalHandle,
  clearPersistedAvatarUrl,
  clearUserCache,
  getCurrentUser,
  mergePersistedAvatarIfMissing,
  setCurrentAccount,
  setCurrentUser,
  setCurrentUserId,
  writeLocalHandle,
} from "./session";
import {
  BE_AuthResponse,
  BE_LoginRequest,
  BE_RegisterRequest,
  BE_FollowStats,
  BE_UserProfile,
  normalizeAvatarUrlFromProfile,
  normalizeCoverUrlFromProfile,
} from "./backendTypes";

export async function login(email: string, password: string): Promise<User> {
  const body: BE_LoginRequest = { email, password };

  try {
    const { data } = await apiClient.post<BE_AuthResponse>(
      "/auth/auth/login",
      body,
    );
    await saveTokens(data.accessToken, data.refreshToken);

    // Bearer từ phản hồi login — tránh race: interceptor đọc AsyncStorage trước khi ghi xong (web/RN) → 401 → không có profile/avatar
    const authHeaders = {
      Authorization: `Bearer ${data.accessToken}`,
    };

    const userId = data.user.id;

    let profile: BE_UserProfile | null = null;
    let stats: BE_FollowStats | null = null;

    const [profileRes, statsRes] = await Promise.allSettled([
      apiClient.get<BE_UserProfile>("/user/userprofile/me", {
        headers: authHeaders,
      }),
      apiClient.get<BE_FollowStats>(`/user/follow/${userId}/stats`, {
        headers: authHeaders,
      }),
    ]);

    if (profileRes.status === "fulfilled") {
      profile = profileRes.value.data;
    } else {
      console.warn("[Auth] login: profile fetch failed, retrying once", profileRes.reason);
      await delay(150);
      try {
        const retry = await apiClient.get<BE_UserProfile>("/user/userprofile/me", {
          headers: authHeaders,
        });
        profile = retry.data;
      } catch (e) {
        console.warn("[Auth] login: profile retry failed", e);
      }
    }

    if (statsRes.status === "fulfilled") {
      stats = statsRes.value.data;
    } else {
      try {
        const retry = await apiClient.get<BE_FollowStats>(
          `/user/follow/${userId}/stats`,
          { headers: authHeaders },
        );
        stats = retry.data;
      } catch {
        stats = null;
      }
    }

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
      isVerified: false,
    };

    user = await mergePersistedAvatarIfMissing(user);

    setCurrentUserId(data.user.id);
    setCurrentUser(user);
    if (user.username) void writeLocalHandle(user.id, user.username);
    return user;
  } catch (error: any) {
    // Surface backend error message to callers while logging full error
    console.error("[Auth] Login failed", error?.response?.data ?? error);
    const errorCode = error?.response?.data?.errorCode;
    if (errorCode === "NOT_VERIFIED") {
      const err = new Error(error?.response?.data?.message ?? "Account not verified.") as Error & { errorCode: string; email: string };
      err.errorCode = errorCode;
      err.email = error?.response?.data?.email ?? email;
      throw err;
    }
    const message =
      (error?.response?.data &&
        (error.response.data.message || error.response.data.error)) ||
      error?.message ||
      "Login failed";
    throw new Error(message);
  }
}

export async function register(
  email: string,
  password: string,
  username: string,
): Promise<User> {
  const body: BE_RegisterRequest = { email, username, password };

  try {
    const { data } = await apiClient.post<BE_AuthResponse>(
      "/auth/auth/register",
      body,
    );
    await saveTokens(data.accessToken, data.refreshToken);

    const user: User = {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.username,
      avatar: "",
      coverImage: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };

    setCurrentUserId(data.user.id);
    setCurrentUser(user);
    if (user.username) void writeLocalHandle(user.id, user.username);
    return user;
  } catch (error: any) {
    console.error("[Auth] Registration failed", error?.response?.data ?? error);
    const message =
      (error?.response?.data &&
        (error.response.data.message || error.response.data.error)) ||
      error?.message ||
      "Registration failed";
    throw new Error(message);
  }
}

async function clearLocalAuthState(): Promise<void> {
  const prev = getCurrentUser();
  if (prev?.id) await clearPersistedAvatarUrl(prev.id);
  clearUserCache();
  await clearTokens();
  await clearLocalHandle();
  setCurrentUserId("current");
  setCurrentUser(null);
  setCurrentAccount("activeUser");
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = await getRefreshTokenFromStorage();
    if (refreshToken) {
      await apiClient.post("/auth/auth/revoke", { refreshToken });
    }
  } catch {
    // ignore revoke errors
  } finally {
    await clearLocalAuthState();
  }
}

/**
 * Xóa tài khoản trên server (cần mật khẩu), sau đó dọn local session.
 * Gọi POST /auth/auth/delete-account với Bearer token.
 */
export async function deleteAccount(password: string): Promise<void> {
  const trimmed = (password ?? "").trim();
  if (!trimmed) {
    throw new Error("Password is required");
  }
  try {
    await apiClient.post("/auth/auth/delete-account", { password: trimmed });
  } catch (error: any) {
    console.error("[Auth] Delete account failed", error?.response?.data ?? error);
    const message =
      (error?.response?.data &&
        (error.response.data.message || error.response.data.error)) ||
      error?.message ||
      "Failed to delete account";
    throw new Error(message);
  }
  await clearLocalAuthState();
}

export async function refreshSession(): Promise<User | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    let profile: BE_UserProfile;
    try {
      const profileRes = await apiClient.get<BE_UserProfile>(
        "/user/userprofile/me",
      );
      profile = profileRes.data;
    } catch (e) {
      console.warn("[Auth] refreshSession: profile fetch failed", e);
      return null;
    }

    let stats: BE_FollowStats | null = null;
    try {
      const statsRes = await apiClient.get<BE_FollowStats>(
        `/user/follow/${profile.userId}/stats`,
      );
      stats = statsRes.data;
    } catch {
      stats = null;
    }

    let user: User = {
      id: profile.userId,
      username: "",
      displayName: profile.displayName ?? "",
      avatar: normalizeAvatarUrlFromProfile(profile),
      coverImage: normalizeCoverUrlFromProfile(profile),
      bio: profile.bio ?? "",
      website: profile.website || undefined,
      followers: stats?.followersCount ?? 0,
      following: stats?.followingCount ?? 0,
      posts: stats?.postsCount ?? 0,
      isVerified: false,
    };

    user = await mergePersistedAvatarIfMissing(user);
    user = await applyLocalUsernameToUser(user);
    setCurrentUserId(user.id);
    setCurrentUser(user);
    return user;
  } catch (e) {
    console.warn("[Auth] refreshSession failed", e);
    return null;
  }
}

// ─── Email Verification ────────────────────────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
): Promise<void> {
  await apiClient.post("/auth/send-verification", { email });
}

export async function verifyEmail(
  email: string,
  otp: string,
): Promise<void> {
  await apiClient.post("/auth/verify-email", { email, otp });
}

/**
 * Verifies OTP and returns auth tokens in one step.
 * Use this for the Login → Verify flow so tokens are available immediately after verification.
 */
export async function verifyEmailAndLogin(
  email: string,
  otp: string,
): Promise<BE_AuthResponse> {
  const { data } = await apiClient.post<BE_AuthResponse>(
    "/auth/verify-email-and-login",
    { email, otp },
  );
  return data;
}

export async function resendOtp(email: string): Promise<void> {
  await apiClient.post("/auth/resend-otp", { email });
}
