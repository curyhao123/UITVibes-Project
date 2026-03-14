using Microsoft.AspNetCore.Mvc;
using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;

namespace MessageService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConversationController : ControllerBase
{
    private readonly IConversationService _conversationService;
    private readonly ILogger<ConversationController> _logger;

    public ConversationController(IConversationService conversationService, ILogger<ConversationController> logger)
    {
        _conversationService = conversationService;
        _logger = logger;
    }

    [HttpPost("private")]
    public async Task<ActionResult<ConversationDto>> CreatePrivateConversation([FromBody] CreatePrivateConversationRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            var conversation = await _conversationService.CreatePrivateConversationAsync(userId, request);
            return Ok(conversation);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating private conversation");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPost("group")]
    public async Task<ActionResult<ConversationDto>> CreateGroupConversation([FromBody] CreateGroupConversationRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            var conversation = await _conversationService.CreateGroupConversationAsync(userId, request);
            return Ok(conversation);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating group conversation");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<ConversationDto>>> GetConversations(
        [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        if (take > 50) take = 50;
        var conversations = await _conversationService.GetUserConversationsAsync(userId, skip, take);
        return Ok(conversations);
    }

    [HttpGet("{conversationId}")]
    public async Task<ActionResult<ConversationDto>> GetConversation(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            var conversation = await _conversationService.GetConversationByIdAsync(conversationId, userId);
            return Ok(conversation);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [HttpPost("{conversationId}/members/{targetUserId}")]
    public async Task<IActionResult> AddMember(Guid conversationId, Guid targetUserId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            await _conversationService.AddMemberToGroupAsync(conversationId, userId, targetUserId);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{conversationId}/members/{targetUserId}")]
    public async Task<IActionResult> RemoveMember(Guid conversationId, Guid targetUserId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            await _conversationService.RemoveMemberFromGroupAsync(conversationId, userId, targetUserId);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("{conversationId}/leave")]
    public async Task<IActionResult> LeaveGroup(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            await _conversationService.LeaveGroupAsync(conversationId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    private Guid GetUserId()
    {
        var header = Request.Headers["X-User-Id"].FirstOrDefault();
        return !string.IsNullOrEmpty(header) && Guid.TryParse(header, out var id) ? id : Guid.Empty;
    }
}