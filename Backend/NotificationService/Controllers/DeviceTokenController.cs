using Microsoft.AspNetCore.Mvc;
using NotificationService.DTOs;
using NotificationService.ServiceLayer.Interface;
using System.Security.Claims;

namespace NotificationService.Controllers
{
    [ApiController]
    [Route("api/device")]
    public class DeviceTokensController : ControllerBase
    {
        private readonly IDeviceTokenService _deviceTokenService;
        public DeviceTokensController(IDeviceTokenService deviceTokenService)
        {
            _deviceTokenService = deviceTokenService;
        }

        private Guid GetUserId()
        {
            var header = Request.Headers["X-User-Id"].FirstOrDefault();
            return !string.IsNullOrEmpty(header) && Guid.TryParse(header, out var id) ? id : Guid.Empty;
        }

        // POST /api/devices/register
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] RegisterDeviceTokenRequest request,
            CancellationToken ct = default)
        {
            var userId = GetUserId();
            await _deviceTokenService.RegisterAsync(userId, request.Token, request.Platform, ct);
            return Ok();
        }
    }
}
