import type { Notification } from "../../services/notificationService";

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
    // Moderation: entityId là id của nội dung bị kiểm duyệt (post/comment/reel).
    // Điều hướng về bài viết là hợp lý nhất vì FE không lưu id comment/reel
    // trong ngữ cảnh điều hướng thông báo.
    case "ContentRejected":
    case "ContentNeedsReview":
    case "AppealResolved":
      return `/post/${entityId}`;
    default:
      return null;
  }
}