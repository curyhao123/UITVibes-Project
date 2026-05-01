import {
  User,
  Post,
  mockUsers,
} from "../data/mockData";
import apiClient, { delay } from "./httpClient";
import {
  applyLocalUsernameToUser,
  cacheUser,
  clearPersistedAvatarUrl,
  clearUserCache,
  getCachedUser,
  getCurrentAccount,
  getCurrentUser,
  getCurrentUserId,
  isUserFollowed,
  markUserFollowed,
  markUserUnfollowed,
  mergePersistedAvatarIfMissing,
  setCurrentUser,
  syncFollowedUserIds,
  RecentSearch,
  getLocalRecentSearches,
  saveLocalRecentSearch,
  removeLocalRecentSearch,
  clearLocalRecentSearches,
} from "./session";
import {
  BE_UserProfile,
  BE_FollowStats,
  BE_PostResponse,
  BE_UpdateProfileRequest,
  BE_UpdateBioRequest,
  BE_SearchUserProfileDto,
  BE_FollowerListDto,
  normalizeAvatarUrlFromProfile,
  normalizeCoverUrlFromProfile,
} from "./backendTypes";

/** URL dùng cho PUT /me — không bao giờ là blob:/data:/file: (blob là tạm, không lưu DB được) */
function isPermanentHttpAvatarUrl(uri: string): boolean {
  const u = uri.trim();
  if (!u) return false;
  if (
    u.startsWith("blob:") ||
    u.startsWith("data:") ||
    u.startsWith("file:") ||
    u.startsWith("content:")
  ) {
    return false;
  }
  return u.startsWith("https://") || u.startsWith("http://");
}

/** Cần upload multipart (ảnh local / blob web), không được gửi URL vào JSON */
function needsMultipartImageUpload(uri: string): boolean {
  if (!uri?.trim()) return false;
  return (
    uri.startsWith("file://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("data:") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://")
  );
}

/**
 * Web: ImagePicker trả blob:http://... — phải fetch blob rồi append FormData.
 * Native: file:// dùng object { uri, type, name }.
 */
async function buildMultipartFileField(
  uri: string,
  fallbackFilename: string,
): Promise<FormData> {
  const formData = new FormData();

  // Native: Android thường là content://, iOS là file://
  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    const name = uri.split("/").pop() || fallbackFilename;
    formData.append("File", {
      uri,
      type: "image/jpeg",
      name,
    } as any);
    return formData;
  }

  if (
    typeof fetch !== "undefined" &&
    (uri.startsWith("blob:") || uri.startsWith("data:"))
  ) {
    const res = await fetch(uri);
    const blob = await res.blob();
    const ext = blob.type?.includes("png") ? "png" : "jpg";
    const name = fallbackFilename.endsWith(".jpg")
      ? fallbackFilename.replace(/\.(jpe?g|png)$/i, `.${ext}`)
      : `upload.${ext}`;
    if (typeof File !== "undefined") {
      formData.append(
        "File",
        new File([blob], name, { type: blob.type || "image/jpeg" }),
      );
    } else {
      formData.append("File", blob as unknown as Blob, name);
    }
    return formData;
  }

  throw new Error("Không thể đóng gói ảnh để upload (URI không hỗ trợ).");
}

