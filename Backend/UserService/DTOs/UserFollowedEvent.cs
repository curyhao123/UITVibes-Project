namespace UserService.DTOs
{
    public record UserFollowedEvent(
        Guid FollowerId,
        Guid FolloweeId,
        string FollowerName,
        DateTime FollowedAt
    );
}
