using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Implements the admin review queue.
///
/// Rules:
///  - Only content in the NeedsReview state can be re-decided by an admin.
///  - An admin decision overrides the LLM decision and always leaves an audit trail
///    (ReviewedBy / ReviewedAt / AdminNote).
///  - Content is never auto-approved — approving is always a human decision.
///  - Supports Post, Comment and Reel targets; the actual entity is resolved
///    through <see cref="IModerationTargetAccessor"/>.
/// </summary>
public class ModerationAdminService : IModerationAdminService
{
    private readonly PostDbContext _context;
    private readonly IUserProfileRpcClient _userProfileRpcClient;
    private readonly IModerationTargetAccessor _targetAccessor;
    private readonly IContentModerationNotifier _notifier;
    private readonly IModerationDecisionLogger _decisionLogger;
    private readonly IModerationStrikeService _strikeService;
    private readonly IModerationMetrics _metrics;
    private readonly ILogger<ModerationAdminService> _logger;

    public ModerationAdminService(
        PostDbContext context,
        IUserProfileRpcClient userProfileRpcClient,
        IModerationTargetAccessor targetAccessor,
        IContentModerationNotifier notifier,
        IModerationDecisionLogger decisionLogger,
        IModerationStrikeService strikeService,
        IModerationMetrics metrics,
        ILogger<ModerationAdminService> logger)
    {
        _context = context;
        _userProfileRpcClient = userProfileRpcClient;
        _targetAccessor = targetAccessor;
        _notifier = notifier;
        _decisionLogger = decisionLogger;
        _strikeService = strikeService;
        _metrics = metrics;
        _logger = logger;
    }

    public async Task<List<ModerationResultDto>> GetModerationResultsAsync(ModerationQueryFilter filter)
    {
        var (results, _) = await QueryResultsAsync(filter, includeTotal: false);
        return await MapToDtosAsync(results);
    }

    public async Task<ModerationPagedResultDto> GetModerationResultsPagedAsync(ModerationQueryFilter filter)
    {
        var (results, total) = await QueryResultsAsync(filter, includeTotal: true);

        return new ModerationPagedResultDto
        {
            Items = await MapToDtosAsync(results),
            Total = total,
            Skip = Math.Max(0, filter.Skip),
            Take = Math.Clamp(filter.Take, 1, 100)
        };
    }

    public async Task<ModerationResultDto?> GetModerationResultByIdAsync(Guid moderationResultId)
    {
        var result = await _context.ModerationResults
            .FirstOrDefaultAsync(m => m.Id == moderationResultId);

        if (result == null)
            return null;

        var dto = (await MapToDtosAsync(new List<ModerationResult> { result })).FirstOrDefault();
        return dto;
    }

    public async Task<ModerationStatsDto> GetModerationStatsAsync(ModerationTargetType? targetType = null)
    {
        var query = _context.ModerationResults.AsQueryable();

        if (targetType.HasValue)
            query = query.Where(m => m.TargetType == targetType.Value);

        var results = await query.ToListAsync();

        // Count "orphan" records: the target no longer exists in the DB.
        // This needs a separate query because it is a negated condition (the target does not exist).
        var postTargetIds = results
            .Where(m => m.TargetType == ModerationTargetType.Post)
            .Select(m => m.TargetId)
            .Distinct()
            .ToList();

        var existingPostIds = new HashSet<Guid>();
        if (postTargetIds.Count > 0)
        {
            existingPostIds = (await _context.Posts
                    .Where(p => postTargetIds.Contains(p.Id))
                    .Select(p => p.Id)
                    .ToListAsync())
                .ToHashSet();
        }

        var orphanCount = postTargetIds.Count(id => !existingPostIds.Contains(id));

        // Các ca đang chờ xử lý quá hạn (SLA) — dùng để admin ưu tiên ca cũ.
        var slaThresholdHours = 24;
        var slaBreachedCount = results.Count(m =>
            (m.Status == ModerationStatus.Pending || m.Status == ModerationStatus.NeedsReview) &&
            (DateTime.UtcNow - m.CreatedAt).TotalHours > slaThresholdHours);

        var oldestPendingAgeHours = results
            .Where(m => m.Status == ModerationStatus.Pending || m.Status == ModerationStatus.NeedsReview)
            .Select(m => (DateTime.UtcNow - m.CreatedAt).TotalHours)
            .DefaultIfEmpty(0)
            .Max();

        return new ModerationStatsDto
        {
            Total = results.Count,
            Pending = results.Count(m => m.Status == ModerationStatus.Pending),
            Approved = results.Count(m => m.Status == ModerationStatus.Approved),
            Rejected = results.Count(m => m.Status == ModerationStatus.Rejected),
            NeedsReview = results.Count(m => m.Status == ModerationStatus.NeedsReview),
            FallbackCount = results.Count(m => m.Source == ModerationSource.Fallback),
            ReviewedByAdminCount = results.Count(m => m.ReviewedAt != null),
            OrphanCount = orphanCount,
            AppealPendingCount = results.Count(m => m.AppealStatus == ModerationAppealStatus.Pending),
            SlaBreachedCount = slaBreachedCount,
            OldestPendingAgeHours = Math.Round(oldestPendingAgeHours, 1)
        };
    }

