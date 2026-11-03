using Microsoft.AspNetCore.Mvc;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

/// <summary>
/// Admin API for the AI moderation queue.
///
/// Every endpoint requires the "X-User-Role: Admin" header — the gateway forwards
/// this header from the "role" claim in the JWT. If the gateway doesn't validate the
/// JWT, the request is rejected with 401 before it ever reaches here.
///
/// Route base: api/post/moderation — the gateway routes /post/{**catch-all} →
/// /api/post/{**catch-all}, so the frontend calls /post/moderation/... via the gateway.
/// </summary>
[ApiController]
[Route("api/post/moderation")]
public class ModerationController : ControllerBase
{
    private readonly IModerationAdminService _moderationAdminService;
    private readonly ILogger<ModerationController> _logger;

    public ModerationController(
        IModerationAdminService moderationAdminService,
        ILogger<ModerationController> logger)
    {
        _moderationAdminService = moderationAdminService;
        _logger = logger;
    }

    /// <summary>
    /// List moderation records.
    /// GET /api/moderation?status=NeedsReview&amp;targetType=Post&amp;category=spam&amp;skip=0&amp;take=20
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ModerationResultDto>>> GetModerationResults(
        [FromQuery] ModerationStatus? status = null,
        [FromQuery] ModerationTargetType? targetType = null,
        [FromQuery] string? category = null,
        [FromQuery] bool orderByUpdatedAt = false,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        try
        {
            var filter = new ModerationQueryFilter
            {
                Status = status,
                TargetType = targetType,
                Category = category,
                OrderByUpdatedAt = orderByUpdatedAt,
                Skip = skip,
                Take = take
            };

            var results = await _moderationAdminService.GetModerationResultsAsync(filter);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving moderation results");
            return StatusCode(500, new { message = "An error occurred while retrieving moderation results" });
        }
    }

    /// <summary>
    /// Get a single moderation record.
    /// GET /api/moderation/{id}
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ModerationResultDto>> GetModerationResult(Guid id)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        try
        {
            var result = await _moderationAdminService.GetModerationResultByIdAsync(id);
            if (result == null)
                return NotFound(new { message = "Moderation result not found" });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving moderation result {ModerationId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving moderation result" });
        }
    }

    /// <summary>
    /// Aggregate stats for the admin dashboard.
    /// GET /api/moderation/stats
    /// </summary>
    [HttpGet("stats")]
    public async Task<ActionResult<ModerationStatsDto>> GetModerationStats(
        [FromQuery] ModerationTargetType? targetType = null)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        try
        {
            var stats = await _moderationAdminService.GetModerationStatsAsync(targetType);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving moderation stats");
            return StatusCode(500, new { message = "An error occurred while retrieving moderation stats" });
        }
    }

    /// <summary>
    /// Admin approves the content.
    /// POST /api/moderation/{id}/approve
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult<ModerationResultDto>> Approve(
        Guid id,
        [FromBody] ResolveModerationRequest? request = null)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        var adminId = GetAdminId();
        if (adminId == null)
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            var result = await _moderationAdminService.ApproveAsync(id, adminId.Value, request?.AdminNote);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Moderation result not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving moderation result {ModerationId}", id);
            return StatusCode(500, new { message = "An error occurred while approving moderation result" });
        }
    }

    /// <summary>
    /// Admin rejects the content.
    /// POST /api/moderation/{id}/reject
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<ActionResult<ModerationResultDto>> Reject(
        Guid id,
        [FromBody] ResolveModerationRequest? request = null)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        var adminId = GetAdminId();
        if (adminId == null)
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            var result = await _moderationAdminService.RejectAsync(id, adminId.Value, request?.AdminNote);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Moderation result not found" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting moderation result {ModerationId}", id);
            return StatusCode(500, new { message = "An error occurred while rejecting moderation result" });
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool IsAdmin()
    {
        var role = Request.Headers["X-User-Role"].FirstOrDefault();
        return !string.IsNullOrEmpty(role) && role == "Admin";
    }

    private Guid? GetAdminId()
    {
        var userId = Request.Headers["X-User-Id"].FirstOrDefault();
        return Guid.TryParse(userId, out var parsed) ? parsed : null;
    }
}