using MessageService.DTOs;

namespace MessageService.ServiceLayer.Interface;

public interface IOnlineTrackingService
{
    Task SetUserOnlineAsync(Guid userId, string connectionId);
    Task SetUserOfflineAsync(Guid userId, string connectionId);
    Task<bool> IsUserOnlineAsync(Guid userId);
    Task<List<Guid>> GetOnlineUsersAsync(IEnumerable<Guid> userIds);
    Task<List<string>> GetUserConnectionIdsAsync(Guid userId);
    Task<List<OnlineFriendDto>> GetOnlineFriendsAsync(
        Guid userId,
        int skip = 0,
        int take = 20,
        CancellationToken cancellationToken = default);
}