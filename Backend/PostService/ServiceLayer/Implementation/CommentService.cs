using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public class CommentService : ICommentService
{
    private readonly PostDbContext _context;
    private readonly ILogger<CommentService> _logger;

    public CommentService(PostDbContext context, ILogger<CommentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<CommentDto> CreateCommentAsync(Guid postId, Guid userId, CreateCommentRequest request)
    {
        // Check if post exists
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted);
        
        if (post == null)
            throw new KeyNotFoundException("Post not found");

        // If replying to a comment, check parent exists
        if (request.ParentCommentId.HasValue)
        {
            var parentComment = await _context.Comments
                .FirstOrDefaultAsync(c => c.Id == request.ParentCommentId.Value && !c.IsDeleted);
            
            if (parentComment == null)
                throw new KeyNotFoundException("Parent comment not found");

            // ✅ RESTRICT: Only allow replying to top-level comments (depth = 1)
            if (parentComment.ParentCommentId.HasValue)
                throw new InvalidOperationException("Cannot reply to a reply. You can only reply to top-level comments.");

            // Increment parent's replies count
            parentComment.RepliesCount++;
        }

        // Create comment
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            UserId = userId,
            Content = request.Content,
            ParentCommentId = request.ParentCommentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);

        post.CommentsCount++;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} commented on post {PostId}", userId, postId);

        return MapToDto(comment, userId);
    }

    public async Task<List<CommentDto>> GetPostCommentsAsync(Guid postId, Guid? currentUserId, int skip = 0, int take = 50)
    {
        // Check if post exists
        var postExists = await _context.Posts.AnyAsync(p => p.Id == postId && !p.IsDeleted);
        
        if (!postExists)
            throw new KeyNotFoundException("Post not found");

        // Get top-level comments only
        var comments = await _context.Comments
            .Where(c => c.PostId == postId && c.ParentCommentId == null && !c.IsDeleted)
            .OrderByDescending(c => c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return comments.Select(c => MapToDto(c, currentUserId)).ToList();
    }

    public async Task<List<CommentDto>> GetCommentRepliesAsync(Guid commentId, Guid? currentUserId, int skip = 0, int take = 50)
    {
        // Check if parent comment exists
        var parentExists = await _context.Comments.AnyAsync(c => c.Id == commentId && !c.IsDeleted);
        
        if (!parentExists)
            throw new KeyNotFoundException("Comment not found");

        // Get replies
        var replies = await _context.Comments
            .Where(c => c.ParentCommentId == commentId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt) // Replies usually chronological
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return replies.Select(c => MapToDto(c, currentUserId)).ToList();
    }

    public async Task<CommentDto> UpdateCommentAsync(Guid commentId, Guid userId, UpdateCommentRequest request)
    {
        var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId && !c.IsDeleted);

        if (comment == null)
            throw new KeyNotFoundException("Comment not found");

        if (comment.UserId != userId)
            throw new UnauthorizedAccessException("You can only edit your own comments");

        comment.Content = request.Content;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} updated comment {CommentId}", userId, commentId);

        return MapToDto(comment, userId);
    }

    public async Task DeleteCommentAsync(Guid commentId, Guid userId)
    {
        var comment = await _context.Comments
            .Include(c => c.Post)
            .FirstOrDefaultAsync(c => c.Id == commentId && !c.IsDeleted);

        if (comment == null)
            throw new KeyNotFoundException("Comment not found");

        if (comment.UserId != userId)
            throw new UnauthorizedAccessException("You can only delete your own comments");

        // Soft delete
        comment.IsDeleted = true;
        comment.UpdatedAt = DateTime.UtcNow;

        // Decrement post's comments count (only for top-level comments)
        if (!comment.ParentCommentId.HasValue && comment.Post.CommentsCount > 0)
        {
            comment.Post.CommentsCount--;
            comment.Post.UpdatedAt = DateTime.UtcNow;
        }
        // Decrement parent's replies count
        else if (comment.ParentCommentId.HasValue)
        {
            var parentComment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == comment.ParentCommentId.Value);
            if (parentComment != null && parentComment.RepliesCount > 0)
            {
                parentComment.RepliesCount--;
            }
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} deleted comment {CommentId}", userId, commentId);
    }

    public async Task<CommentLikeResponse> LikeCommentAsync(Guid commentId, Guid userId)
    {
        // Check if comment exists
        var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId && !c.IsDeleted);
        
        if (comment == null)
            throw new KeyNotFoundException("Comment not found");

        // Check if already liked
        var existingLike = await _context.CommentLikes
            .FirstOrDefaultAsync(l => l.CommentId == commentId && l.UserId == userId);

        if (existingLike != null)
            throw new InvalidOperationException("Comment already liked");

        // Create like
        var like = new CommentLike
        {
            Id = Guid.NewGuid(),
            CommentId = commentId,
            UserId = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.CommentLikes.Add(like);

        // Increment likes count
        comment.LikesCount++;

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} liked comment {CommentId}", userId, commentId);

        return new CommentLikeResponse
        {
            LikeId = like.Id,
            CommentId = commentId,
            UserId = userId,
            TotalLikes = comment.LikesCount,
            CreatedAt = like.CreatedAt
        };
    }

    public async Task UnlikeCommentAsync(Guid commentId, Guid userId)
    {
        // Find the like
        var like = await _context.CommentLikes
            .FirstOrDefaultAsync(l => l.CommentId == commentId && l.UserId == userId);

        if (like == null)
            throw new KeyNotFoundException("Like not found");

        // Get comment to decrement count
        var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId);
        
        if (comment == null)
            throw new KeyNotFoundException("Comment not found");

        // Remove like
        _context.CommentLikes.Remove(like);

        // Decrement likes count
        if (comment.LikesCount > 0)
        {
            comment.LikesCount--;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} unliked comment {CommentId}", userId, commentId);
    }

    private CommentDto MapToDto(Comment comment, Guid? currentUserId)
    {
        var dto = new CommentDto
        {
            Id = comment.Id,
            PostId = comment.PostId,
            UserId = comment.UserId,
            Content = comment.Content,
            ParentCommentId = comment.ParentCommentId,
            LikesCount = comment.LikesCount,
            RepliesCount = comment.RepliesCount,
            IsDeleted = comment.IsDeleted,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
            IsLikedByCurrentUser = false
        };

        if (currentUserId.HasValue)
        {
            dto.IsLikedByCurrentUser = _context.CommentLikes
                .Any(l => l.CommentId == comment.Id && l.UserId == currentUserId.Value);
        }

        return dto;
    }
}