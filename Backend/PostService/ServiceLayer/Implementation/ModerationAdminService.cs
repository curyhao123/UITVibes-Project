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
/// </summary>
public class ModerationAdminService : IModerationAdminService
{
    private readonly PostDbContext _context;
    private readonly IUserProfileRpcClient _userProfileRpcClient;
    private readonly ILogger<ModerationAdminService> _logger;

    public ModerationAdminService(
        PostDbContext context,
        IUserProfileRpcClient userProfileRpcClient,
        ILogger<ModerationAdminService> logger)
    {
        _context = context;
        _userProfileRpcClient = userProfileRpcClient;
        _logger = logger;
    }

    public async Task<List<ModerationResultDto>> GetModerationResultsAsync(ModerationQueryFilter filter)
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

        if (filter.OrderByUpdatedAt)
            query = query.OrderByDescending(m => m.UpdatedAt);
        else
            query = query.OrderBy(m => m.CreatedAt);

        var skip = Math.Max(0, filter.Skip);
        var take = Math.Clamp(filter.Take, 1, 100);

        var results = await query
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        return await MapToDtosAsync(results);
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

        // Count "orphan" records: the target is a Post but the post was deleted from the DB.
        // This needs a separate query because it is a negated condition (the post does not exist).
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
        };
    }

    public async Task<ModerationResultDto> ApproveAsync(Guid moderationResultId, Guid adminId, string? adminNote = null)
    {
        var result = await GetForReviewAsync(moderationResultId);
        var post = await GetTargetPostAsync(result);

        result.Status = ModerationStatus.Approved;
        result.Source = ModerationSource.Rule;
        result.AdminNote = NormalizeNote(adminNote);
        result.ReviewedBy = adminId;
        result.ReviewedAt = DateTime.UtcNow;
        result.InternalReasonCode = "admin_approve";
        result.UpdatedAt = DateTime.UtcNow;

        // The content is approved → the author no longer needs the rejection reason.
        result.AuthorReason = null;

        if (post != null)
        {
            post.ModerationStatus = ModerationStatus.Approved;
            post.ModeratedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Admin {AdminId} approved moderation result {ModerationId} (target {TargetType} {TargetId})",
            adminId, moderationResultId, result.TargetType, result.TargetId);

        return (await MapToDtosAsync(new List<ModerationResult> { result })).First();
    }

    public async Task<ModerationResultDto> RejectAsync(Guid moderationResultId, Guid adminId, string? adminNote = null)
    {
        var result = await GetForReviewAsync(moderationResultId);
        var post = await GetTargetPostAsync(result);

        result.Status = ModerationStatus.Rejected;
        result.Source = ModerationSource.Rule;
        result.AdminNote = NormalizeNote(adminNote);
        result.ReviewedBy = adminId;
        result.ReviewedAt = DateTime.UtcNow;
        result.InternalReasonCode = "admin_reject";
        result.UpdatedAt = DateTime.UtcNow;

        // The content is hidden from the feed. Only the author still sees it (the query filters by UserId).
        if (post != null)
        {
            post.ModerationStatus = ModerationStatus.Rejected;
            post.ModeratedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Admin {AdminId} rejected moderation result {ModerationId} (target {TargetType} {TargetId})",
            adminId, moderationResultId, result.TargetType, result.TargetId);

        return (await MapToDtosAsync(new List<ModerationResult> { result })).First();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

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
    /// Lấy post gốc của bản ghi kiểm duyệt (nếu target là Post).
    /// </summary>
    private async Task<Post?> GetTargetPostAsync(ModerationResult result)
    {
        if (result.TargetType != ModerationTargetType.Post)
            return null;

        return await _context.Posts
            .FirstOrDefaultAsync(p => p.Id == result.TargetId);
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

        // Lấy nội dung gốc của các target (post) — chỉ hỗ trợ Post ở thời điểm hiện tại.
        var postIds = results
            .Where(r => r.TargetType == ModerationTargetType.Post)
            .Select(r => r.TargetId)
            .ToList();

        var posts = await _context.Posts
            .Include(p => p.Media)
            .Where(p => postIds.Contains(p.Id))
            .ToListAsync();

        var postLookup = posts.ToDictionary(p => p.Id);

        // Lấy profile tác giả qua RPC — gom request lại thay vì gọi tuần tự.
        var authorIds = posts.Select(p => p.UserId).Distinct().ToList();

        var profileLookup = new Dictionary<Guid, UserProfileRpcResponse?>();
        if (authorIds.Count > 0)
        {
            var profileResults = await Task.WhenAll(
                authorIds.Select(id => _userProfileRpcClient.GetProfileAsync(id)));

            profileLookup = authorIds
                .Zip(profileResults, (id, profile) => new { id, profile })
                .ToDictionary(x => x.id, x => x.profile);
        }

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
            };

            if (result.TargetType == ModerationTargetType.Post
                && postLookup.TryGetValue(result.TargetId, out var post))
            {
                dto.TargetContent = post.Content;
                dto.TargetMediaUrls = post.Media
                    .OrderBy(m => m.DisplayOrder)
                    .Select(m => m.Url)
                    .ToList();
                dto.TargetDeleted = post.IsDeleted;
                dto.AuthorId = post.UserId;

                if (profileLookup.TryGetValue(post.UserId, out var profile) && profile?.Found == true)
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