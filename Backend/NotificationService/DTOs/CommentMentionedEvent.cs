namespace NotificationService.DTOs
{
    public record CommentMentionedEvent(
         Guid MentionedUserId,
         Guid MentionerId,
         string MentionerName,
         Guid PostId,
         Guid CommentId,
         string? CommentPreview
     );
}
