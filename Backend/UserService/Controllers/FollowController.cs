using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UserService.DTOs;
using UserService.ServiceLayer.Interface;

namespace UserService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FollowController : ControllerBase
{
    private readonly IFollowService _followService;
    private readonly ILogger<FollowController> _logger;

    public FollowController(IFollowService followService, ILogger<FollowController> logger)
    {
        _followService = followService;
        _logger = logger;
    }

    //[Authorize]
    [HttpPost("{userId}")]
    public async Task<ActionResult<FollowDto>> FollowUser(Guid userId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var follow = await _followService.FollowUserAsync(currentUserId, userId);
            return Ok(follow);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error following user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while following user" });
        }
    }

  
    //[Authorize]
    [HttpDelete("{userId}")]
    public async Task<IActionResult> UnfollowUser(Guid userId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            await _followService.UnfollowUserAsync(currentUserId, userId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unfollowing user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while unfollowing user" });
        }
    }

    
    //[Authorize]
    [HttpGet("{userId}/is-following")]
    public async Task<ActionResult<bool>> IsFollowing(Guid userId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        var isFollowing = await _followService.IsFollowingAsync(currentUserId, userId);
        return Ok(new { isFollowing });
    }

 
    [HttpGet("{userId}/stats")]
    public async Task<ActionResult<UserFollowStatsDto>> GetFollowStats(Guid userId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var stats = await _followService.GetFollowStatsAsync(userId, currentUserId);
            return Ok(stats);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("{userId}/followers")]
    public async Task<ActionResult<List<FollowerListDto>>> GetFollowers(
        Guid userId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        if (take > 100) take = 100; // Limit max results
        
        var followers = await _followService.GetFollowersAsync(userId, skip, take);
        return Ok(followers);
    }


    [HttpGet("{userId}/following")]
    public async Task<ActionResult<List<FollowerListDto>>> GetFollowing(
        Guid userId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        if (take > 100) take = 100; // Limit max results
        
        var following = await _followService.GetFollowingAsync(userId, skip, take);
        return Ok(following);
    }
}