export async function getSuggestedUsers(): Promise<User[]> {
  try {
    const { data } = await apiClient.get<{ users: BE_UserProfile[] }>(
      "/user/suggested",
      {
        params: { limit: 6 },
      },
    );
    return data.users.map((p) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      coverImage: p.coverImageUrl || "",
      bio: p.bio || "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(400);
    return []; // no follow data available offline
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const { data } = await apiClient.get<BE_UserProfile[]>("/user/search", {
      params: { limit: 20 },
    });
    return data.map((p) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      coverImage: p.coverImageUrl || "",
      bio: p.bio || "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    return [...mockUsers];
  }
}

export async function searchUsers(query: string): Promise<User[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const url = `/user/userprofile/search?query=${encodeURIComponent(query)}`;
    const response = await apiClient.get<BE_SearchUserProfileDto[]>(url);
    const data = response.data;

    // Check isFollowing for each user in parallel
    const isFollowingResults = await Promise.all(
      data.map((p) => checkIsFollowing(p.userId))
    );

    const results = data.map((p, i) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      coverImage: "",
      bio: p.bio || "",
      followers: p.followersCount ?? 0,
      following: 0,
      posts: 0,
      isVerified: false,
      isFollowing: isFollowingResults[i] ?? false,
    }));
    return results;
  } catch (err) {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return mockUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.displayName.toLowerCase().includes(lowerQuery),
    );
  }
}

function transformBEUserProfile(
  profile: BE_UserProfile,
  stats: BE_FollowStats,
): User {
  return {
    id: profile?.userId ?? "",
    username: "",
    displayName: profile?.displayName ?? "",
    fullName: profile?.fullName ?? profile?.displayName ?? "",
    avatar: normalizeAvatarUrlFromProfile(profile),
    coverImage: normalizeCoverUrlFromProfile(profile),
    bio: profile?.bio || "",
    gender: profile?.gender || "",
    website: profile?.website || undefined,
    followers: stats?.followersCount ?? 0,
    following: stats?.followingCount ?? 0,
    posts: stats?.postsCount ?? 0,
    isVerified: false,
  };
}

export async function fetchUserById(id: string): Promise<User> {
  const cached = getCachedUser(id);
  if (cached) return cached;
  try {
    const { data } = await apiClient.get<BE_UserProfile>(
      `/user/userprofile/${id}`,
    );
    const currentUid = getCurrentUserId();
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${id}/stats`,
      currentUid ? { params: { currentUserId: currentUid } } : undefined,
    );
    const user = transformBEUserProfile(data, statsRes.data);
    user.isFollowing = statsRes.data.isFollowing ?? false;
    // Keep the follow-state Set in sync
    if (user.isFollowing) {
      markUserFollowed(data.userId);
    } else {
      markUserUnfollowed(data.userId);
    }
    cacheUser(user);
    return user;
  } catch {
    return {
      id,
      username: "",
      displayName: "User",
      fullName: "",
      avatar: "",
      coverImage: "",
      bio: "",
      gender: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  try {
    const currentUid = getCurrentUserId();
    let userProfile: BE_UserProfile;
    if (id === "current" || id === currentUid) {
      const { data } = await apiClient.get<BE_UserProfile>(
        "/user/userprofile/me",
      );
      userProfile = data;
    } else {
      const { data } = await apiClient.get<BE_UserProfile>(
        `/user/userprofile/${id}`,
      );
      userProfile = data;
    }
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${userProfile.userId}/stats`,
      currentUid ? { params: { currentUserId: currentUid } } : undefined,
    );
    const user = transformBEUserProfile(userProfile, statsRes.data);
    user.isFollowing = statsRes.data.isFollowing ?? false;
    // Keep the follow-state Set in sync
    if (user.isFollowing) {
      markUserFollowed(userProfile.userId);
    } else {
      markUserUnfollowed(userProfile.userId);
    }
    return user;
  } catch {
    await delay(200);
    if (id === "current") {
      const existing = getCurrentUser();
      if (existing) return existing;
    }
    return {
      id: "current",
      username: "anhvu",
      displayName: "Anh Vu",
      fullName: "Vũ Anh",
      avatar: "https://i.pravatar.cc/150?img=33",
      coverImage: "",
      bio: "Software engineer \\ud83d\\udcbb",
      gender: "male",
      followers: 1240,
      following: 380,
      posts: 45,
      isVerified: false,
    } as User;
    return mockUsers.find((user) => user.id === id);
  }
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  const targetId = userId === "current" ? getCurrentUserId() : userId;
  const { data } = await apiClient.get<BE_PostResponse[]>(
    `/post/user/${targetId}`,
    {
      params: { skip: 0, take: 20 },
    },
  );
  const posts = await Promise.all(
    data.map(async (post) => {
      const author = await fetchUserById(post.userId);
      return {
        id: post.id,
        userId: post.userId,
        user: author,
        image: post.media?.[0]?.url || "",
        caption: post.content,
        likes: post.likesCount,
        comments: [],
        createdAt: post.createdAt,
        isLiked: post.isLikedByCurrentUser,
        isBookmarked: post.isBookmarkedByCurrentUser,
        shareCount: post.sharesCount || 0,
        views: post.viewsCount || 0,
        location: post.location || undefined,
        tags: post.hashtags || [],
      } as Post;
    }),
  );
  return posts;
}

