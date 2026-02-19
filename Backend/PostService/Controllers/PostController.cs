using Microsoft.AspNetCore.Mvc;
using PostService.DTOs;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PostController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly ILogger<PostController> _logger;

    public PostController(IPostService postService, ILogger<PostController> logger)
    {
        _postService = postService;
        _logger = logger;
    }

    /// Create a new post
    [HttpPost]
    public async Task<ActionResult<PostDto>> CreatePost([FromBody] CreatePostRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var post = await _postService.CreatePostAsync(userId, request);
            return CreatedAtAction(nameof(GetPost), new { id = post.Id }, post);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating post for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while creating post" });
        }
    }

    /// Get post by ID
    [HttpGet("{id}")]
    public async Task<ActionResult<PostDto>> GetPost(Guid id)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(userIdHeader) && Guid.TryParse(userIdHeader, out var userId))
        {
            currentUserId = userId;
        }

        try
        {
            var post = await _postService.GetPostByIdAsync(id, currentUserId);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Post not found" });
        }
    }


    /// Get posts by user
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<PostDto>>> GetUserPosts(
        Guid userId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        if (take > 50) take = 50;

        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(userIdHeader) && Guid.TryParse(userIdHeader, out var parsedUserId))
        {
            currentUserId = parsedUserId;
        }

        var posts = await _postService.GetUserPostsAsync(userId, currentUserId, skip, take);
        return Ok(posts);
    }

  
    /// Get feed for current user
    [HttpGet("feed")]
    public async Task<ActionResult<List<PostDto>>> GetFeed(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        if (take > 50) take = 50;

        var posts = await _postService.GetFeedAsync(userId, skip, take);
        return Ok(posts);
    }

    /// Update post
    [HttpPut("{id}")]
    public async Task<ActionResult<PostDto>> UpdatePost(Guid id, [FromBody] UpdatePostRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var post = await _postService.UpdatePostAsync(id, userId, request);
            return Ok(post);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Post not found" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

 
    /// Delete post
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            await _postService.DeletePostAsync(id, userId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Post not found" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    /// Upload media for post
    [HttpPost("media")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB for images
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<MediaUploadResponse>> UploadMedia([FromForm] UploadMediaRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(new { message = "No file provided" });
        }

        try
        {
            var result = await _postService.UploadMediaAsync(request.File);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading media for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while uploading media" });
        }
    }
}