    public async Task<ModerationResultDto> ApproveAsync(Guid moderationResultId, Guid adminId, string? adminNote = null)
    {
        var result = await GetForReviewAsync(moderationResultId);

        result.Status = ModerationStatus.Approved;
        // Source = Human: quyết định cuối là của admin. LlmDecision / Severity /
        // Confidence / Categories được giữ nguyên để admin đối chiếu với đề xuất
        // của AI (dùng để tính tỉ lệ đồng thuận).
        result.Source = ModerationSource.Human;
        result.AdminNote = NormalizeNote(adminNote);
        result.ReviewedBy = adminId;
        result.ReviewedAt = DateTime.UtcNow;
        result.InternalReasonCode = "admin_approve";
        result.UpdatedAt = DateTime.UtcNow;

        // The content is approved → the author no longer needs the rejection reason.
        result.AuthorReason = null;

        // Nếu đây là khiếu nại đang chờ → đánh dấu đã xử lý.
        ResolveAppealIfPending(result);

        var now = DateTime.UtcNow;
        await _targetAccessor.ApplyStatusAsync(
            _context,
            result.TargetType,
            result.TargetId,
            ModerationStatus.Approved,
            now);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Admin {AdminId} approved moderation result {ModerationId} (target {TargetType} {TargetId})",
            adminId, moderationResultId, result.TargetType, result.TargetId);

        // Nhật ký quyết định (3.2) + đo tỉ lệ admin đảo quyết định của AI.
        await LogAdminDecisionAsync(result, adminId, approved: true, adminNote);
        await NotifyAuthorAsync(result, approved: true, adminNote, cancellationToken: default);

        // Admin duyệt lại nội dung bị từ chối → gỡ strike đã cộng nhầm (3.5).
        await RevokeStrikeAsync(result, "Admin approved the content on review");

