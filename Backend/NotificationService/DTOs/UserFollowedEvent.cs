namespace NotificationService.DTOs
{
    public record UserFollowedEvent(
        Guid FollowerId,
        Guid FolloweeId,
        string FollowerName,
        DateTime FollowedAt
    );
}
