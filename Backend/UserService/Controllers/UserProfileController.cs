using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UserService.DTOs;
using UserService.ServiceLayer.Interface;

namespace UserService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserProfileController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly ILogger<UserProfileController> _logger;

    public UserProfileController(
        IUserProfileService userProfileService,
        ICloudinaryService cloudinaryService,
        ILogger<UserProfileController> logger)
    {
        _userProfileService = userProfileService;
        _cloudinaryService = cloudinaryService;
        _logger = logger;
    }

    [HttpGet("{userId}")]
    public async Task<ActionResult<UserProfileDto>> GetProfile(Guid userId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }
        var profile = await _userProfileService.GetProfileByUserIdAsync(currentUserId, userId);

        if (profile == null)
        {
            return NotFound(new { message = "Profile not found" });
        }

        return Ok(profile);
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetMyProfile()
    {
        // ✅ Read userId from Gateway's X-User-Id header
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        var profile = await _userProfileService.GetProfileByUserIdAsync(userId, userId);

        if (profile == null)
        {
            return NotFound(new { message = "Profile not found" });
        }

        return Ok(profile);
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserProfileDto>> UpdateMyProfile([FromBody] UpdateProfileRequest request)
    {
        // ✅ Read userId from Gateway's X-User-Id header
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var updatedProfile = await _userProfileService.UpdateProfileAsync(userId, request);
            return Ok(updatedProfile);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Profile not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating profile for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while updating profile" });
        }
    }

    [HttpPost("me/avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5MB limit
    public async Task<ActionResult<UserProfileDto>> UploadAvatar([FromForm] UploadImageRequest request)
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
            // Upload to Cloudinary
            var avatarUrl = await _cloudinaryService.UploadImageAsync(request.File, "uitvibes/avatars");

            // Update profile with new avatar URL
            var updatedProfile = await _userProfileService.UpdateAvatarAsync(userId, avatarUrl);

            return Ok(updatedProfile);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading avatar for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while uploading avatar" });
        }
    }

    [HttpPost("{userId}/avatar")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5MB limit
    public async Task<ActionResult<UserProfileDto>> UploadAvatarForUser(Guid userId, [FromForm] UploadImageRequest request)
    {
        if (request.File == null || request.File.Length == 0)
        {
            return BadRequest(new { message = "No file provided" });
        }
        try
        {
            // Upload to Cloudinary
            var avatarUrl = await _cloudinaryService.UploadImageAsync(request.File, "uitvibes/avatars");

            // Update profile with new avatar URL
            var updatedProfile = await _userProfileService.UpdateAvatarAsync(userId, avatarUrl);

            return Ok(updatedProfile);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading avatar for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while uploading avatar" });
        }
    }


    [HttpPost("me/cover")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5MB limit
    public async Task<ActionResult<UserProfileDto>> UploadCoverImage([FromForm] UploadImageRequest request)
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
            // Upload to Cloudinary with different transformation for cover
            var coverUrl = await _cloudinaryService.UploadImageAsync(request.File, "uitvibes/covers");

            // Update profile with new cover image URL
            var updatedProfile = await _userProfileService.UpdateCoverImageAsync(userId, coverUrl);

            return Ok(updatedProfile);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading cover image for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while uploading cover image" });
        }
    }

    [HttpPut("me/bio")]
    public async Task<ActionResult<UserProfileDto>> UpdateMyBio([FromBody] UpdateBioRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var updatedProfile = await _userProfileService.UpdateBioAsync(userId, request.Bio);
            return Ok(updatedProfile);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Profile not found" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating bio for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while updating bio" });
        }
    }
}