import {
  User,
  Post,
  mockUsers,
  mockActiveUserPosts,
  mockPosts,
  activeUserFollowingIds,
} from "../data/mockData";
import apiClient, { delay } from "./httpClient";
import {
  applyLocalUsernameToUser,
  cacheUser,
  getCachedUser,
  getCurrentAccount,
  getCurrentUser,
  getCurrentUserId,
  setCurrentUser,
} from "./session";
import {
  BE_UserProfile,
  BE_FollowStats,
  BE_PostResponse,
} from "./backendTypes";

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
      bio: p.bio || "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(400);
    const followedIds = activeUserFollowingIds;
    return mockUsers.filter((user) => !followedIds.has(user.id)).slice(0, 6);
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
  try {
    const { data } = await apiClient.get<BE_UserProfile[]>("/user/search", {
      params: { q: query, limit: 20 },
    });
    return data.map((p) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      bio: p.bio || "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
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
    id: profile.userId,
    username: "",
    displayName: profile.displayName,
    avatar: profile.avatarUrl || "",
    bio: profile.bio || "",
    website: profile.website || undefined,
    followers: stats.followersCount,
    following: stats.followingCount,
    posts: stats.postsCount,
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
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${id}/stats`,
    );
    const user = transformBEUserProfile(data, statsRes.data);
    cacheUser(user);
    return user;
  } catch {
    return {
      id,
      username: "",
      displayName: "User",
      avatar: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  try {
    if (id === getCurrentUserId() || id === "current") {
      const { data } = await apiClient.get<BE_UserProfile>(
        "/user/userprofile/me",
      );
      const statsRes = await apiClient.get<BE_FollowStats>(
        `/user/follow/${data.userId}/stats`,
      );
      return transformBEUserProfile(data, statsRes.data);
    }
    const { data } = await apiClient.get<BE_UserProfile>(
      `/user/userprofile/${id}`,
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${id}/stats`,
    );
    return transformBEUserProfile(data, statsRes.data);
  } catch {
    await delay(200);
    if (id === "current") {
      const existing = getCurrentUser();
      if (existing) return existing;
      return {
        id: "current",
        username: "anhvu",
        displayName: "Anh Vu",
        avatar: "https://i.pravatar.cc/150?img=33",
        bio: "Software engineer \\ud83d\\udcbb",
        followers: 1240,
        following: 380,
        posts: 45,
        isVerified: false,
      } as User;
    }
    return mockUsers.find((user) => user.id === id);
  }
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
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
  } catch {
    await delay(300);
    if (userId === "current") return [...mockActiveUserPosts];
    return mockPosts.filter((p) => p.userId === userId);
  }
}

export async function getCurrentUserProfile(): Promise<User> {
  const existing = getCurrentUser();
  if (existing) return existing;
  return {
    id: "current",
    username: "anhvu",
    displayName: "Anh Vu",
    avatar: "https://i.pravatar.cc/150?img=33",
    bio: "Software engineer \\ud83d\\udcbb",
    followers: 1240,
    following: 380,
    posts: 45,
    isVerified: false,
  };
}

export async function followUser(userId: string): Promise<boolean> {
  try {
    await apiClient.post(`/user/follow/${userId}`);
    return true;
  } catch {
    await delay(300);
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      if (!activeUserFollowingIds.has(userId)) {
        activeUserFollowingIds.add(userId);
        user.isFollowing = true;
        user.followers += 1;
      }
      return true;
    }
    return false;
  }
}

export async function unfollowUser(userId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/user/follow/${userId}`);
    return true;
  } catch {
    await delay(300);
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      if (activeUserFollowingIds.has(userId)) {
        activeUserFollowingIds.delete(userId);
        user.isFollowing = false;
        user.followers = Math.max(0, user.followers - 1);
      }
      return true;
    }
    return false;
  }
}

export async function toggleFollow(userId: string): Promise<boolean> {
  try {
    const isCurrentlyFollowing = activeUserFollowingIds.has(userId);
    if (isCurrentlyFollowing) {
      await apiClient.delete(`/user/follow/${userId}`);
    } else {
      await apiClient.post(`/user/follow/${userId}`);
    }
    return !isCurrentlyFollowing;
  } catch {
    await delay(200);
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return false;

    if (activeUserFollowingIds.has(userId)) {
      activeUserFollowingIds.delete(userId);
      user.isFollowing = false;
      user.followers = Math.max(0, user.followers - 1);
      return false;
    } else {
      activeUserFollowingIds.add(userId);
      user.isFollowing = true;
      user.followers += 1;
      return true;
    }
  }
}

export function isFollowing(userId: string): boolean {
  return activeUserFollowingIds.has(userId);
}

export async function getFollowers(userId: string): Promise<User[]> {
  try {
    const targetId = userId === "current" ? getCurrentUserId() : userId;
    const { data } = await apiClient.get<BE_UserProfile[]>(
      `/user/follow/${targetId}/followers`,
      { params: { skip: 0, take: 20 } },
    );
    return data.map((p) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      bio: p.bio || "",
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
    const { data } = await apiClient.get<BE_UserProfile[]>(
      `/user/follow/${targetId}/following`,
      { params: { skip: 0, take: 20 } },
    );
    return data.map((p) => ({
      id: p.userId,
      username: "",
      displayName: p.displayName,
      avatar: p.avatarUrl || "",
      bio: p.bio || "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    return mockUsers.filter((u) => activeUserFollowingIds.has(u.id));
  }
}

export async function updateProfile(updates: {
  displayName?: string;
  bio?: string;
  website?: string;
}): Promise<User> {
  try {
    const body: Record<string, string> = {};
    if (updates.displayName !== undefined)
      body.displayName = updates.displayName;
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
      if (updates.bio !== undefined) existing.bio = updates.bio;
      if (updates.website !== undefined) existing.website = updates.website;
      setCurrentUser(existing);
      return existing;
    }
    return {} as User;
  }
}

export async function updateAvatar(avatarUri: string): Promise<User> {
  try {
    const { data } = await apiClient.put<BE_UserProfile>(
      "/user/userprofile/me/avatar",
      {
        avatarUrl: avatarUri,
      },
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  } catch {
    await delay(500);
    const existingUser = getCurrentUser();
    if (existingUser) {
      existingUser.avatar = avatarUri;
      setCurrentUser(existingUser);
      return existingUser;
    }
    return {} as User;
  }
}

export async function updateCover(coverUri: string): Promise<User> {
  try {
    const { data } = await apiClient.put<BE_UserProfile>(
      "/user/userprofile/me/cover",
      {
        coverImageUrl: coverUri,
      },
    );
    const statsRes = await apiClient.get<BE_FollowStats>(
      `/user/follow/${data.userId}/stats`,
    );
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    setCurrentUser(user);
    return user;
  } catch {
    await delay(500);
    const existingUser = getCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
      return existingUser;
    }
    return {} as User;
  }
}
