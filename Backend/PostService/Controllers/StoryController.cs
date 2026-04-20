using Microsoft.AspNetCore.Mvc;
using PostService.DTOs;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

[ApiController]
[Route("api/post/story")]
public class StoryController : ControllerBase
{
    private readonly IStoryService _storyService;
    private readonly ILogger<StoryController> _logger;

    public StoryController(IStoryService storyService, ILogger<StoryController> logger)
    {
        _storyService = storyService;
        _logger = logger;
    }

    /// <summary>
    /// Lấy story đang hoạt động cho feed
    /// </summary>
    [HttpGet("active")]
    public async Task<ActionResult<List<StoryFeedDto>>> GetActiveStories([FromQuery] int limit = 20)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            // Anonymous: vẫn trả story nhưng không track viewed
            userId = Guid.Empty;
        }

        try
        {
            var stories = await _storyService.GetActiveStoriesAsync(userId, limit);
            return Ok(stories);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching active stories for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while fetching stories" });
        }
    }

    /// <summary>
    /// Tạo story mới
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<StoryDto>> CreateStory([FromForm] CreateStoryWithMediaRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        if (request.Files == null || !request.Files.Any())
        {
            return BadRequest(new { message = "At least one media item is required" });
        }

        var allowedImageTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
        var allowedVideoTypes = new[] { "video/mp4", "video/mpeg", "video/quicktime" };
        var allAllowed = allowedImageTypes.Concat(allowedVideoTypes).ToArray();
        if (request.Files.Any(file => !allAllowed.Contains(file.ContentType.ToLower())))
        {
            return BadRequest(new { message = "Invalid file type. Only images and videos are allowed." });
        }

        try
        {
            var story = await _storyService.CreateStoryWithMediaAsync(userId, request);
            return CreatedAtAction(nameof(GetActiveStories), story);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating story for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while creating story" });
        }
    }

    /// <summary>
    /// Xóa story
    /// </summary>
    [HttpDelete("{storyGroupId}")]
    public async Task<IActionResult> DeleteStory(Guid storyGroupId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            await _storyService.DeleteStoryAsync(storyGroupId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Story not found" });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting story {StoryId} for user {UserId}", storyGroupId, userId);
            return StatusCode(500, new { message = "An error occurred while deleting story" });
        }
    }

    /// <summary>
    /// Đánh dấu đã xem story item
    /// </summary>
    [HttpPost("{storyItemId}/view")]
    public async Task<IActionResult> MarkStoryViewed(Guid storyItemId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            await _storyService.MarkStoryViewedAsync(storyItemId, userId);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking story {ItemId} viewed by user {UserId}", storyItemId, userId);
            return StatusCode(500, new { message = "An error occurred while marking story as viewed" });
        }
    }

    /// <summary>
    /// Upload media cho story (ảnh/video) lên Cloudinary
    /// </summary>
    [HttpPost("media")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<StoryMediaUploadResponse>> UploadStoryMedia([FromForm] StoryMediaUploadRequest request)
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

        var allowedImageTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
        var allowedVideoTypes = new[] { "video/mp4", "video/mpeg", "video/quicktime" };
        var allAllowed = allowedImageTypes.Concat(allowedVideoTypes).ToArray();
        if (!allAllowed.Contains(request.File.ContentType.ToLower()))
        {
            return BadRequest(new { message = "Invalid file type. Only images and videos are allowed." });
        }

        try
        {
            var result = await _storyService.UploadStoryMediaAsync(request.File);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading story media for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while uploading media" });
        }
    }
}
