/**
 * Frontend notification type definitions
 * Aligned with backend NotificationService DTOs
 */

export type DevicePlatform = "Android" | "iOS";

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: 0 | 1; // 0 for Android, 1 for iOS
}

export interface NotificationDto {
  id: string;
  actorId: string;
  entityId: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface NotificationSettings {
  userId: string;
  enablePushNotifications: boolean;
  enableInAppNotifications: boolean;
  enableEmailNotifications: boolean;
}
