using Microsoft.AspNetCore.Mvc;
using PostService.DTOs.Moderation;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

/// <summary>
/// API khiếu nại dành cho TÁC GIẢ nội dung bị từ chối.
///
/// Route base: api/post/moderation-appeal — tách khỏi /api/post/moderation
/// (dành cho admin) để phân quyền rõ ràng: mọi endpoint ở đây dùng định danh
/// người dùng thường (X-User-Id từ gateway), không yêu cầu role Admin.
///
/// Luồng:
///   POST /api/post/moderation-appeal/{moderationResultId}  → gửi khiếu nại
///   GET  /api/post/moderation-appeal/{moderationResultId}  → xem trạng thái
/// </summary>
[ApiController]
[Route("api/post/moderation-appeal")]
public class ModerationAppealController : ControllerBase
{
    private readonly IModerationAppealService _appealService;
    private readonly ILogger<ModerationAppealController> _logger;

    public ModerationAppealController(
        IModerationAppealService appealService,
        ILogger<ModerationAppealController> logger)
    {
        _appealService = appealService;
        _logger = logger;
    }

    /// <summary>
    /// Tác giả gửi khiếu nại cho nội dung bị từ chối.
    /// POST /api/post/moderation-appeal/{moderationResultId}
    /// </summary>
    [HttpPost("{moderationResultId:guid}")]
    public async Task<ActionResult<ModerationAppealResultDto>> SubmitAppeal(
        Guid moderationResultId,
        [FromBody] SubmitModerationAppealRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            var result = await _appealService.SubmitAppealAsync(
                moderationResultId, userId.Value, request.Reason);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting appeal for moderation result {ModerationId}", moderationResultId);
            return StatusCode(500, new { message = "An error occurred while submitting your appeal" });
        }
    }

    /// <summary>
    /// Tác giả xem trạng thái khiếu nại của mình.
    /// GET /api/post/moderation-appeal/{moderationResultId}
    /// </summary>
    [HttpGet("{moderationResultId:guid}")]
    public async Task<ActionResult<ModerationAppealResultDto>> GetAppeal(Guid moderationResultId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            var result = await _appealService.GetAppealAsync(moderationResultId, userId.Value);
            if (result == null)
                return NotFound(new { message = "Moderation result not found" });

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving appeal for moderation result {ModerationId}", moderationResultId);
            return StatusCode(500, new { message = "An error occurred while retrieving the appeal" });
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Guid? GetCurrentUserId()
    {
        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            return null;
        return userId;
    }
}
