using Microsoft.AspNetCore.Mvc;
using PostService.DTOs;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

[ApiController]
[Route("api/post")]
public class CommentController : ControllerBase
{
    private readonly ICommentService _commentService;
    private readonly ILogger<CommentController> _logger;

    public CommentController(ICommentService commentService, ILogger<CommentController> logger)
    {
        _commentService = commentService;
        _logger = logger;
    }

    /// <summary>
    /// Add a comment to a post
    /// </summary>
    [HttpPost("{postId}/comment")]
    public async Task<ActionResult<CommentDto>> CreateComment(Guid postId, [FromBody] CreateCommentRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var comment = await _commentService.CreateCommentAsync(postId, userId, request);
            return Ok(comment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating comment on post {PostId} by user {UserId}", postId, userId);
            return StatusCode(500, new { message = "An error occurred while creating comment" });
        }
    }

    /// <summary>
    /// Get all comments for a post (top-level only)
    /// </summary>
    [HttpGet("{postId}/comments")]
    public async Task<ActionResult<List<CommentDto>>> GetPostComments(
        Guid postId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        if (take > 100) take = 100;

        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(userIdHeader) && Guid.TryParse(userIdHeader, out var userId))
        {
            currentUserId = userId;
        }

        try
        {
            var comments = await _commentService.GetPostCommentsAsync(postId, currentUserId, skip, take);
            return Ok(comments);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get replies to a comment
    /// </summary>
    [HttpGet("comment/{commentId}/replies")]
    public async Task<ActionResult<List<CommentDto>>> GetCommentReplies(
        Guid commentId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        if (take > 100) take = 100;

        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(userIdHeader) && Guid.TryParse(userIdHeader, out var userId))
        {
            currentUserId = userId;
        }

        try
        {
            var replies = await _commentService.GetCommentRepliesAsync(commentId, currentUserId, skip, take);
            return Ok(replies);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update a comment (owner only)
    /// </summary>
    [HttpPut("comment/{commentId}")]
    public async Task<ActionResult<CommentDto>> UpdateComment(Guid commentId, [FromBody] UpdateCommentRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var comment = await _commentService.UpdateCommentAsync(commentId, userId, request);
            return Ok(comment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    /// <summary>
    /// Delete a comment (soft delete, owner only)
    /// </summary>
    [HttpDelete("comment/{commentId}")]
    public async Task<IActionResult> DeleteComment(Guid commentId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            await _commentService.DeleteCommentAsync(commentId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    /// <summary>
    /// Like a comment
    /// </summary>
    [HttpPost("comment/{commentId}/like")]
    public async Task<ActionResult<CommentLikeResponse>> LikeComment(Guid commentId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var response = await _commentService.LikeCommentAsync(commentId, userId);
            return Ok(response);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Unlike a comment
    /// </summary>
    [HttpDelete("comment/{commentId}/like")]
    public async Task<IActionResult> UnlikeComment(Guid commentId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            await _commentService.UnlikeCommentAsync(commentId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}