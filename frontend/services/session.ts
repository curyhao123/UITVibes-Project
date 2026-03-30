import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../data/mockData";

export type AccountType = "newUser" | "activeUser";

let currentAccount: AccountType = "activeUser";
let currentUserId: string = "current";
let currentUser: User | null = null;
const userCache: Map<string, User> = new Map();

const LOCAL_HANDLE_KEY = "@uitvibes_local_username_handle";

type LocalHandlePayload = { userId: string; username: string };

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
}

export function getCachedUser(id: string): User | undefined {
  return userCache.get(id);
}

export function cacheUser(user: User): void {
  userCache.set(user.id, user);
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
