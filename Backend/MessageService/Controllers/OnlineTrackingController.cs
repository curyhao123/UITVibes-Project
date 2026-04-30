using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;
using Microsoft.AspNetCore.Mvc;

namespace MessageService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OnlineTrackingController : ControllerBase
{
    private readonly IOnlineTrackingService _onlineTrackingService;
    private readonly ILogger<OnlineTrackingController> _logger;

    public OnlineTrackingController(
        IOnlineTrackingService onlineTrackingService,
        ILogger<OnlineTrackingController> logger)
    {
        _onlineTrackingService = onlineTrackingService;
        _logger = logger;
    }

    [HttpPost("online-users")]
    public async Task<ActionResult<List<Guid>>> GetOnlineUsers([FromBody] GetOnlineUsersRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized(new { message = "User ID not found" });

        if (request == null || request.UserIds.Count == 0)
        {
            return BadRequest(new { message = "UserIds is required and cannot be empty" });
        }

        try
        {
            var onlineUsers = await _onlineTrackingService.GetOnlineUsersAsync(request.UserIds);
            return Ok(onlineUsers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting online users");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    private Guid GetUserId()
    {
        var header = Request.Headers["X-User-Id"].FirstOrDefault();
        return !string.IsNullOrEmpty(header) && Guid.TryParse(header, out var id) ? id : Guid.Empty;
    }
}