export async function getCurrentUserProfile(): Promise<User> {
  try {
    const { data } = await apiClient.get<BE_UserProfile>(
      "/user/userprofile/me",
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    user = await mergePersistedAvatarIfMissing(user);
    setCurrentUser(user);
    // Seed followed-user IDs from the following list on app load
    try {
      const following = await apiClient.get<BE_FollowerListDto[]>(
        `/user/follow/${data.userId}/following`,
        { params: { skip: 0, take: 200 } },
      );
      syncFollowedUserIds(following.data.map((p) => p.userId));
    } catch {
      /* ignore — the Set is empty on failure, next checkIsFollowing call will sync */
    }
    return user;
  } catch {
    const existing = getCurrentUser();
    if (existing) {
      const merged = await mergePersistedAvatarIfMissing(existing);
      if (merged.avatar !== existing.avatar) setCurrentUser(merged);
      return merged;
    }
    return {
      id: "current",
      username: "anhvu",
      displayName: "Anh Vu",
      fullName: "Vũ Anh",
      avatar: "https://i.pravatar.cc/150?img=33",
      coverImage: "",
      bio: "Software engineer \\ud83d\\udcbb",
      gender: "male",
      followers: 1240,
      following: 380,
      posts: 45,
      isVerified: false,
    } as User;
  }
}

export async function followUser(userId: string): Promise<boolean> {
  try {
    await apiClient.post(`/user/follow/${userId}`);
    markUserFollowed(userId);
    clearUserCache();
    return true;
  } catch {
    await delay(300);
    clearUserCache();
    return true; // fallback mirrors legacy behavior
  }
}

export async function unfollowUser(userId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/user/follow/${userId}`);
    markUserUnfollowed(userId);
    clearUserCache();
    return true;
  } catch {
    await delay(300);
    markUserUnfollowed(userId);
    clearUserCache();
    return true;
  }
}

export async function toggleFollow(userId: string): Promise<boolean> {
  // Use the persisted follow-state Set, not the broken isFollowing() function
  const isCurrentlyFollowing = isUserFollowed(userId);
  const willFollow = !isCurrentlyFollowing;

  try {
    if (willFollow) {
      await apiClient.post(`/user/follow/${userId}`);
      markUserFollowed(userId);
    } else {
      await apiClient.delete(`/user/follow/${userId}`);
      markUserUnfollowed(userId);
    }
    clearUserCache();
    return willFollow;
  } catch {
    await delay(200);
    clearUserCache();
    return isCurrentlyFollowing; // return original state on error
  }
}

export function isFollowing(userId: string): boolean {
  return isUserFollowed(userId);
}

/**
 * Check if current user is following a specific user via backend API.
 * Returns true/false, or null if the request fails (e.g., not logged in).
 */
export async function checkIsFollowing(userId: string): Promise<boolean | null> {
  const currentUid = getCurrentUserId();
  if (!currentUid || currentUid === "current") return null;
  try {
    const { data } = await apiClient.get<{ isFollowing: boolean }>(
      `/user/follow/${userId}/is-following`,
      { params: { currentUserId: currentUid } },
    );
    if (data.isFollowing) {
      markUserFollowed(userId);
    } else {
      markUserUnfollowed(userId);
    }
    return data.isFollowing;
  } catch {
    return null;
  }
}

export async function getFollowers(userId: string): Promise<User[]> {
  try {
    const targetId = userId === "current" ? getCurrentUserId() : userId;
    const { data } = await apiClient.get<BE_FollowerListDto[]>(
      `/user/follow/${targetId}/followers`,
      { params: { skip: 0, take: 20 } },
    );
    return data.map((p) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      coverImage: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    return mockUsers.slice(0, 5);
  }
}

export async function getFollowing(userId: string): Promise<User[]> {
  try {
    const targetId = userId === "current" ? getCurrentUserId() : userId;
    const { data } = await apiClient.get<BE_FollowerListDto[]>(
      `/user/follow/${targetId}/following`,
      { params: { skip: 0, take: 20 } },
    );
    return data.map((p) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      coverImage: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isFollowing: true,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    return []; // no follow data available offline
  }
}

/**
 * PUT /user/userprofile/me/bio — chỉ cập nhật bio (khớp API trong spec).
 */
export async function updateMyBio(bio: string | null): Promise<User> {
  try {
    const { data } = await apiClient.put<BE_UserProfile>(
      "/user/userprofile/me/bio",
      { bio } satisfies BE_UpdateBioRequest,
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  } catch {
    await delay(400);
    const existing = getCurrentUser();
    if (existing) {
      existing.bio = bio ?? "";
      setCurrentUser(existing);
      return existing;
    }
    return {} as User;
  }
}

export async function updateProfile(updates: {
  displayName?: string;
  fullName?: string;
  gender?: string;
  bio?: string;
  website?: string;
}): Promise<User> {
  try {
    const onlyBio =
      updates.bio !== undefined &&
      updates.displayName === undefined &&
      updates.fullName === undefined &&
      updates.gender === undefined &&
      updates.website === undefined;
    if (onlyBio) {
      return updateMyBio(updates.bio ?? null);
    }

    const body: BE_UpdateProfileRequest = {};
    if (updates.displayName !== undefined)
      body.displayName = updates.displayName;
    if (updates.fullName !== undefined)
      body.fullName = updates.fullName;
    if (updates.gender !== undefined)
      body.gender = updates.gender;
    if (updates.bio !== undefined) body.bio = updates.bio;
    if (updates.website !== undefined) body.website = updates.website;

    const { data } = await apiClient.put<BE_UserProfile>(
      "/user/userprofile/me",
      body,
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );

    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  } catch {
    await delay(400);
    const existing = getCurrentUser();
    if (existing) {
      if (updates.displayName !== undefined)
        existing.displayName = updates.displayName;
      if (updates.fullName !== undefined)
        existing.fullName = updates.fullName;
      if (updates.gender !== undefined)
        existing.gender = updates.gender;
      if (updates.bio !== undefined) existing.bio = updates.bio;
      if (updates.website !== undefined) existing.website = updates.website;
      setCurrentUser(existing);
      return existing;
    }
    return {} as User;
  }
}

export async function checkDisplayNameAvailable(displayName: string): Promise<boolean> {
  try {
    const { data } = await apiClient.get<{ available: boolean }>(
      "/user/userprofile/check-displayname",
      { params: { displayName: displayName.trim() } },
    );
    return data.available;
  } catch {
    return false;
  }
}

export async function updateAvatar(avatarUri: string): Promise<User> {
  if (!avatarUri?.trim()) {
    return getCurrentUser() ?? ({} as User);
  }

  // Web thường là blob: — bắt buộc multipart lên BE (Cloudinary), không PUT JSON
  if (needsMultipartImageUpload(avatarUri)) {
    const formData = await buildMultipartFileField(avatarUri, "avatar.jpg");
    const { data } = await apiClient.post<BE_UserProfile>(
      "/user/userprofile/me/avatar",
      formData,
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  }

  if (isPermanentHttpAvatarUrl(avatarUri)) {
    const { data } = await apiClient.put<BE_UserProfile>(
      "/user/userprofile/me",
      { avatarUrl: avatarUri },
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  }

  throw new Error(
    "Ảnh đại diện phải upload file hoặc URL https công khai (không dùng blob tạm).",
  );
}

export async function deleteAvatar(): Promise<User> {
  const { data } = await apiClient.delete<BE_UserProfile>(
    "/user/userprofile/me/avatar",
  );
  await clearPersistedAvatarUrl(data.userId);
  const statsRes = await apiClient.get<BE_FollowStats>(
    `/user/follow/${data.userId}/stats`,
  );
  let user = transformBEUserProfile(data, statsRes.data);
  user = await applyLocalUsernameToUser(user);
  setCurrentUser(user);
  return user;
}

export async function deleteCover(): Promise<User> {
  try {
    const { data } = await apiClient.delete<BE_UserProfile>(
      "/user/userprofile/me/cover",
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  } catch {
    await delay(400);
    const existingUser = getCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
      return existingUser;
    }
    return {} as User;
  }
}

export async function updateCover(coverUri: string): Promise<User> {
  if (!coverUri?.trim()) {
    return getCurrentUser() ?? ({} as User);
  }

  if (needsMultipartImageUpload(coverUri)) {
    const formData = await buildMultipartFileField(coverUri, "cover.jpg");
    const { data } = await apiClient.post<BE_UserProfile>(
      "/user/userprofile/me/cover",
      formData,
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  }

  if (isPermanentHttpAvatarUrl(coverUri)) {
    const { data } = await apiClient.put<BE_UserProfile>(
      "/user/userprofile/me",
      { coverImageUrl: coverUri },
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  }

  throw new Error(
    "Ảnh bìa phải upload file hoặc URL https công khai (không dùng blob tạm).",
  );
}

// ============ RECENT SEARCHES ============

/**
 * Get recent searches from local storage.
 */
export async function getRecentSearches(): Promise<RecentSearch[]> {
  return await getLocalRecentSearches();
}

/**
 * Save a user to recent searches (or move to top if already exists).
 * Also syncs to backend via POST /user/userprofile/recent-searches.
 */
export async function saveRecentSearch(profile: {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount?: number;
}): Promise<void> {
  const item: RecentSearch = {
    userId: profile.userId,
    displayName: profile.displayName,
    bio: profile.bio || "",
    avatarUrl: profile.avatarUrl || "",
    followersCount: profile.followersCount ?? 0,
    searchedAt: Date.now(),
  };

  // Always save locally first
  await saveLocalRecentSearch(item);

  // Also try to sync to backend (fire-and-forget)
  try {
    await apiClient.post("/user/userprofile/recent-searches", {
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio || "",
      avatarUrl: profile.avatarUrl || "",
      followersCount: profile.followersCount ?? 0,
    } satisfies BE_SearchUserProfileDto);
  } catch {
    // ignore backend errors — local is source of truth for UI
  }
}

/**
 * Remove a single item from recent searches (local + backend).
 */
export async function removeRecentSearch(userId: string): Promise<void> {
  await removeLocalRecentSearch(userId);
  try {
    await apiClient.delete(`/user/userprofile/recent-searches/${userId}`);
  } catch {
    // ignore backend errors
  }
}

/**
 * Clear all recent searches (local + backend).
 */
export async function clearAllRecentSearches(): Promise<void> {
  await clearLocalRecentSearches();
  const searches = await getLocalRecentSearches(); // get current before clearing
  // Backend doesn't have a bulk delete, so delete each
  await Promise.allSettled(
    searches.map((s) =>
      apiClient.delete(`/user/userprofile/recent-searches/${s.userId}`).catch(() => {}),
    ),
  );
}
