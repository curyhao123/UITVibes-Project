/**
 * Notification Service
 * Calls backend NotificationService endpoints via API Gateway
 * GET /api/notification
 * PUT /api/notification/{id}/read
 * PUT /api/notification/read-all
 * GET /api/notification/unread-count
 */

import apiClient from "./httpClient";
import type {
  NotificationDto,
  PagedResult,
  UnreadCountResponse,
} from "../data/notification.d";
import type { Notification } from "../data/mockData";

/**
 * Fetch paginated notifications for current user
 * GET /api/notification?page=1&pageSize=20
 */
export async function getNotifications(
  page: number = 1,
  pageSize: number = 20,
): Promise<Notification[]> {
  try {
    const response = await apiClient.get<PagedResult<NotificationDto>>(
      "/notification",
      {
        params: { page, pageSize },
      },
    );

    return (response.data.items || []).map(
      transformNotificationDtoToNotification,
    );
  } catch (error) {
    console.error("[Notification] Failed to fetch notifications:", error);
    return [];
  }
}

/**
 * Mark a single notification as read
 * PUT /api/notification/{id}/read
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  try {
    await apiClient.put(
      `/notification/${notificationId}/read`,
    );

    if (__DEV__) {
      console.log(`[Notification] Marked as read: ${notificationId}`);
    }
  } catch (error) {
    console.error("[Notification] Failed to mark as read:", error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 * PUT /api/notification/read-all
 */
export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiClient.put(`/notification/read-all`);

    if (__DEV__) {
      console.log("[Notification] Marked all as read");
    }
  } catch (error) {
    console.error("[Notification] Failed to mark all as read:", error);
    throw error;
  }
}

/**
 * Get unread notification count
 * GET /api/notification/unread-count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const response = await apiClient.get<UnreadCountResponse>(
      `/notification/unread-count`,
    );

    return response.data.unreadCount || 0;
  } catch (error) {
    console.error("[Notification] Failed to get unread count:", error);
    return 0;
  }
}

/**
 * Transform backend NotificationDto to frontend Notification model
 * Maps backend fields to frontend model structure
 */
function transformNotificationDtoToNotification(
  dto: NotificationDto,
): Notification {
  return {
    id: dto.id,
    type: (dto.type.toLowerCase() as any) || "follow",
    user: {
      id: dto.actorId,
      username: "unknown",
      displayName: "Unknown User",
      fullName: "Unknown User",
      avatar: "",
      coverImage: "",
      bio: "",
      gender: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    },
    message: dto.content,
    createdAt: dto.createdAt,
    isRead: dto.isRead,
  };
}
