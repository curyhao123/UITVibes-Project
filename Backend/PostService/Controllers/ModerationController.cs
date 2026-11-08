using Microsoft.AspNetCore.Mvc;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

/// <summary>
/// Admin API for the AI moderation queue.
///
/// Every endpoint requires an Admin identity. The identity is verified from the
/// JWT in the "Authorization" header (forwarded by the gateway) — see
/// <see cref="IAdminIdentityResolver"/> for the rationale. When no JWT key is
/// configured (PostService running standalone outside Aspire) the gateway headers
/// are used as a fallback.
///
/// Route base: api/post/moderation — the gateway routes /post/{**catch-all} →
/// /api/post/{**catch-all}, so the frontend calls /post/moderation/... via the gateway.
///
/// Ngoại lệ: endpoint <c>appeal</c> dành cho TÁC GIẢ (không phải admin) nên
/// dùng đường dẫn riêng <c>/api/post/moderation-appeal</c> để không lẫn với
/// các endpoint admin.
/// </summary>
[ApiController]
[Route("api/post/moderation")]
public class ModerationController : ControllerBase
{
    private readonly IModerationAdminService _moderationAdminService;
    private readonly IModerationStrikeService _moderationStrikeService;
    private readonly IAdminIdentityResolver _adminIdentityResolver;
    private readonly ILogger<ModerationController> _logger;

    public ModerationController(
        IModerationAdminService moderationAdminService,
        IModerationStrikeService moderationStrikeService,
        IAdminIdentityResolver adminIdentityResolver,
        ILogger<ModerationController> logger)
    {
        _moderationAdminService = moderationAdminService;
        _moderationStrikeService = moderationStrikeService;
        _adminIdentityResolver = adminIdentityResolver;
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
    /// List moderation records with pagination + total count + advanced filters.
    /// GET /api/moderation/paged?status=NeedsReview&amp;orderBySeverity=true&amp;minSeverity=2
    ///
    /// Đây là endpoint mà hàng đợi admin nên dùng: có <c>total</c> để phân trang
    /// và hỗ trợ lọc theo severity / confidence / thời gian / tác giả / khiếu nại.
    /// </summary>
    [HttpGet("paged")]
    public async Task<ActionResult<ModerationPagedResultDto>> GetModerationResultsPaged(
        [FromQuery] ModerationStatus? status = null,
        [FromQuery] ModerationTargetType? targetType = null,
        [FromQuery] string? category = null,
        [FromQuery] bool orderByUpdatedAt = false,
        [FromQuery] bool orderBySeverity = false,
        [FromQuery] bool orderByPriority = false,
        [FromQuery] string? search = null,
        [FromQuery] int? minReportCount = null,
        [FromQuery] bool onlyWithAppeal = false,
        [FromQuery] int? minSeverity = null,
        [FromQuery] double? minConfidence = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null,
        [FromQuery] Guid? authorId = null,
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
                OrderBySeverity = orderBySeverity,
                OrderByPriority = orderByPriority,
                Search = search,
                MinReportCount = minReportCount,
                OnlyWithAppeal = onlyWithAppeal,
                MinSeverity = minSeverity,
                MinConfidence = minConfidence,
                FromUtc = fromUtc,
                ToUtc = toUtc,
                AuthorId = authorId,
                Skip = skip,
                Take = take
            };

            var result = await _moderationAdminService.GetModerationResultsPagedAsync(filter);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving paged moderation results");
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
    /// AI ↔ admin agreement analytics (Phase 3.2).
    /// GET /api/moderation/agreement?targetType=Post&amp;fromUtc=...&amp;toUtc=...
    ///
    /// Trả về tỉ lệ đồng thuận, false positive/negative theo category, theo prompt
    /// version, theo model, kèm ngưỡng được đề xuất từ dữ liệu thật.
    /// </summary>
    [HttpGet("agreement")]
    public async Task<ActionResult<ModerationAgreementDto>> GetModerationAgreement(
        [FromQuery] ModerationTargetType? targetType = null,
        [FromQuery] DateTime? fromUtc = null,
        [FromQuery] DateTime? toUtc = null)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        try
        {
            var agreement = await _moderationAdminService.GetAgreementStatsAsync(
                targetType, fromUtc, toUtc);
            return Ok(agreement);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving moderation agreement stats");
            return StatusCode(500, new { message = "An error occurred while retrieving moderation agreement stats" });
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

    /// <summary>
    /// Admin resolves multiple records at once.
    /// POST /api/moderation/bulk
    /// </summary>
    [HttpPost("bulk")]
    public async Task<ActionResult<BulkModerationResultDto>> BulkResolve(
        [FromBody] BulkModerationRequest request)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        var adminId = GetAdminId();
        if (adminId == null)
            return Unauthorized(new { message = "User ID not found in request headers" });

        try
        {
            var result = await _moderationAdminService.BulkResolveAsync(request, adminId.Value);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error running bulk moderation action");
            return StatusCode(500, new { message = "An error occurred while running bulk moderation action" });
        }
    }

    /// <summary>
    /// Strike status of a single account (Phase 3.5).
    /// GET /api/moderation/strikes/{userId}
    /// </summary>
    [HttpGet("strikes/{userId:guid}")]
    public async Task<ActionResult<ModerationStrikeResultDto>> GetStrikeStatus(Guid userId)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        try
        {
            var status = await _moderationStrikeService.GetStrikeStatusAsync(userId);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving strike status for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while retrieving strike status" });
        }
    }

    /// <summary>
    /// Top accounts by active strike weight (Phase 3.5).
    /// GET /api/moderation/strikes/top?take=20
    /// </summary>
    [HttpGet("strikes/top")]
    public async Task<ActionResult<List<ModerationStrikeEntryDto>>> GetTopViolators(
        [FromQuery] int take = 20)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        try
        {
            var entries = await _moderationStrikeService.GetTopViolatorsAsync(take);
            return Ok(entries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving top violators");
            return StatusCode(500, new { message = "An error occurred while retrieving top violators" });
        }
    }

    /// <summary>
    /// Revoke strikes for an account (Phase 3.5).
    /// POST /api/moderation/strikes/{userId}/revoke
    /// </summary>
    [HttpPost("strikes/{userId:guid}/revoke")]
    public async Task<ActionResult<ModerationStrikeResultDto>> RevokeStrikes(
        Guid userId,
        [FromBody] RevokeStrikeRequest? request = null)
    {
        if (!IsAdmin())
            return StatusCode(403, new { message = "Admin role required to access this endpoint" });

        try
        {
            var count = await _moderationStrikeService.RevokeStrikesAsync(
                userId, request?.ModerationResultId, request?.Reason);

            var status = await _moderationStrikeService.GetStrikeStatusAsync(userId);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking strikes for user {UserId}", userId);
            return StatusCode(500, new { message = "An error occurred while revoking strikes" });
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private bool IsAdmin()
    {
        return _adminIdentityResolver.GetAdminId(HttpContext).HasValue;
    }

    private Guid? GetAdminId()
    {
        return _adminIdentityResolver.GetAdminId(HttpContext);
    }
}
