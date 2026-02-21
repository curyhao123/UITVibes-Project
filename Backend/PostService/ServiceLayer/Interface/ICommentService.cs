using PostService.DTOs;

namespace PostService.ServiceLayer.Interface;

public interface ICommentService
{
    Task<CommentDto> CreateCommentAsync(Guid postId, Guid userId, CreateCommentRequest request);
    Task<List<CommentDto>> GetPostCommentsAsync(Guid postId, Guid? currentUserId, int skip = 0, int take = 50);
    Task<List<CommentDto>> GetCommentRepliesAsync(Guid commentId, Guid? currentUserId, int skip = 0, int take = 50);
    Task<CommentDto> UpdateCommentAsync(Guid commentId, Guid userId, UpdateCommentRequest request);
    Task DeleteCommentAsync(Guid commentId, Guid userId);
    
    // Comment likes
    Task<CommentLikeResponse> LikeCommentAsync(Guid commentId, Guid userId);
    Task UnlikeCommentAsync(Guid commentId, Guid userId);
}