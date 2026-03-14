using Microsoft.AspNetCore.Mvc;
using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;

namespace MessageService.Controllers;

[ApiController]
[Route("api/conversation/{conversationId}/[controller]")]
public class MessageController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly ILogger<MessageController> _logger;

    public MessageController(IMessageService messageService, ILogger<MessageController> logger)
    {
        _messageService = messageService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<MessageDto>> SendMessage(Guid conversationId, [FromBody] SendMessageRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            var message = await _messageService.SendMessageAsync(conversationId, userId, request);
            return Ok(message);
        }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<MessageDto>>> GetMessages(
        Guid conversationId,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 50)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        if (take > 100) take = 100;

        try
        {
            var messages = await _messageService.GetMessagesAsync(conversationId, userId, skip, take);
            return Ok(messages);
        }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [HttpPut("{messageId}")]
    public async Task<ActionResult<MessageDto>> EditMessage(Guid conversationId, Guid messageId, [FromBody] EditMessageRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            var message = await _messageService.EditMessageAsync(messageId, userId, request);
            return Ok(message);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(Guid conversationId, Guid messageId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            await _messageService.DeleteMessageAsync(messageId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    [HttpPost("{messageId}/read")]
    public async Task<IActionResult> MarkAsRead(Guid conversationId, Guid messageId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        try
        {
            await _messageService.MarkAsReadAsync(conversationId, userId, messageId);
            return NoContent();
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (UnauthorizedAccessException ex) { return Forbid(ex.Message); }
    }

    private Guid GetUserId()
    {
        var header = Request.Headers["X-User-Id"].FirstOrDefault();
        return !string.IsNullOrEmpty(header) && Guid.TryParse(header, out var id) ? id : Guid.Empty;
    }
}