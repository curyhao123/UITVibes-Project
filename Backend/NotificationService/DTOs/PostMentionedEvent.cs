namespace NotificationService.DTOs
{
    public record PostMentionedEvent(
         Guid MentionedUserId,
         Guid MentionerId,
         string MentionerName,
         Guid PostId
     );
}
