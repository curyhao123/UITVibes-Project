import type { Notification } from "../services/notificationService";

type NotificationTarget = Pick<Notification, "type" | "entityId">;

export function getNotificationRoute(notification: NotificationTarget): string | null {
  const entityId = notification.entityId?.trim();
  if (!entityId) return null;

  switch (notification.type) {
    case "NewMessage":
    case "MessageRead":
      return `/message/chat/${entityId}`;
    case "NewFollower":
      return `/profile/${entityId}`;
    case "PostLiked":
    case "PostCommented":
    case "Mentioned":
    case "Tagged":
      return `/post/${entityId}`;
    default:
      return null;
  }
}
