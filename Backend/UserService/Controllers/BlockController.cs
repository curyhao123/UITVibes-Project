using Microsoft.AspNetCore.Mvc;
using UserService.DTOs;
using UserService.ServiceLayer.Interface;

namespace UserService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BlockController : ControllerBase
{
    private readonly IBlockService _blockService;
    private readonly ILogger<BlockController> _logger;

    public BlockController(IBlockService blockService, ILogger<BlockController> logger)
    {
        _blockService = blockService;
        _logger = logger;
    }
    
    [HttpPost("{blockedId}")]
    public async Task<ActionResult<BlockDto>> BlockUser(Guid blockedId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var block = await _blockService.BlockUserAsync(currentUserId, blockedId);
            return Ok(block);
        }
        catch (ArgumentException ex) // ✅ Added: catches self-block
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error blocking user {BlockedId} for user {UserId}", blockedId, currentUserId);
            return StatusCode(500, new { message = "An error occurred while blocking user" });
        }
    }

    [HttpDelete("{blockedId}")]
    public async Task<IActionResult> UnblockUser(Guid blockedId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            await _blockService.UnblockUserAsync(currentUserId, blockedId);
            return NoContent();
        }
        catch (ArgumentException ex) // ✅ Added: catches self-unblock
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unblocking user {BlockedId} for user {UserId}", blockedId, currentUserId);
            return StatusCode(500, new { message = "An error occurred while unblocking user" });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<BlockListDto>>> GetBlockedUsers(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        if (take > 100) take = 100; // ✅ Added: cap pagination

        try
        {
            var blockedUsers = await _blockService.GetBlockedUsersAsync(currentUserId, skip, take);
            return Ok(blockedUsers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving blocked users for user {UserId}", currentUserId);
            return StatusCode(500, new { message = "An error occurred while retrieving blocked users" });
        }
    }

    [HttpGet("{blockedId}/is-blocked")]
    public async Task<ActionResult<bool>> IsBlocked(Guid blockedId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
        {
            return Unauthorized(new { message = "User ID not found in request headers" });
        }

        try
        {
            var isBlocked = await _blockService.IsBlockedAsync(currentUserId, blockedId);
            return Ok(new { isBlocked });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking block status for user {BlockedId} and user {UserId}", blockedId, currentUserId);
            return StatusCode(500, new { message = "An error occurred while checking block status" });
        }
    }
}

