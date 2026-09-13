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
  const { data } = await apiClient.get<PagedResult<Notification>>(BASE, {
    params: { page, pageSize },
  });
  return data;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await apiClient.put(`${BASE}/${notificationId}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put(`${BASE}/read-all`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<{ unreadCount: number }>(
    `${BASE}/unread-count`,
  );
  return data.unreadCount;
}

// --- Notification settings ---
export interface NotificationSetting {
  isEnabled: boolean;
}

export async function getNotificationSetting(): Promise<NotificationSetting> {
  const { data } = await apiClient.get<NotificationSetting>(SETTINGS_BASE);
  return data;
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