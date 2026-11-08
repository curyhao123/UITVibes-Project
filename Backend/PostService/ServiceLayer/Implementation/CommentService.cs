using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Implementation;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Interface;
using System.Text.RegularExpressions;

namespace PostService.ServiceLayer.Implementation;

public class CommentService : ICommentService
{
    private readonly PostDbContext _context;
    private readonly ILogger<CommentService> _logger;
    private readonly IPostCommentedPublisher _postCommentedPublisher;
    private readonly IUserProfileRpcClient _userProfileRpcClient;
    private readonly ICommentMentionedPublisher _commentMentionedPublisher;
    private readonly IModerationEnqueuer _moderationEnqueuer;

    public CommentService(PostDbContext context, ILogger<CommentService> logger,
        IPostCommentedPublisher postCommentedPublisher,
        IUserProfileRpcClient userProfileRpcClient,
        ICommentMentionedPublisher commentMentionedPublisher,
        IModerationEnqueuer moderationEnqueuer)
    {
        _context = context;
        _logger = logger;
        _postCommentedPublisher = postCommentedPublisher;
        _userProfileRpcClient = userProfileRpcClient;
        _commentMentionedPublisher = commentMentionedPublisher;
        _moderationEnqueuer = moderationEnqueuer;
    }

    private List<string> ExtractMentions(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return [];
        }
        var regex = new Regex(@"@(\w+)", RegexOptions.IgnoreCase);
        var matches = regex.Matches(content);
        return matches.Select(m => m.Groups[1].Value.ToLower()).Distinct().ToList();
    }

    public async Task<CommentDto> CreateCommentAsync(Guid postId, Guid userId, CreateCommentRequest request)
    {
        // Validate: must have either content or image
        var hasContent = !string.IsNullOrWhiteSpace(request.Content);
        var hasImage = !string.IsNullOrWhiteSpace(request.ImageUrl);

        if (!hasContent && !hasImage)
        {
            throw new ArgumentException("Comment must have either content or an image");
        }

        // Check if post exists
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId && !p.IsDeleted && (p.UserId == userId || p.ModerationStatus == ModerationStatus.Approved));

        if (post == null)
            throw new KeyNotFoundException("Post not found");

        // If replying to a comment, flatten to root (flattened threading)
        Guid? rootCommentId = null;
        if (request.ParentCommentId.HasValue)
        {
            var parentComment = await _context.Comments
                .FirstOrDefaultAsync(c => c.Id == request.ParentCommentId.Value && !c.IsDeleted);

            if (parentComment == null)
                throw new KeyNotFoundException("Parent comment not found");

            // Find root comment (could be parent itself if already top-level)
            var rootComment = parentComment.ParentCommentId == null
                ? parentComment
                : await _context.Comments
                    .FirstOrDefaultAsync(c => c.Id == parentComment.ParentCommentId && !c.IsDeleted);

            if (rootComment == null)
                throw new KeyNotFoundException("Root comment not found");

            // All replies point to root comment
            rootCommentId = rootComment.Id;

            // Increment root's replies count
            rootComment.RepliesCount++;
        }

        // Create comment — ParentCommentId always points to root
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            UserId = userId,
            Content = request.Content ?? string.Empty,
            ImageUrl = hasImage ? request.ImageUrl : null,
            ParentCommentId = rootCommentId,
            ModerationStatus = ModerationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Comments.Add(comment);

        post.CommentsCount++;
        post.UpdatedAt = DateTime.UtcNow;


        await _context.SaveChangesAsync();

        // Bình luận cũng phải qua kiểm duyệt AI: bài về Pending và bị ẩn với
        // người khác cho tới khi có quyết định (tác giả vẫn thấy bình luận của mình).
        await _moderationEnqueuer.EnqueueAsync(
            ModerationTargetType.Comment,
            comment.Id,
            comment.Content,
            status =>
            {
                comment.ModerationStatus = status;
                comment.ModeratedAt = status == ModerationStatus.Pending ? null : DateTime.UtcNow;
            });

        // Only process mentions if there's actual content
        if (hasContent)
        {
            var mentionedUsernames = ExtractMentions(comment.Content);
            await ProcessMentionsAsync(post, comment, mentionedUsernames);
        }

        _logger.LogInformation("User {UserId} commented on post {PostId}", userId, postId);

        var commenterProfile = await _userProfileRpcClient.GetProfileAsync(userId);
        var commenterName = commenterProfile?.DisplayName ?? string.Empty;
        var contentForPreview = request.Content ?? string.Empty;
        var commentPreview = contentForPreview.Length <= 100
            ? contentForPreview
            : contentForPreview[..100];

        try
        {
            await _postCommentedPublisher.PublishAsync(new PostCommentedEvent(
                post.UserId,
                userId,
                commenterName,
                postId,
                commentPreview));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish PostCommented event for post {PostId}", postId);
        }


        return MapToDto(comment, userId);
    }

    private async Task ProcessMentionsAsync(Post post, Comment comment, List<string> usernames)
    {
        if (usernames.Count == 0)
            return;
        var mentionerProfile = await _userProfileRpcClient.GetProfileAsync(comment.UserId);
        var mentionerName = mentionerProfile?.Found == true ? mentionerProfile.DisplayName : "Someone";
        var contentForMention = comment.Content ?? string.Empty;
        var commentPreview = contentForMention.Length <= 100
            ? contentForMention
            : contentForMention[..100];


        foreach (var username in usernames)
        {
            var mentionedUserResult = await _userProfileRpcClient.GetProfileAsync(username);
            if (mentionedUserResult?.Found != true || mentionedUserResult.UserId == Guid.Empty)
            {
                continue;
            }

            if (mentionedUserResult.UserId == comment.UserId)
            {
                continue;
            }

            try
            {
                await _commentMentionedPublisher.PublishAsync(new CommentMentionedEvent(
                    mentionedUserResult.UserId,
                    comment.UserId,
                    mentionerName,
                    post.Id,
                    comment.Id,
                    commentPreview));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish CommentMentioned event for comment {CommentId}", comment.Id);
            }
        }
    }


    public async Task<List<CommentDto>> GetPostCommentsAsync(Guid postId, Guid? currentUserId, int skip = 0, int take = 50)
    {
        // Check if post exists
        var postExists = await _context.Posts.AnyAsync(p => p.Id == postId && !p.IsDeleted && (p.UserId == currentUserId || p.ModerationStatus == ModerationStatus.Approved));

        if (!postExists)
            throw new KeyNotFoundException("Post not found");

        // Get top-level comments only.
        // Bình luận chưa được duyệt chỉ hiện với chính tác giả — người khác không
        // thấy (giống cách bài viết bị ẩn khỏi feed cho tới khi được duyệt).
        var comments = await _context.Comments
            .Where(c => c.PostId == postId
                     && c.ParentCommentId == null
                     && !c.IsDeleted
                     && (c.ModerationStatus == ModerationStatus.Approved || c.UserId == currentUserId))
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

        // Get replies — chỉ trả về reply đã duyệt, trừ reply của chính tác giả.
        var replies = await _context.Comments
            .Where(c => c.ParentCommentId == commentId
                     && !c.IsDeleted
                     && (c.ModerationStatus == ModerationStatus.Approved || c.UserId == currentUserId))
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

        var newContent = request.Content ?? string.Empty;

        // Chỉ nội dung thực sự đổi mới cần kiểm duyệt lại — sửa metadata (vd.
        // ảnh đính kèm) không nên kéo bình luận về Pending.
        var contentChanged = !string.Equals(
            comment.Content?.Trim(),
            newContent.Trim(),
            StringComparison.Ordinal);

        comment.Content = newContent;
        comment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (contentChanged)
        {
            // Nội dung đổi → bình luận phải được duyệt lại từ đầu. Đây cũng là
            // cửa vào để tác giả "resubmit" một bình luận bị từ chối.
            await _moderationEnqueuer.ResubmitAsync(
                ModerationTargetType.Comment,
                comment.Id,
                comment.Content,
                status =>
                {
                    comment.ModerationStatus = status;
                    comment.ModeratedAt = status == ModerationStatus.Pending ? null : DateTime.UtcNow;
                });

            _logger.LogInformation("Updated comment {CommentId} and resubmitted it for moderation", commentId);
        }
        else
        {
            _logger.LogInformation("Updated comment {CommentId} without content change — moderation status kept", commentId);
        }

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
            ImageUrl = comment.ImageUrl,
            ParentCommentId = comment.ParentCommentId,
            LikesCount = comment.LikesCount,
            RepliesCount = comment.RepliesCount,
            IsDeleted = comment.IsDeleted,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt,
            IsLikedByCurrentUser = false,
            ModerationStatus = comment.ModerationStatus.ToString()
        };

        if (currentUserId.HasValue)
        {
            dto.IsLikedByCurrentUser = _context.CommentLikes
                .Any(l => l.CommentId == comment.Id && l.UserId == currentUserId.Value);
        }

        // Lý do kiểm duyệt chỉ có ý nghĩa với chính tác giả, và chỉ khi bình luận
        // chưa được duyệt. Bình luận Approved thì không cần query.
        if (comment.UserId == currentUserId && comment.ModerationStatus != ModerationStatus.Approved)
        {
            var moderation = _context.ModerationResults
                .FirstOrDefault(m => m.TargetId == comment.Id && m.TargetType == ModerationTargetType.Comment);

            // Ưu tiên lý do từ admin; nếu không có thì dùng lý do do AI sinh.
            dto.ModerationReason = moderation?.AdminNote ?? moderation?.AuthorReason;

            // Id bản ghi kiểm duyệt để tác giả có thể gửi khiếu nại.
            dto.ModerationResultId = moderation?.Id;
        }

        return dto;
    }
}