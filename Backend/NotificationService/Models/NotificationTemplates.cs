using NotificationService.Enums;

namespace NotificationService.Models
{
    public static class NotificationTemplates
    {
        public static (string Title, string Body) Render(
            NotificationType type, string actorName, string? extra = null)
        => type switch
        {
            NotificationType.NewMessage => ("New Message",
                                               $"{actorName} sent you a message."),
            NotificationType.MessageRead => ("Message Read",
                                               $"{actorName} read your message"),
            NotificationType.PostLiked => ("Liked Your Post",
                                               $"{actorName} liked your post"),
            NotificationType.PostCommented => ("New Comment",
                                               $"{actorName} commented on your post"),
            NotificationType.NewFollower => ("New Follower",
                                               $"{actorName} started following you"),
            NotificationType.Mentioned => ("You Were Mentioned",
                                               $"{actorName} mentioned you in a comment"),
            NotificationType.Tagged => ("You Were Tagged",
                                               $"{actorName} tagged you in a post"),
            _ => ("New Notification", actorName)
        };
    }
}
