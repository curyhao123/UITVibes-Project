import apiClient from "./httpClient";

// Gateway: /notification/** → NotificationService /api/**
const BASE = "/notification";
const SETTINGS_BASE = "/notification/settings";
const DEVICE_BASE = "/notification/device";

export type NotificationType =
  | "NewFollower"
  | "PostLiked"
  | "PostCommented"
  | "Mentioned"
  | "Tagged"
  | "NewMessage"
  | "MessageRead";

export interface Notification {
  id: string;
  actorId: string;
  entityId: string;
  type: NotificationType;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
}

export async function getNotifications(
  page = 1,
  pageSize = 20,
): Promise<PagedResult<Notification>> {
  try {
    const { data } = await apiClient.get<PagedResult<Notification>>(BASE, {
      params: { page, pageSize },
    });
    return data;
  } catch (err) {
    console.warn("[getNotifications] API error:", err);
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      hasNext: false,
    };
  }
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  try {
    await apiClient.put(`${BASE}/${notificationId}/read`);
  } catch {}
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.put(`${BASE}/read-all`);
  } catch {}
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const { data } = await apiClient.get<{ unreadCount: number }>(
      `${BASE}/unread-count`,
    );
    return data?.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

// --- Notification settings ---
export interface NotificationSetting {
  isEnabled: boolean;
}

export async function getNotificationSetting(): Promise<NotificationSetting> {
  try {
    const { data } = await apiClient.get<NotificationSetting>(SETTINGS_BASE);
    return data || { isEnabled: true };
  } catch {
    return { isEnabled: true };
  }
}

export async function updateNotificationSetting(
  isEnabled: boolean,
): Promise<void> {
  await apiClient.put(SETTINGS_BASE, { isEnabled });
}

// --- Device token registration ---
export async function registerDeviceToken(
  token: string,
  platform: "ios" | "android",
): Promise<void> {
  await apiClient.post(`${DEVICE_BASE}/register`, { token, platform });
}