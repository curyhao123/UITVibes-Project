using PostService.DTOs;

namespace PostService.ServiceLayer.Interface
{
    public interface IReelService
    {
        // CRUD
        Task<ReelMediaUploadResponse> UploadVideoAsync(IFormFile file);
        Task<ReelDto> CreateReelAsync(Guid userId, CreateReelRequest request);
        Task<ReelDto> GetReelByIdAsync(Guid reelId, Guid? currentUserId);
        Task<List<ReelDto>> GetReelsAsync(int skip, int take, Guid? currentUserId);
        Task<List<ReelDto>> GetReelsByUserAsync(Guid userId, int skip, int take, Guid? currentUserId);
        Task DeleteReelAsync(Guid reelId, Guid userId);

        // Tương tác
        Task LikeReelAsync(Guid reelId, Guid userId);
        Task UnlikeReelAsync(Guid reelId, Guid userId);
        Task IncrementViewCountAsync(Guid reelId);
        Task ShareReelAsync(Guid reelId, Guid userId);


        // Comment
        Task<ReelCommentDto> CreateCommentAsync(Guid reelId, Guid userId, CreateReelCommentRequest request);
        Task<List<ReelCommentDto>> GetCommentsAsync(Guid reelId, int skip, int take);
        Task<List<ReelCommentDto>> GetRepliesAsync(Guid commentId, int skip, int take);
        Task DeleteCommentAsync(Guid commentId, Guid userId);
        Task LikeCommentAsync(Guid commentId, Guid userId);
        Task UnlikeCommentAsync(Guid commentId, Guid userId);
    }
}
