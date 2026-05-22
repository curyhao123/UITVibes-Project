using Microsoft.AspNetCore.Mvc;
using PostService.DTOs;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

[ApiController]
[Route("api/post/highlight")]
public class HighlightController : ControllerBase
{
    private readonly IHighlightService _highlightService;
    private readonly ILogger<HighlightController> _logger;

    public HighlightController(IHighlightService highlightService, ILogger<HighlightController> logger)
    {
        _highlightService = highlightService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new highlight group.
    /// </summary>
    [HttpPost("group")]
    public async Task<ActionResult<HighlightGroupDto>> CreateGroup([FromBody] CreateHighlightGroupRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            return Unauthorized(new { message = "User ID not found in request headers" });

        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Title is required" });

        if (request.Title.Trim().Length > 100)
            return BadRequest(new { message = "Title must be 100 characters or less" });

        try
        {
            var group = await _highlightService.CreateGroupAsync(userId, request);
            return CreatedAtAction(nameof(GetGroupDetail), new { groupId = group.Id }, group);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating highlight group for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while creating highlight group" });
        }
    }

    /// <summary>
    /// Add a story item to an existing highlight group.
    /// </summary>
    [HttpPost("{groupId}/item")]
    public async Task<ActionResult<HighlightGroupDto>> AddItem(Guid groupId, [FromBody] AddHighlightItemRequest request)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            var group = await _highlightService.AddItemToGroupAsync(userId, groupId, request);
            return Ok(group);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding item to highlight group {GroupId} by user {UserId}", groupId, userId);
            return StatusCode(500, new { message = "An error occurred while adding item to highlight" });
        }
    }

    /// <summary>
    /// Get all highlight groups for a user (for profile page).
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<HighlightGroupSummaryDto>>> GetUserHighlights(Guid userId)
    {
        try
        {
            var highlights = await _highlightService.GetUserHighlightsAsync(userId);
            return Ok(highlights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching highlights for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while fetching highlights" });
        }
    }

    /// <summary>
    /// Get full detail of a highlight group.
    /// </summary>
    [HttpGet("{groupId}")]
    public async Task<ActionResult<HighlightGroupDto>> GetGroupDetail(Guid groupId)
    {
        try
        {
            var group = await _highlightService.GetGroupDetailAsync(groupId);
            if (group == null)
                return NotFound(new { message = "Highlight not found" });
            return Ok(group);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching highlight group {GroupId}", groupId);
            return StatusCode(500, new { message = "An error occurred while fetching highlight" });
        }
    }

    /// <summary>
    /// Delete a highlight group.
    /// </summary>
    [HttpDelete("{groupId}")]
    public async Task<IActionResult> DeleteGroup(Guid groupId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            await _highlightService.DeleteGroupAsync(groupId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Highlight not found" });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting highlight group {GroupId} by user {UserId}", groupId, userId);
            return StatusCode(500, new { message = "An error occurred while deleting highlight" });
        }
    }

    /// <summary>
    /// Remove an item from a highlight group.
    /// </summary>
    [HttpDelete("{groupId}/item/{itemId}")]
    public async Task<IActionResult> RemoveItem(Guid groupId, Guid itemId)
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            await _highlightService.RemoveItemAsync(groupId, itemId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Highlight or item not found" });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing item {ItemId} from highlight group {GroupId}", itemId, groupId);
            return StatusCode(500, new { message = "An error occurred while removing highlight item" });
        }
    }
}
