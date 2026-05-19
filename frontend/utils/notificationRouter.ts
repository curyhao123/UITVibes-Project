import { Router } from 'expo-router';

type NotificationData = {
  type?: string;
  entityId?: string;
};

/**
 * Routes the user to the correct screen based on FCM notification data.
 * Uses the `type` and `entityId` fields from FcmPushSender's data payload.
 */
export function handleNotificationTap(
  data: NotificationData | undefined,
  router: Router,
) {
  if (!data?.type) return;

  switch (data.type) {
    case 'PostLiked':
    case 'PostCommented':
      if (data.entityId) router.push(`/post/${data.entityId}`);
      break;
    case 'NewFollower':
      if (data.entityId) router.push(`/profile/${data.entityId}`);
      break;
    case 'MessageSent':
      router.push('/message');
      break;
    default:
      router.push('/notifications');
  }
}
