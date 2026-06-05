import { PermissionsAndroid, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import apiClient from "./httpClient";

export type BackendNotificationType =
  | "NewMessage"
  | "MessageRead"
  | "PostLiked"
  | "PostCommented"
  | "NewFollower"
  | "Mentioned"
  | "Tagged"
  | string;

export interface BackendNotificationDto {
  id: string;
  actorId: string;
  entityId: string;
  type: BackendNotificationType;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface PagedNotificationResult<T> {
  items: T[];
  Items?: T[];
  totalCount: number;
  TotalCount?: number;
  page: number;
  Page?: number;
  pageSize: number;
  PageSize?: number;
  totalPages: number;
  TotalPages?: number;
  hasNext: boolean;
  HasNext?: boolean;
}

export interface NotificationSettingDto {
  isEnabled: boolean;
}

export type Notification = BackendNotificationDto & {
  message: string;
};

type DevicePlatform = "Android" | "iOS";
export type PushRemoteMessage = {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, unknown>;
};

type MessagingModule = typeof import("@react-native-firebase/messaging").default;

function toNotification(dto: BackendNotificationDto): Notification {
  return {
    ...dto,
    message: dto.content,
  };
}

function getDevicePlatform(): DevicePlatform {
  return Platform.OS === "ios" ? "iOS" : "Android";
}

export function isPushRuntimeSupported(): boolean {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function getMessagingModule(): MessagingModule | null {
  if (!isPushRuntimeSupported()) return null;

  try {
    const module = require("@react-native-firebase/messaging");
    return (module.default ?? module) as MessagingModule;
  } catch (error) {
    console.warn("[Notifications] Firebase Messaging is unavailable", error);
    return null;
  }
}

function isPermissionGranted(status: number): boolean {
  return status === 1 || status === 2;
}

async function requestAndroidNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const version =
    typeof Platform.Version === "number"
      ? Platform.Version
      : Number.parseInt(String(Platform.Version), 10);

  if (!Number.isFinite(version) || version < 33) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function getNotifications(
  page = 1,
  pageSize = 20,
): Promise<Notification[]> {
  const data = await getNotificationPage(page, pageSize);
  return data.items;
}

export async function getNotificationPage(
  page = 1,
  pageSize = 20,
): Promise<PagedNotificationResult<Notification>> {
  const { data } = await apiClient.get<
    PagedNotificationResult<BackendNotificationDto>
  >("/notification", {
    params: { page, pageSize },
  });

  const items = (data.items ?? data.Items ?? [])
    .map(toNotification)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return {
    ...data,
    items,
    Items: items,
    totalCount: data.totalCount ?? data.TotalCount ?? items.length,
    page: data.page ?? data.Page ?? page,
    pageSize: data.pageSize ?? data.PageSize ?? pageSize,
    totalPages: data.totalPages ?? data.TotalPages ?? 1,
    hasNext: data.hasNext ?? data.HasNext ?? false,
  };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await apiClient.put(`/notification/${notificationId}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put("/notification/read-all");
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<{ unreadCount?: number; UnreadCount?: number }>(
    "/notification/unread-count",
  );
  return data.unreadCount ?? data.UnreadCount ?? 0;
}

export async function getNotificationSettings(): Promise<NotificationSettingDto> {
  const { data } = await apiClient.get<
    NotificationSettingDto & { IsEnabled?: boolean }
  >(
    "/notifications/settings",
  );
  return { isEnabled: data.isEnabled ?? data.IsEnabled ?? false };
}

export async function updateNotificationSettings(
  isEnabled: boolean,
): Promise<void> {
  await apiClient.put("/notifications/settings", { isEnabled });
}

export async function registerDeviceToken(token: string): Promise<void> {
  await apiClient.post("/notification/device/register", {
    token,
    platform: getDevicePlatform(),
  });
}

export async function registerDeviceForPushNotifications(): Promise<boolean> {
  try {
    const messaging = getMessagingModule();
    if (!messaging) return false;

    const settings = await getNotificationSettings();
    if (!settings.isEnabled) return false;

    if (!messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
    }

    if (!(await requestAndroidNotificationPermission())) return false;

    if (Platform.OS === "ios") {
      const status = await messaging().requestPermission();
      if (!isPermissionGranted(status)) return false;
    }

    const token = await messaging().getToken();
    if (!token) return false;

    await registerDeviceToken(token);
    return true;
  } catch (error) {
    console.warn("[Notifications] Failed to register device token", error);
    return false;
  }
}

export function subscribeToPushTokenRefresh(): () => void {
  const messaging = getMessagingModule();
  if (!messaging) return () => {};

  return messaging().onTokenRefresh((token) => {
    void (async () => {
      const settings = await getNotificationSettings();
      if (!settings.isEnabled) return;
      await registerDeviceToken(token);
    })().catch((error) => {
      console.warn("[Notifications] Failed to register refreshed token", error);
    });
  });
}

export function subscribeToForegroundNotifications(
  handler: (message: PushRemoteMessage) => void,
): () => void {
  const messaging = getMessagingModule();
  if (!messaging) return () => {};

  return messaging().onMessage(async (message) => {
    handler(message);
  });
}

export function subscribeToNotificationOpened(
  handler: (message: PushRemoteMessage) => void,
): () => void {
  const messaging = getMessagingModule();
  if (!messaging) return () => {};

  return messaging().onNotificationOpenedApp((message) => {
    handler(message);
  });
}

export async function getInitialPushNotification(): Promise<PushRemoteMessage | null> {
  const messaging = getMessagingModule();
  if (!messaging) return null;

  return messaging().getInitialNotification();
}
