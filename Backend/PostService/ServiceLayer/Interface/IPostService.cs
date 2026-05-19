using PostService.DTOs;
using PostService.Models;

namespace PostService.ServiceLayer.Interface;

public interface IPostService
{
    Task<PostDto> CreatePostAsync(Guid userId, CreatePostRequest request);
    Task<PostDto> GetPostByIdAsync(Guid postId, Guid? currentUserId = null);
    Task<List<PostDto>> GetUserPostsAsync(Guid userId, Guid? currentUserId = null, int skip = 0, int take = 20);
    Task<List<PostDto>> GetFeedAsync(Guid userId, int skip = 0, int take = 20);
    Task<PostDto> UpdatePostAsync(Guid postId, Guid userId, UpdatePostRequest request);
    Task DeletePostAsync(Guid postId, Guid userId);
    Task<MediaUploadResponse> UploadMediaAsync(IFormFile file);

    // ===== LIKE FUNCTIONS =====
    Task<LikeResponse> LikePostAsync(Guid postId, Guid userId);
    Task UnlikePostAsync(Guid postId, Guid userId);
    Task<List<LikeDto>> GetPostLikesAsync(Guid postId, int skip = 0, int take = 50);
    Task<List<PostReportDto>> GetPostReportsAsync(int skip = 0, int take = 20, ReportStatus? status = null);
    Task<PostReportDto> CreatePostReportAsync(Guid userId, ReportPostRequest request);
}