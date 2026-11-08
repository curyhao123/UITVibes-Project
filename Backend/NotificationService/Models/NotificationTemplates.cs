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
                                               $"{actorName} read your message."),
            NotificationType.PostLiked => ("Liked Your Post",
                                               $"{actorName} liked your post."),
            NotificationType.PostCommented => ("New Comment",
                                               $"{actorName} commented on your post."),
            NotificationType.NewFollower => ("New Follower",
                                               $"{actorName} started following you."),
            NotificationType.Mentioned => ("You Were Mentioned",
                                               $"{actorName} mentioned you in a comment."),
            NotificationType.Tagged => ("You Were Tagged",
                                               $"{actorName} tagged you in a post."),

            // ── Moderation ───────────────────────────────────────────────────
            // actorName = tên loại nội dung ("post" / "comment" / "reel")
            // extra = lý do do AI hoặc admin đưa ra (có thể null).
            NotificationType.ContentRejected => ("Content Rejected",
                                               BuildRejectedBody(actorName, extra)),
            NotificationType.ContentNeedsReview => ("Content Under Review",
                                               BuildNeedsReviewBody(actorName, extra)),
            NotificationType.AppealResolved => ("Appeal Resolved",
                                               BuildAppealResolvedBody(actorName, extra)),

            _ => ("New Notification", actorName)
        };

        private static string BuildRejectedBody(string contentType, string? reason)
        {
            var label = NormalizeContentType(contentType);
            return string.IsNullOrWhiteSpace(reason)
                ? $"Your {label} was rejected and is no longer visible to other people."
                : $"Your {label} was rejected: {reason}";
        }

        private static string BuildNeedsReviewBody(string contentType, string? reason)
        {
            var label = NormalizeContentType(contentType);
            return string.IsNullOrWhiteSpace(reason)
                ? $"Your {label} needs a review by our moderation team. We'll let you know once there's a decision."
                : $"Your {label} needs a review by our moderation team. Note from the review: {reason}";
        }

        private static string BuildAppealResolvedBody(string contentType, string? reason)
        {
            var label = NormalizeContentType(contentType);
            return string.IsNullOrWhiteSpace(reason)
                ? $"Your appeal for the {label} was reviewed. Open your content to see the result."
                : $"Your appeal for the {label} was reviewed: {reason}";
        }

        /// <summary>
        /// Chuẩn hoá tên loại nội dung về dạng đọc tự nhiên trong câu tiếng Anh.
        ///
        /// "ReelComment" (bình luận trên reel) là bình luận → dùng "comment",
        /// không phải "post". Nếu không map riêng, mọi bình luận trên reel bị từ chối
        /// sẽ báo "Your post was rejected" — sai ngữ cảnh.
        /// </summary>
        private static string NormalizeContentType(string contentType) => contentType?.ToLowerInvariant() switch
        {
            "comment" => "comment",
            "reelcomment" => "comment",
            "reel" => "reel",
            "story" => "story",
            _ => "post"
        };
    }
}
