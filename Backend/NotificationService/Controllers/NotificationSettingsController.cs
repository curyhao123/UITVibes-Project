using Microsoft.AspNetCore.Mvc;
using NotificationService.DTOs;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.Controllers
{
    [ApiController]
    [Route("api/notifications/settings")]
    public class NotificationSettingsController : ControllerBase
    {
        private readonly IUserNotificationSettingService _settingService;

        public NotificationSettingsController(IUserNotificationSettingService settingService)
            => _settingService = settingService;

        private Guid GetUserId()
        {
            var header = Request.Headers["X-User-Id"].FirstOrDefault();
            return !string.IsNullOrEmpty(header) && Guid.TryParse(header, out var id) ? id : Guid.Empty;
        }

        // GET /api/notifications/settings
        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken ct = default)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            var isEnabled = await _settingService.IsEnabledAsync(userId, ct);
            return Ok(new NotificationSettingDto(isEnabled));
        }

        // PUT /api/notifications/settings
        [HttpPut]
        public async Task<IActionResult> Update(
            [FromBody] UpdateNotificationSettingRequest request,
            CancellationToken ct = default)
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized();
            }

            await _settingService.UpdateAsync(userId, request.IsEnabled, ct);
            return NoContent();
        }
    }
}
