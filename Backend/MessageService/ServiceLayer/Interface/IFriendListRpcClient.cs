using MessageService.DTOs;

namespace MessageService.ServiceLayer.Interface;

public interface IFriendListRpcClient
{
    Task<List<FriendSummaryDto>> GetFriendListAsync(
        Guid userId,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default);
}
