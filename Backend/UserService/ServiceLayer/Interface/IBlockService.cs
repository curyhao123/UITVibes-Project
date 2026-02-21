using UserService.DTOs;

namespace UserService.ServiceLayer.Interface
{
    public interface IBlockService
    {
        Task<BlockDto> BlockUserAsync(Guid blockerId, Guid blockedId);
        Task UnblockUserAsync(Guid blockerId, Guid blockedId);
        Task<bool> IsBlockedAsync(Guid blockerId, Guid blockedId);
        Task<List<BlockListDto>> GetBlockedUsersAsync(Guid userId, int skip = 0, int take = 50);

    }
}
