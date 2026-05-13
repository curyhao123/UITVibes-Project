namespace NotificationService.Models
{
    public static class NotificationTemplates
    {
        public static (string Title, string Body) Render(
            NotificationType type, string actorName, string? extra = null)
        => type switch
        {
            NotificationType.NewMessage => ("Tin nhắn mới",
                                               $"{actorName}: {extra}"),
            NotificationType.MessageRead => ("Tin nhắn đã đọc",
                                               $"{actorName} đã đọc tin nhắn của bạn"),
            NotificationType.PostLiked => ("Bài viết được thích",
                                               $"{actorName} đã thích bài viết của bạn"),
            NotificationType.PostCommented => ("Bình luận mới",
                                               $"{actorName} đã bình luận bài viết của bạn"),
            NotificationType.NewFollower => ("Người theo dõi mới",
                                               $"{actorName} đã bắt đầu theo dõi bạn"),
            NotificationType.Mentioned => ("Bạn được nhắc đến",
                                               $"{actorName} đã nhắc đến bạn trong một bình luận"),
            NotificationType.Tagged => ("Bạn được gắn thẻ",
                                               $"{actorName} đã gắn thẻ bạn trong một bài viết"),
            _ => ("Thông báo mới", actorName)
        };
    }
}
