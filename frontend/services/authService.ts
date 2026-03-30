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
} from "./backendTypes";

export async function login(email: string, password: string): Promise<User> {
  const body: BE_LoginRequest = { email, password };

  try {
    const { data } = await apiClient.post<BE_AuthResponse>(
      "/auth/auth/login",
      body,
    );
    await saveTokens(data.accessToken, data.refreshToken);

    const [profileRes, statsRes] = await Promise.allSettled([
      apiClient.get<BE_UserProfile>("/user/userprofile/me"),
      apiClient.get<BE_FollowStats>("/user/follow/me/stats"),
    ]);

    const profile =
      profileRes.status === "fulfilled" ? profileRes.value.data : null;
    const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null;

    const user: User = {
      id: data.user.id,
      username: data.user.username,
      displayName: profile?.displayName || data.user.username,
      avatar: profile?.avatarUrl || "",
      bio: profile?.bio || "",
      website: profile?.website || undefined,
      followers: stats?.followersCount ?? 0,
      following: stats?.followingCount ?? 0,
      posts: stats?.postsCount ?? 0,
      isVerified: false,
    };

    setCurrentUserId(data.user.id);
    setCurrentUser(user);
    if (user.username) void writeLocalHandle(user.id, user.username);
    return user;
  } catch (error: any) {
    // Surface backend error message to callers while logging full error
    console.error("[Auth] Login failed", error?.response?.data ?? error);
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

export async function logout(): Promise<void> {
  try {
    const refreshToken = await getRefreshTokenFromStorage();
    if (refreshToken) {
      await apiClient.post("/auth/auth/revoke", { refreshToken });
    }
  } catch {
    // ignore revoke errors
  } finally {
    await clearTokens();
    await clearLocalHandle();
    setCurrentUserId("current");
    setCurrentUser(null);
    setCurrentAccount("activeUser");
  }
}

export async function refreshSession(): Promise<User | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const [profileRes, statsRes] = await Promise.allSettled([
      apiClient.get<BE_UserProfile>("/user/userprofile/me"),
      apiClient.get<BE_FollowStats>("/user/follow/me/stats"),
    ]);

    const profile =
      profileRes.status === "fulfilled" ? profileRes.value.data : null;
    const stats = statsRes.status === "fulfilled" ? statsRes.value.data : null;

    if (!profile) return null;

    let user: User = {
      id: profile.userId,
      username: "",
      displayName: profile.displayName,
      avatar: profile.avatarUrl || "",
      bio: profile.bio || "",
      website: profile.website || undefined,
      followers: stats?.followersCount ?? 0,
      following: stats?.followingCount ?? 0,
      posts: stats?.postsCount ?? 0,
      isVerified: false,
    };

    user = await applyLocalUsernameToUser(user);
    setCurrentUserId(user.id);
    setCurrentUser(user);
    return user;
  } catch {
    return null;
  }
}
