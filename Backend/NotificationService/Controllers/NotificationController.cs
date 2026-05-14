using Microsoft.AspNetCore.Mvc;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.Controllers
{
    [ApiController]
    [Route("api/notification")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
            => _notificationService = notificationService;

        private Guid GetUserId()
        {
            var header = Request.Headers["X-User-Id"].FirstOrDefault();
            return !string.IsNullOrEmpty(header) && Guid.TryParse(header, out var id) ? id : Guid.Empty;
        }

        // PUT /api/notifications/{id}/read
        [HttpPut("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead(Guid notificationId, CancellationToken ct)
        {
            var userId = GetUserId();
            await _notificationService.MarkAsReadAsync(notificationId, userId, ct);
            return NoContent();
        }

        // PUT /api/notifications/read-all
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead(CancellationToken ct)
        {
            var userId = GetUserId();
            await _notificationService.MarkAllAsReadAsync(userId, ct);
            return NoContent();
        }

        // GET /api/notifications?page=1&pageSize=20
        [HttpGet]
        public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
        {
            var userId = GetUserId();
            var result = await _notificationService.GetByUserAsync(userId, page, pageSize, ct);
            return Ok(result);
        }

        // GET /api/notifications/unread-count
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
        {
            var userId = GetUserId();
            var count = await _notificationService.GetUnreadCountAsync(userId, ct);
            return Ok(new { unreadCount = count });
        }
    }
}
