namespace MessageService.ServiceLayer.Interface;

public interface IOnlineTrackingService
{
    Task SetUserOnlineAsync(Guid userId, string connectionId);
    Task SetUserOfflineAsync(Guid userId, string connectionId);
    Task<bool> IsUserOnlineAsync(Guid userId);
    Task<List<Guid>> GetOnlineUsersAsync(IEnumerable<Guid> userIds);
    Task<List<string>> GetUserConnectionIdsAsync(Guid userId);
}