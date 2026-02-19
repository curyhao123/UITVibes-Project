using UserService.DTOs;

namespace UserService.ServiceLayer.Interface;

public interface IFollowService
{
    Task<FollowDto> FollowUserAsync(Guid followerId, Guid followingId);
    Task UnfollowUserAsync(Guid followerId, Guid followingId);
    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
    Task<UserFollowStatsDto> GetFollowStatsAsync(Guid userId, Guid? currentUserId = null);
    Task<List<FollowerListDto>> GetFollowersAsync(Guid userId, int skip = 0, int take = 50);
    Task<List<FollowerListDto>> GetFollowingAsync(Guid userId, int skip = 0, int take = 50);
}