        return (await MapToDtosAsync(new List<ModerationResult> { result })).First();
    }

    public async Task<ModerationResultDto> RejectAsync(Guid moderationResultId, Guid adminId, string? adminNote = null)
    {
        var result = await GetForReviewAsync(moderationResultId);

        result.Status = ModerationStatus.Rejected;
        // Source = Human — xem giải thích ở ApproveAsync.
        result.Source = ModerationSource.Human;
        result.AdminNote = NormalizeNote(adminNote);
        result.ReviewedBy = adminId;
        result.ReviewedAt = DateTime.UtcNow;
        result.InternalReasonCode = "admin_reject";
        result.UpdatedAt = DateTime.UtcNow;

        // Nếu đây là khiếu nại đang chờ → đánh dấu đã xử lý.
        ResolveAppealIfPending(result);

        // The content is hidden from the feed. Only the author still sees it (the query filters by UserId).
        var now = DateTime.UtcNow;
        await _targetAccessor.ApplyStatusAsync(
            _context,
            result.TargetType,
            result.TargetId,
            ModerationStatus.Rejected,
            now);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Admin {AdminId} rejected moderation result {ModerationId} (target {TargetType} {TargetId})",
            adminId, moderationResultId, result.TargetType, result.TargetId);

        // Nhật ký quyết định (3.2) + đo tỉ lệ admin đảo quyết định của AI.
        await LogAdminDecisionAsync(result, adminId, approved: false, adminNote);
        await NotifyAuthorAsync(result, approved: false, adminNote, cancellationToken: default);

        // Admin xác nhận vi phạm → cộng strike cho tác giả (3.5).
        await RecordStrikeAsync(result, adminId);

        return (await MapToDtosAsync(new List<ModerationResult> { result })).First();
    }

    /// <summary>
    /// Xử lý hàng loạt nhiều bản ghi. Bản ghi nào không hợp lệ (đã được xử lý,
    /// không tồn tại) sẽ bị bỏ qua và không làm hỏng cả lô.
    /// </summary>
    public async Task<BulkModerationResultDto> BulkResolveAsync(
        BulkModerationRequest request,
        Guid adminId)
    {
        var action = request.Action?.Trim().ToLowerInvariant();
        if (action is not ("approve" or "reject"))
            throw new ArgumentException("Action must be either 'approve' or 'reject'");

        var succeeded = new List<Guid>();
        var failed = new List<BulkModerationFailureDto>();

        foreach (var id in request.Ids.Distinct())
        {
            try
            {
                if (action == "approve")
                    await ApproveAsync(id, adminId, request.AdminNote);
                else
                    await RejectAsync(id, adminId, request.AdminNote);

                succeeded.Add(id);
            }
            catch (KeyNotFoundException)
            {
                failed.Add(new BulkModerationFailureDto { Id = id, Reason = "Not found" });
            }
            catch (InvalidOperationException ex)
            {
                failed.Add(new BulkModerationFailureDto { Id = id, Reason = ex.Message });
            }
        }

        _logger.LogInformation(
            "Admin {AdminId} ran bulk {Action} on {Count} moderation records ({Succeeded} succeeded, {Failed} failed).",
            adminId, action, request.Ids.Count, succeeded.Count, failed.Count);

        return new BulkModerationResultDto
        {
            Action = action,
            SucceededCount = succeeded.Count,
            FailedCount = failed.Count,
            SucceededIds = succeeded,
            Failures = failed
        };
    }

    /// <summary>
    /// Cộng strike cho tác giả khi admin xác nhận vi phạm (3.5).
    /// </summary>
    private async Task RecordStrikeAsync(ModerationResult result, Guid adminId)
    {
        try
        {
            var authorId = await _targetAccessor.GetAuthorIdAsync(
                _context, result.TargetType, result.TargetId);

            if (authorId == null || authorId.Value == Guid.Empty)
                return;

            var strikeResult = await _strikeService.RecordViolationAsync(
                authorId.Value,
                result.TargetId,
                result.TargetType,
                result.Id,
                result.Severity,
                ModerationSource.Human,
                result.InternalReasonCode);

            _logger.LogInformation(
                "Strike recorded for author {AuthorId} (target {TargetType} {TargetId}). Active weight {Weight}/{Threshold}.",
                authorId.Value, result.TargetType, result.TargetId,
                strikeResult.ActiveStrikeWeight, strikeResult.BanThreshold);
        }
        catch (Exception ex)
        {
            // Strike là best-effort — không được làm hỏng quyết định của admin.
            _logger.LogError(ex,
                "Failed to record strike for moderation result {ModerationId}.", result.Id);
        }
    }

    /// <summary>
    /// Gỡ strike khi admin duyệt lại nội dung bị từ chối (3.5).
    /// </summary>
    private async Task RevokeStrikeAsync(ModerationResult result, string reason)
    {
        try
        {
            var authorId = await _targetAccessor.GetAuthorIdAsync(
                _context, result.TargetType, result.TargetId);

            if (authorId == null || authorId.Value == Guid.Empty)
                return;

            var revoked = await _strikeService.RevokeStrikesAsync(
                authorId.Value, result.Id, reason);

            if (revoked > 0)
            {
                _logger.LogInformation(
                    "Revoked {Count} strike(s) for author {AuthorId} after admin approval.",
                    revoked, authorId.Value);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to revoke strikes for moderation result {ModerationId}.", result.Id);
        }
    }

    /// <summary>
    /// Ghi quyết định của admin vào nhật ký (3.2) và đo tỉ lệ đảo quyết định.
    ///
    /// "Đảo quyết định" = AI nói reject nhưng admin approve (false positive của AI),
    /// hoặc AI nói approve nhưng admin reject (false negative của AI).
    /// </summary>
    private async Task LogAdminDecisionAsync(
        ModerationResult result,
        Guid adminId,
        bool approved,
        string? adminNote)
    {
        var overturned =
            (IsLlmReject(result.LlmDecision) && approved)
            || (IsLlmApprove(result.LlmDecision) && !approved);

        _metrics.RecordAdminOverturn(result.TargetType, overturned);

        await _decisionLogger.LogAsync(
            result,
            result.Status,
            ModerationSource.Human,
            stage: "admin",
            actorId: adminId,
            actorRole: "Admin",
            note: adminNote);
    }

    /// <summary>
    /// Thống kê đồng thuận AI ↔ admin (Phase 3.2).
    ///
    /// Mẫu đo là các bản ghi đã được admin xử lý (ReviewedAt != null) — vì khi đó
    /// mới có "đáp án đúng" để so với đề xuất của AI.
    ///
    /// Quy ước so sánh:
    ///   - AI nói "approve" (LlmDecision) nhưng admin reject → false NEGATIVE
    ///     (AI lỡ tay cho nội dung vi phạm lọt qua).
    ///   - AI nói "reject" nhưng admin approve → false POSITIVE
    ///     (AI chặn nhầm nội dung sạch).
    ///   - AI nói "review" → tính là đồng ý khi admin đưa vào vùng xám.
    /// </summary>
    public async Task<ModerationAgreementDto> GetAgreementStatsAsync(
        ModerationTargetType? targetType = null,
        DateTime? fromUtc = null,
        DateTime? toUtc = null)
    {
        var query = _context.ModerationResults
            .Where(m => m.ReviewedAt != null && m.LlmDecision != null);

        if (targetType.HasValue)
            query = query.Where(m => m.TargetType == targetType.Value);

        if (fromUtc.HasValue)
            query = query.Where(m => m.ReviewedAt >= fromUtc.Value);

        if (toUtc.HasValue)
            query = query.Where(m => m.ReviewedAt <= toUtc.Value);

        var reviewed = await query.ToListAsync();

        var dto = new ModerationAgreementDto
        {
            ReviewedCount = reviewed.Count
        };

        if (reviewed.Count == 0)
            return dto;

        // ── False positive / negative ─────────────────────────────────────────
        var falsePositives = reviewed
            .Where(m => IsLlmReject(m.LlmDecision) && m.Status == ModerationStatus.Approved)
            .ToList();

        var falseNegatives = reviewed
            .Where(m => IsLlmApprove(m.LlmDecision) && m.Status == ModerationStatus.Rejected)
            .ToList();

        dto.FalsePositiveCount = falsePositives.Count;
        dto.FalseNegativeCount = falseNegatives.Count;

        var disagreementCount = falsePositives.Count + falseNegatives.Count;
        dto.DisagreementRate = Round(disagreementCount / (double)reviewed.Count);
        dto.AgreementRate = Round(1 - dto.DisagreementRate);
        dto.EstimatedAccuracy = Round(1 - dto.DisagreementRate);

        // ── Theo category ─────────────────────────────────────────────────────
        // Một bản ghi có thể có nhiều category → tính cho từng category.
        var categoryStats = new Dictionary<string, (int Total, int Disagreements)>();

        foreach (var item in reviewed)
        {
            var categories = SplitCategories(item.Categories);
            var disagreed = IsDisagreement(item);

            foreach (var category in categories)
            {
                var current = categoryStats.GetValueOrDefault(category);
                categoryStats[category] = (
                    current.Total + 1,
                    current.Disagreements + (disagreed ? 1 : 0));
            }
        }

        dto.ByCategory = categoryStats
            .Select(kv => new ModerationCategoryAgreementDto
            {
                Category = kv.Key,
                ReviewedCount = kv.Value.Total,
                DisagreementCount = kv.Value.Disagreements,
                AgreementRate = kv.Value.Total == 0
                    ? 0
                    : Round(1 - (kv.Value.Disagreements / (double)kv.Value.Total)),
            })
            .OrderByDescending(c => c.ReviewedCount)
            .ToList();

        // ── Theo prompt version / model ──────────────────────────────────────
        dto.ByPromptVersion = BuildVersionStats(
            reviewed.Where(m => !string.IsNullOrWhiteSpace(m.PromptVersion)),
            m => m.PromptVersion!);

        dto.ByModel = BuildVersionStats(
            reviewed.Where(m => !string.IsNullOrWhiteSpace(m.ModelName)),
            m => m.ModelName!);

        // ── Đề xuất ngưỡng ───────────────────────────────────────────────────
        dto.SuggestedThresholds = SuggestThresholds(falsePositives, falseNegatives);

        return dto;
    }

    /// <summary>
    /// Đề xuất ngưỡng confidence dựa trên dữ liệu thật.
    ///
    /// - ApproveMinConfidence: lấy confidence trung vị của các ca AI "approve"
    ///   nhưng admin reject (false negative). Auto-approve phải có confidence
    ///   CAO HƠN mức đó, nếu không sẽ lọt lại nội dung vi phạm.
    /// - RejectMinConfidence: lấy confidence trung vị của các ca AI "reject"
    ///   nhưng admin approve (false positive). Auto-reject phải có confidence
    ///   KHÔNG CAO HƠN mức đó, nếu không sẽ chặn nhầm.
    /// </summary>
    private static ModerationThresholdSuggestionDto? SuggestThresholds(
        List<ModerationResult> falsePositives,
        List<ModerationResult> falseNegatives)
    {
        if (falsePositives.Count == 0 && falseNegatives.Count == 0)
            return null;

        // False positive (AI chặn nhầm) → ngưỡng reject không được cao hơn confidence đó.
        double? rejectSuggestion = falsePositives.Count == 0
            ? null
            : Median(falsePositives
                .Where(m => m.Confidence.HasValue)
                .Select(m => m.Confidence!.Value)
                .ToList());

        // False negative (AI cho lọt) → ngưỡng approve phải cao hơn confidence đó.
        double? approveSuggestion = falseNegatives.Count == 0
            ? null
            : Median(falseNegatives
                .Where(m => m.Confidence.HasValue)
                .Select(m => m.Confidence!.Value)
                .ToList());

        var explanation = new List<string>();
        if (approveSuggestion.HasValue)
            explanation.Add(
                $"ApproveMinConfidence nên ≥ {approveSuggestion.Value:F2} " +
                $"(trung vị của {falseNegatives.Count} ca AI duyệt nhầm nội dung vi phạm).");
        else
            explanation.Add("Chưa có ca AI duyệt nhầm nào → giữ ngưỡng hiện tại.");

        if (rejectSuggestion.HasValue)
            explanation.Add(
                $"RejectMinConfidence nên ≤ {rejectSuggestion.Value:F2} " +
                $"(trung vị của {falsePositives.Count} ca AI chặn nhầm nội dung sạch).");
        else
            explanation.Add("Chưa có ca AI chặn nhầm nào → giữ ngưỡng hiện tại.");

        return new ModerationThresholdSuggestionDto
        {
            ApproveMinConfidence = approveSuggestion ?? 0.70,
            RejectMinConfidence = rejectSuggestion ?? 0.80,
            SampleSize = falsePositives.Count + falseNegatives.Count,
            Explanation = string.Join(" ", explanation),
        };
    }

    /// <summary>
    /// Thống kê theo một chiều (prompt version hoặc model): số lượng quyết định
    /// theo từng trạng thái + tỉ lệ auto-approve.
    /// </summary>
    private static List<ModerationPromptVersionStatsDto> BuildVersionStats(
        IEnumerable<ModerationResult> items,
        Func<ModerationResult, string> keySelector)
    {
        return items
            .GroupBy(keySelector)
            .Select(group =>
            {
                var list = group.ToList();

                var approved = list.Count(m => m.Status == ModerationStatus.Approved);
                var rejected = list.Count(m => m.Status == ModerationStatus.Rejected);
                var needsReview = list.Count(m => m.Status == ModerationStatus.NeedsReview);
                var total = list.Count;

                return new ModerationPromptVersionStatsDto
                {
                    Key = group.Key,
                    TotalCount = total,
                    ApprovedCount = approved,
                    RejectedCount = rejected,
                    NeedsReviewCount = needsReview,
                    AutoApproveRatio = total == 0 ? 0 : Round(approved / (double)total),
                };
            })
            .OrderByDescending(s => s.TotalCount)
            .ToList();
    }

    private static bool IsDisagreement(ModerationResult item) =>
        (IsLlmReject(item.LlmDecision) && item.Status == ModerationStatus.Approved)
        || (IsLlmApprove(item.LlmDecision) && item.Status == ModerationStatus.Rejected);

    private static bool IsLlmApprove(string? decision) =>
        string.Equals(decision, "approve", StringComparison.OrdinalIgnoreCase);

    private static bool IsLlmReject(string? decision) =>
        string.Equals(decision, "reject", StringComparison.OrdinalIgnoreCase);

    private static List<string> SplitCategories(string? categories) =>
        string.IsNullOrWhiteSpace(categories)
            ? []
            : categories.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(c => c.Trim().ToLowerInvariant())
                .Where(c => c.Length > 0)
                .ToList();

    private static double Median(List<double> values)
    {
        if (values.Count == 0)
            return 0;

        var sorted = values.OrderBy(v => v).ToList();
        var mid = sorted.Count / 2;

        return sorted.Count % 2 == 1
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    private static double Round(double value) => Math.Round(value, 4);

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Áp dụng bộ lọc + sắp xếp + phân trang lên query ModerationResults.
    /// Trả về danh sách bản ghi và (tuỳ chọn) tổng số bản ghi khớp bộ lọc.
    /// </summary>
    private async Task<(List<ModerationResult> Results, int Total)> QueryResultsAsync(
        ModerationQueryFilter filter,
        bool includeTotal)
    {
        var query = _context.ModerationResults.AsQueryable();

        if (filter.Status.HasValue)
            query = query.Where(m => m.Status == filter.Status.Value);

        if (filter.TargetType.HasValue)
            query = query.Where(m => m.TargetType == filter.TargetType.Value);

        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            // Categories are stored as CSV ("harassment,spam"). We use LIKE instead of Split()
            // because string.Split cannot be translated to SQL (PostgreSQL).
            // The parameter may contain several categories separated by commas → match any of them.
            var categories = filter.Category
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(c => c.Trim().ToLowerInvariant())
                .Where(c => c.Length > 0)
                .ToList();

            if (categories.Count > 0)
            {
                query = query.Where(m =>
                    m.Categories != null &&
                    categories.Any(category =>
                        m.Categories == category ||
                        m.Categories.StartsWith(category + ",") ||
                        m.Categories.EndsWith("," + category) ||
                        m.Categories.Contains("," + category + ",")));
            }
        }

        if (filter.OnlyWithAppeal)
            query = query.Where(m => m.AppealStatus == ModerationAppealStatus.Pending);

        if (filter.MinSeverity.HasValue)
            query = query.Where(m => m.Severity != null && m.Severity >= filter.MinSeverity.Value);

        if (filter.MinConfidence.HasValue)
            query = query.Where(m => m.Confidence != null && m.Confidence >= filter.MinConfidence.Value);

        if (filter.FromUtc.HasValue)
            query = query.Where(m => m.CreatedAt >= filter.FromUtc.Value);

        if (filter.ToUtc.HasValue)
            query = query.Where(m => m.CreatedAt <= filter.ToUtc.Value);

        if (filter.MinReportCount.HasValue)
            query = query.Where(m => m.ReportCount >= filter.MinReportCount.Value);

        // Lọc theo tác giả: phải tra cứu id nội dung của tác giả trước, vì
        // ModerationResult không lưu trực tiếp id tác giả (mỗi loại nội dung
        // nằm ở bảng khác nhau).
        if (filter.AuthorId.HasValue)
        {
            var authorTargetIds = await GetTargetIdsByAuthorAsync(filter.AuthorId.Value);
            query = query.Where(m => authorTargetIds.Contains(m.TargetId));
        }

        // Full-text search (Phase 2.9): tìm trong nội dung gốc của post/comment/reel,
        // đồng thời trong lý do và category của bản ghi kiểm duyệt.
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim();
            var matchedTargetIds = await GetTargetIdsBySearchAsync(term);

            query = query.Where(m =>
                matchedTargetIds.Contains(m.TargetId) ||
                (m.AuthorReason != null && m.AuthorReason.Contains(term)) ||
                (m.InternalReasonCode != null && m.InternalReasonCode.Contains(term)) ||
                (m.Categories != null && m.Categories.Contains(term)) ||
                (m.AdminNote != null && m.AdminNote.Contains(term)) ||
                (m.OcrText != null && m.OcrText.Contains(term)));
        }

        // Sắp xếp theo điểm ưu tiên (giảm dần) được ưu tiên cao nhất — đó là
        // thứ admin cần xem trước (nội dung bị report nhiều). Sau đó tới severity.
        if (filter.OrderByPriority)
        {
            query = query
                .OrderByDescending(m => m.Priority)
                .ThenByDescending(m => m.Severity ?? 0)
                .ThenBy(m => m.CreatedAt);
        }
        else if (filter.OrderBySeverity)
        {
            query = query
                .OrderByDescending(m => m.Severity ?? 0)
                .ThenBy(m => m.CreatedAt);
        }
        else if (filter.OrderByUpdatedAt)
        {
            query = query.OrderByDescending(m => m.UpdatedAt);
        }
        else
        {
            query = query.OrderBy(m => m.CreatedAt);
        }

        var total = 0;
        if (includeTotal)
            total = await query.CountAsync();

        var skip = Math.Max(0, filter.Skip);
        var take = Math.Clamp(filter.Take, 1, 100);

        var results = await query
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return (results, total);
    }

    /// <summary>
    /// Lấy danh sách id nội dung (post/comment/reel) thuộc về một tác giả.
    /// </summary>
    private async Task<List<Guid>> GetTargetIdsByAuthorAsync(Guid authorId)
    {
        var postIds = await _context.Posts
            .Where(p => p.UserId == authorId)
            .Select(p => p.Id)
            .ToListAsync();

        var commentIds = await _context.Comments
            .Where(c => c.UserId == authorId)
            .Select(c => c.Id)
            .ToListAsync();

        var reelIds = await _context.Reels
            .Where(r => r.UserId == authorId)
            .Select(r => r.Id)
            .ToListAsync();

        var reelCommentIds = await _context.ReelComments
            .Where(c => c.UserId == authorId)
            .Select(c => c.Id)
            .ToListAsync();

        var storyItemIds = await _context.StoryItems
            .Where(i => i.StoryGroup != null && i.StoryGroup.UserId == authorId)
            .Select(i => i.Id)
            .ToListAsync();

        return postIds
            .Concat(commentIds)
            .Concat(reelIds)
            .Concat(reelCommentIds)
            .Concat(storyItemIds)
            .ToList();
    }

    /// <summary>
    /// Tìm id nội dung (post/comment/reel) có chứa từ khoá tìm kiếm.
    /// Dùng cho full-text search trong hàng đợi admin (Phase 2.9).
    /// </summary>
    private async Task<List<Guid>> GetTargetIdsBySearchAsync(string term)
    {
        var postIds = await _context.Posts
            .Where(p => p.Content != null && p.Content.Contains(term))
            .Select(p => p.Id)
            .ToListAsync();

        var commentIds = await _context.Comments
            .Where(c => c.Content != null && c.Content.Contains(term))
            .Select(c => c.Id)
            .ToListAsync();

        var reelIds = await _context.Reels
            .Where(r => r.Caption != null && r.Caption.Contains(term))
            .Select(r => r.Id)
            .ToListAsync();

        return postIds.Concat(commentIds).Concat(reelIds).ToList();
    }

    /// <summary>
    /// Lấy bản ghi kiểm duyệt và đảm bảo nó đang ở trạng thái có thể admin xử lý.
    /// </summary>
    private async Task<ModerationResult> GetForReviewAsync(Guid moderationResultId)
    {
        var result = await _context.ModerationResults
            .FirstOrDefaultAsync(m => m.Id == moderationResultId);

        if (result == null)
            throw new KeyNotFoundException("Moderation result not found");

        // Admin có thể xử lý nội dung ở vùng xám, hoặc nội dung LLM đã từ chối
        // nhưng tác giả khiếu nại — cho phép quyết định lại.
        if (result.Status != ModerationStatus.NeedsReview && result.Status != ModerationStatus.Rejected)
            throw new InvalidOperationException("Moderation result is not awaiting review");

        return result;
    }

    /// <summary>
    /// Đánh dấu khiếu nại đang chờ đã được xử lý xong.
    /// </summary>
    private static void ResolveAppealIfPending(ModerationResult result)
    {
        if (result.AppealStatus != ModerationAppealStatus.Pending)
            return;

        result.AppealStatus = ModerationAppealStatus.Resolved;
        result.AppealResolvedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Thông báo cho tác giả khi admin xử lý nội dung.
    ///
    /// - Nếu nội dung đang có khiếu nại → gửi "AppealResolved" (tác giả đang chờ kết quả).
    /// - Nếu không có khiếu nại nhưng bị từ chối → gửi "ContentRejected".
    /// - Nội dung được duyệt và không có khiếu nại → không gửi gì (tác giả tự thấy).
    /// </summary>
    private async Task NotifyAuthorAsync(
        ModerationResult result,
        bool approved,
        string? adminNote,
        CancellationToken cancellationToken)
    {
        var authorId = await _targetAccessor.GetAuthorIdAsync(
            _context, result.TargetType, result.TargetId, cancellationToken);

        if (authorId == null || authorId.Value == Guid.Empty)
            return;

        var reason = NormalizeNote(adminNote);

        if (result.AppealStatus == ModerationAppealStatus.Resolved
            && result.AppealSubmittedAt != null)
        {
            await _notifier.NotifyAppealResolvedAsync(
                authorId.Value, result.TargetId, result.TargetType, approved, reason, cancellationToken);
            return;
        }

        if (!approved)
        {
            await _notifier.NotifyRejectedAsync(
                authorId.Value, result.TargetId, result.TargetType, reason, cancellationToken);
        }
    }

    /// <summary>
    /// Ghi chú của admin bị cắt ngắn quá dài.
    /// </summary>
    private static string? NormalizeNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
            return null;

        var trimmed = note.Trim();
        return trimmed.Length <= 500 ? trimmed : trimmed[..500];
    }

    /// <summary>
    /// Ánh xạ bản ghi kiểm duyệt sang DTO, kèm nội dung bị kiểm duyệt và thông tin tác giả.
    /// </summary>
    private async Task<List<ModerationResultDto>> MapToDtosAsync(List<ModerationResult> results)
    {
        if (results.Count == 0)
            return new List<ModerationResultDto>();

        // Lấy nội dung gốc của các target — hỗ trợ Post, Comment và Reel.
        var postIds = results
            .Where(r => r.TargetType == ModerationTargetType.Post)
            .Select(r => r.TargetId)
            .ToList();
        var commentIds = results
            .Where(r => r.TargetType == ModerationTargetType.Comment)
            .Select(r => r.TargetId)
            .ToList();
        var reelIds = results
            .Where(r => r.TargetType == ModerationTargetType.Reel)
            .Select(r => r.TargetId)
            .ToList();
        var reelCommentIds = results
            .Where(r => r.TargetType == ModerationTargetType.ReelComment)
            .Select(r => r.TargetId)
            .ToList();
        var storyItemIds = results
            .Where(r => r.TargetType == ModerationTargetType.Story)
            .Select(r => r.TargetId)
            .ToList();

        var posts = await _context.Posts
            .Include(p => p.Media)
            .Where(p => postIds.Contains(p.Id))
            .ToListAsync();

        var comments = await _context.Comments
            .Where(c => commentIds.Contains(c.Id))
            .ToListAsync();

        var reels = await _context.Reels
            .Where(r => reelIds.Contains(r.Id))
            .ToListAsync();

        var reelComments = await _context.ReelComments
            .Where(c => reelCommentIds.Contains(c.Id))
            .ToListAsync();

        var storyItems = await _context.StoryItems
            .Include(i => i.StoryGroup)
            .Where(i => storyItemIds.Contains(i.Id))
            .ToListAsync();

        // Lấy profile tác giả qua RPC — gom request lại thay vì gọi tuần tự.
        var authorIds = posts.Select(p => p.UserId)
            .Concat(comments.Select(c => c.UserId))
            .Concat(reels.Select(r => r.UserId))
            .Concat(reelComments.Select(c => c.UserId))
            .Concat(storyItems.Where(i => i.StoryGroup != null).Select(i => i.StoryGroup.UserId))
            .Distinct()
            .ToList();

        var profileLookup = new Dictionary<Guid, UserProfileRpcResponse?>();
        if (authorIds.Count > 0)
        {
            var profileResults = await Task.WhenAll(
                authorIds.Select(id => _userProfileRpcClient.GetProfileAsync(id)));

            profileLookup = authorIds
                .Zip(profileResults, (id, profile) => new { id, profile })
                .ToDictionary(x => x.id, x => x.profile);
        }

        var postLookup = posts.ToDictionary(p => p.Id);
        var commentLookup = comments.ToDictionary(c => c.Id);
        var reelLookup = reels.ToDictionary(r => r.Id);
        var reelCommentLookup = reelComments.ToDictionary(c => c.Id);
        var storyItemLookup = storyItems.ToDictionary(i => i.Id);

        return results.Select(result =>
        {
            var dto = new ModerationResultDto
            {
                Id = result.Id,
                TargetId = result.TargetId,
                TargetType = result.TargetType,
                Status = result.Status,
                Source = result.Source,
                LlmDecision = result.LlmDecision,
                Severity = result.Severity,
                Confidence = result.Confidence,
                Categories = string.IsNullOrWhiteSpace(result.Categories)
                    ? new List<string>()
                    : result.Categories.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(c => c.Trim())
                        .Where(c => c.Length > 0)
                        .ToList(),
                AuthorReason = result.AuthorReason,
                InternalReasonCode = result.InternalReasonCode,
                AttemptCount = result.AttemptCount,
                CreatedAt = result.CreatedAt,
                UpdatedAt = result.UpdatedAt,
                AdminNote = result.AdminNote,
                ReviewedBy = result.ReviewedBy,
                ReviewedAt = result.ReviewedAt,
                AppealStatus = result.AppealStatus.ToString(),
                AppealReason = result.AppealReason,
                AppealSubmittedAt = result.AppealSubmittedAt,
                AppealResolvedAt = result.AppealResolvedAt,

                // ===== Versioning + observability (3.3 / 3.4) =====
                PromptVersion = result.PromptVersion,
                ModelName = result.ModelName,
                LlmLatencyMs = result.LlmLatencyMs,
                TotalTokens = result.TotalTokens,
                EstimatedCostUsd = result.EstimatedCostUsd,

                // ===== Shadow mode (3.3) =====
                ShadowDecision = result.ShadowDecision,
                ShadowStatus = result.ShadowStatus?.ToString(),
                ShadowConfidence = result.ShadowConfidence,
                ShadowSeverity = result.ShadowSeverity,
                ShadowModel = result.ShadowModel,
                ShadowPromptVersion = result.ShadowPromptVersion,
                ShadowAgreesWithPrimary = result.ShadowAgreesWithPrimary,

                // ===== Bằng chứng media (3.7) =====
                TargetMediaUrlsSnapshot = string.IsNullOrWhiteSpace(result.TargetMediaUrlsSnapshot)
                    ? new List<string>()
                    : result.TargetMediaUrlsSnapshot
                        .Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(u => u.Trim())
                        .Where(u => u.Length > 0)
                        .ToList(),
                OcrText = result.OcrText,

                // ===== Ưu tiên hàng đợi (3.6) =====
                ReportCount = result.ReportCount,
                Priority = result.Priority,
            };

            switch (result.TargetType)
            {
                case ModerationTargetType.Post
                    when postLookup.TryGetValue(result.TargetId, out var post):
                    dto.TargetContent = post.Content;
                    dto.TargetMediaUrls = post.Media
                        .OrderBy(m => m.DisplayOrder)
                        .Select(m => m.Url)
                        .ToList();
                    dto.TargetDeleted = post.IsDeleted;
                    dto.AuthorId = post.UserId;
                    break;

                case ModerationTargetType.Comment
                    when commentLookup.TryGetValue(result.TargetId, out var comment):
                    dto.TargetContent = comment.Content;
                    dto.TargetMediaUrls = string.IsNullOrWhiteSpace(comment.ImageUrl)
                        ? new List<string>()
                        : new List<string> { comment.ImageUrl };
                    dto.TargetDeleted = comment.IsDeleted;
                    dto.AuthorId = comment.UserId;
                    break;

                case ModerationTargetType.Reel
                    when reelLookup.TryGetValue(result.TargetId, out var reel):
                    dto.TargetContent = reel.Caption ?? string.Empty;
                    dto.TargetMediaUrls = string.IsNullOrWhiteSpace(reel.ThumbnailUrl)
                        ? new List<string>()
                        : new List<string> { reel.ThumbnailUrl };
                    dto.TargetDeleted = false;
                    dto.AuthorId = reel.UserId;
                    break;

                case ModerationTargetType.ReelComment
                    when reelCommentLookup.TryGetValue(result.TargetId, out var reelComment):
                    dto.TargetContent = reelComment.Content;
                    dto.TargetMediaUrls = new List<string>();
                    dto.TargetDeleted = false;
                    dto.AuthorId = reelComment.UserId;
                    break;

                case ModerationTargetType.Story
                    when storyItemLookup.TryGetValue(result.TargetId, out var storyItem):
                    // Story không có text → hiển thị phần OCR đã trích (nếu có).
                    dto.TargetContent = result.OcrText ?? string.Empty;
                    dto.TargetMediaUrls = string.IsNullOrWhiteSpace(storyItem.Url)
                        ? new List<string>()
                        : new List<string> { storyItem.Url };
                    dto.TargetDeleted = false;
                    dto.AuthorId = storyItem.StoryGroup?.UserId ?? Guid.Empty;
                    break;
            }

            if (dto.AuthorId != Guid.Empty)
            {
                if (profileLookup.TryGetValue(dto.AuthorId, out var profile) && profile?.Found == true)
                {
                    dto.AuthorDisplayName = profile.DisplayName;
                    dto.AuthorAvatarUrl = profile.AvatarUrl;
                }
                else
                {
                    dto.AuthorDisplayName = "Someone";
                }
            }

            return dto;
        }).ToList();
    }
}
