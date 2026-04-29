import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../data/mockData";

export type AccountType = "newUser" | "activeUser";

let currentAccount: AccountType = "activeUser";
let currentUserId: string = "current";
let currentUser: User | null = null;
const userCache: Map<string, User> = new Map();

const LOCAL_HANDLE_KEY = "@uitvibes_local_username_handle";
/** URL avatar đã xác nhận từ BE — dùng khi login/refresh tạm thời không trả avatarUrl */
const AVATAR_URL_PREFIX = "@uitvibes_avatar_url_";

type LocalHandlePayload = { userId: string; username: string };

const RECENT_SEARCHES_KEY = "@uitvibes_recent_searches";
const MAX_RECENT_SEARCHES = 20;

export type RecentSearch = {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  searchedAt: number;
};

export async function getLocalRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RecentSearch[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveLocalRecentSearch(item: RecentSearch): Promise<void> {
  try {
    const existing = await getLocalRecentSearches();
    const filtered = existing.filter((s) => s.userId !== item.userId);
    const updated = [item, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

export async function removeLocalRecentSearch(userId: string): Promise<void> {
  try {
    const existing = await getLocalRecentSearches();
    const updated = existing.filter((s) => s.userId !== userId);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

export async function clearLocalRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    /* ignore */
  }
}

export async function persistUserAvatarUrl(
  userId: string,
  url: string,
): Promise<void> {
  const u = url?.trim();
  if (!userId || !u) return;
  try {
    await AsyncStorage.setItem(`${AVATAR_URL_PREFIX}${userId}`, u);
  } catch {
    /* ignore */
  }
}

export async function getPersistedAvatarUrl(
  userId: string,
): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(`${AVATAR_URL_PREFIX}${userId}`);
    return v?.trim() || null;
  } catch {
    return null;
  }
}

export async function clearPersistedAvatarUrl(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${AVATAR_URL_PREFIX}${userId}`);
  } catch {
    /* ignore */
  }
}

/** Nếu BE không trả avatar (lỗi tạm / mapping) nhưng đã từng có URL trên máy → gắn lại */
export async function mergePersistedAvatarIfMissing(user: User): Promise<User> {
  if (user.avatar?.trim()) return user;
  const cached = await getPersistedAvatarUrl(user.id);
  if (cached) return { ...user, avatar: cached };
  return user;
}

export function getCurrentAccount(): AccountType {
  return currentAccount;
}

export function setCurrentAccount(account: AccountType): void {
  currentAccount = account;
}

export function getCurrentUserId(): string {
  return currentUserId;
}

export function setCurrentUserId(id: string): void {
  currentUserId = id;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export function setCurrentUser(user: User | null): void {
  currentUser = user;
  if (user?.id && user.avatar?.trim()) {
    void persistUserAvatarUrl(user.id, user.avatar);
  }
}

export function getCachedUser(id: string): User | undefined {
  return userCache.get(id);
}

export function cacheUser(user: User): void {
  userCache.set(user.id, user);
}

export function clearUserCache(): void {
  userCache.clear();
}

async function readLocalHandle(userId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_HANDLE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalHandlePayload;
    return p.userId === userId && p.username?.trim() ? p.username.trim() : null;
  } catch {
    return null;
  }
}

export async function writeLocalHandle(
  userId: string,
  username: string,
): Promise<void> {
  const t = username.trim();
  if (!userId || !t) return;
  await AsyncStorage.setItem(
    LOCAL_HANDLE_KEY,
    JSON.stringify({ userId, username: t }),
  );
}

export async function clearLocalHandle(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_HANDLE_KEY);
}

/**
 * BE profile DTO không có username — gắn lại từ session / storage.
 */
export async function applyLocalUsernameToUser(user: User): Promise<User> {
  const fromDto = user.username?.trim();
  if (fromDto) return user;
  const fromSession =
    currentUser?.id === user.id ? currentUser.username?.trim() || "" : "";
  const fromStore = (await readLocalHandle(user.id)) || "";
  const u = fromSession || fromStore;
  return u ? { ...user, username: u } : user;
}

/**
 * Gọi từ onboarding (hoặc chỗ khác) để profile hiển thị đúng @username user nhập.
 */
export function patchCurrentUserLocal(updates: {
  username?: string;
  displayName?: string;
}): void {
  if (!currentUser) return;
  let next: User = { ...currentUser };
  if (updates.username != null) {
    const t = updates.username.trim();
    if (t) {
      next = { ...next, username: t };
      void writeLocalHandle(next.id, t);
    }
  }
  if (updates.displayName != null) {
    const t = updates.displayName.trim();
    if (t) next = { ...next, displayName: t };
  }
  currentUser = next;
}
