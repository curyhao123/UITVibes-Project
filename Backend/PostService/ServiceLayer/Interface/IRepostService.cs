using PostService.DTOs;

namespace PostService.ServiceLayer.Interface
{
    public interface IRepostService
    {
        Task<RepostResponse> CreateRepostAsync(Guid originalPostId, Guid userId);
        Task UndoRepostAsync(Guid originalPostId, Guid userId);
        Task<bool> HasRepostedAsync(Guid originalPostId, Guid userId);
        Task<List<PostDto>> GetUserRepostsAsync(Guid userId, Guid? currentUserId = null, int skip = 0, int take = 20);
    }
}
