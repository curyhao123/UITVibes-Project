using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.DTOs.Moderation;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.Workers;

/// <summary>
/// Worker kiểm duyệt nội dung bằng LLM.
///
/// Vòng lặp mỗi lần:
///   1. "Giành" (claim) một lô bản ghi Pending chưa có lease — đặt LeaseExpiresAt
///      và WorkerId để worker khác không xử lý trùng. Việc claim dùng UPDATE
///      có điều kiện nên an toàn khi chạy nhiều replica.
///   2. Gọi LLM và ghi kết quả.
///   3. Nếu LLM lỗi (fallback) và còn lượt thử → giữ Pending để thử lại ở vòng sau.
///      Nếu đã hết lượt thử → ép sang NeedsReview để không bị bỏ mồ côi trong queue.
///
/// Worker xử lý được nhiều loại nội dung (Post, Comment, Reel). Việc đọc/ghi
/// trạng thái trên entity được đóng gói trong <see cref="IModerationTargetAccessor"/>
/// nên worker không cần biết chi tiết từng bảng.
/// </summary>
public class PostModerationWorker : BackgroundService
{
    private readonly ILogger<PostModerationWorker> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IOptions<ModerationOptions> _moderationOptions;

    // Định danh worker — dùng để nhận diện lease do chính mình nắm giữ.
    private readonly string _workerId = $"{Environment.MachineName}-{Guid.NewGuid():N}";
    public PostModerationWorker(
        ILogger<PostModerationWorker> logger,
        IServiceScopeFactory serviceScopeFactory,
        IOptions<ModerationOptions> moderationOptions)
    {
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
        _moderationOptions = moderationOptions;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PostModerationWorker started with worker id {WorkerId}.", _workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _moderationOptions.Value;

            if (!options.Enabled)
            {
                // Moderation bị tắt: nội dung mới đã được duyệt thẳng bởi IModerationEnqueuer.
                // Các bản ghi Pending còn sót lại (từ trước khi tắt) cũng được duyệt thẳng
                // để không bị bỏ mồ côi vĩnh viễn trong hàng đợi.
                await ApprovePendingWhenDisabledAsync(stoppingToken);

                await Task.Delay(TimeSpan.FromSeconds(options.PollIntervalSeconds), stoppingToken);
                continue;
            }

            try
            {
                var processedCount = await ProcessPendingBatchAsync(options, stoppingToken);

                if (processedCount == 0)
                {
                    // No pending items to process, wait for full polling interval
                    await Task.Delay(TimeSpan.FromSeconds(options.PollIntervalSeconds), stoppingToken);
                }
                else
                {
                    // Yield briefly before checking for the next batch
                    await Task.Delay(200, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in PostModerationWorker processing loop.");
                await Task.Delay(TimeSpan.FromSeconds(options.PollIntervalSeconds), stoppingToken);
            }
        }

        _logger.LogInformation("PostModerationWorker stopped.");
    }

    /// <summary>
    /// Duyệt thẳng toàn bộ bản ghi Pending còn sót lại khi moderation bị tắt.
    /// Tránh việc nội dung bị kẹt vĩnh viễn ở trạng thái Pending (và vô hình với
    /// người khác) chỉ vì cấu hình bị tắt sau khi nội dung đã đăng.
    /// </summary>
    private async Task ApprovePendingWhenDisabledAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _serviceScopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<PostDbContext>();
            var targetAccessor = scope.ServiceProvider.GetRequiredService<IModerationTargetAccessor>();

            var pendingItems = await dbContext.ModerationResults
                .Where(m => m.Status == ModerationStatus.Pending)
                .Take(50)
                .ToListAsync(cancellationToken);

            if (pendingItems.Count == 0)
                return;

            var now = DateTime.UtcNow;

            foreach (var item in pendingItems)
            {
                item.Status = ModerationStatus.Approved;
                item.Source = ModerationSource.Rule;
                item.InternalReasonCode = "moderation_disabled_auto_approve";
                item.UpdatedAt = now;

                await targetAccessor.ApplyStatusAsync(
                    dbContext,
                    item.TargetType,
                    item.TargetId,
                    ModerationStatus.Approved,
                    now,
                    cancellationToken);
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Moderation disabled — auto-approved {Count} pending moderation items.", pendingItems.Count);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error auto-approving pending items while moderation is disabled.");
        }
    }

    private async Task<int> ProcessPendingBatchAsync(ModerationOptions options, CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PostDbContext>();
        var llmModerationService = scope.ServiceProvider.GetRequiredService<ILlmModerationService>();
        var targetAccessor = scope.ServiceProvider.GetRequiredService<IModerationTargetAccessor>();
        var notifier = scope.ServiceProvider.GetRequiredService<IContentModerationNotifier>();
        var decisionLogger = scope.ServiceProvider.GetRequiredService<IModerationDecisionLogger>();
        var ocrService = scope.ServiceProvider.GetRequiredService<IOcrService>();

        var claimedIds = await ClaimPendingBatchAsync(dbContext, options, cancellationToken);

        if (claimedIds.Count == 0)
        {
            return 0;
        }

        _logger.LogInformation("Processing batch of {Count} pending moderation tasks.", claimedIds.Count);

        foreach (var id in claimedIds)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            await ProcessItemAsync(id, dbContext, llmModerationService, targetAccessor, notifier, decisionLogger, ocrService, options, cancellationToken);
        }

        return claimedIds.Count;
    }

    /// <summary>
    /// Giành quyền xử lý một lô bản ghi Pending.
    ///
    /// Dùng UPDATE ... WHERE Status = Pending AND (LeaseExpiresAt IS NULL OR LeaseExpiresAt &lt; now)
    /// để chỉ "nhận" được bản ghi mà chưa có worker nào giữ lease. Trên PostgreSQL,
    /// UPDATE với điều kiện là atomic nên hai worker không thể cùng giành một bản ghi.
    /// </summary>
    private async Task<List<Guid>> ClaimPendingBatchAsync(
        PostDbContext dbContext,
        ModerationOptions options,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var leaseExpiresAt = now.AddSeconds(Math.Max(30, options.LeaseDurationSeconds));

        // Bước 1: lấy danh sách ứng viên (chỉ để biết cần claim bao nhiêu bản ghi).
        var candidates = await dbContext.ModerationResults
            .Where(m => m.Status == ModerationStatus.Pending
                     && m.AttemptCount < options.MaxAttempts
                     && (m.LeaseExpiresAt == null || m.LeaseExpiresAt < now))
            .OrderBy(m => m.CreatedAt)
            .Select(m => m.Id)
            .Take(options.BatchSize)
            .ToListAsync(cancellationToken);

        if (candidates.Count == 0)
            return new List<Guid>();

        // Bước 2: giành lease cho từng bản ghi. UPDATE có điều kiện nên chỉ thành công
        // nếu bản ghi vẫn còn "trống" (chưa bị worker khác giành trước đó).
        var claimed = new List<Guid>();

        foreach (var candidateId in candidates)
        {
            var affected = await dbContext.ModerationResults
                .Where(m => m.Id == candidateId
                         && m.Status == ModerationStatus.Pending
                         && (m.LeaseExpiresAt == null || m.LeaseExpiresAt < now))
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(m => m.LeaseExpiresAt, leaseExpiresAt)
                        .SetProperty(m => m.WorkerId, _workerId)
                        .SetProperty(m => m.UpdatedAt, now),
                    cancellationToken);

            if (affected > 0)
                claimed.Add(candidateId);
        }

        if (claimed.Count < candidates.Count)
        {
            _logger.LogInformation(
                "Claimed {ClaimedCount} of {CandidateCount} pending items (others were taken by another worker).",
                claimed.Count, candidates.Count);
        }

        return claimed;
    }

    private async Task ProcessItemAsync(
        Guid itemId,
        PostDbContext dbContext,
        ILlmModerationService llmModerationService,
        IModerationTargetAccessor targetAccessor,
        IContentModerationNotifier notifier,
        IModerationDecisionLogger decisionLogger,
        IOcrService ocrService,
        ModerationOptions options,
        CancellationToken cancellationToken)
    {
        ModerationResult? item = null;

        try
        {
            item = await dbContext.ModerationResults
                .FirstOrDefaultAsync(m => m.Id == itemId, cancellationToken);

            if (item == null)
                return;

            var content = await targetAccessor.GetContentAsync(
                dbContext, item.TargetType, item.TargetId, cancellationToken);

            if (content == null)
            {
                // Target không tồn tại (đã bị xoá) → không có gì để kiểm duyệt.
                _logger.LogWarning(
                    "Target {TargetType} {TargetId} for ModerationResult {ResultId} not found.",
                    item.TargetType, item.TargetId, item.Id);

                item.Status = ModerationStatus.Rejected;
                item.InternalReasonCode = "target_not_found";
                item.UpdatedAt = DateTime.UtcNow;
                ReleaseLease(item);
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }

            // Target tồn tại nhưng không có text (vd. reel không caption, bài chỉ có ảnh)
            // → duyệt thẳng, không tốn lượt gọi LLM.
            if (string.IsNullOrWhiteSpace(content))
            {
                // Trước khi duyệt thẳng, thử OCR ảnh: story/bài chỉ có ảnh vẫn có thể
                // chứa nội dung vi phạm (đề thi, điểm, căn cước...) (Phase 3.0).
                var ocrOnly = await TryExtractOcrTextAsync(
                    dbContext, item, targetAccessor, ocrService, cancellationToken);

                if (string.IsNullOrWhiteSpace(ocrOnly))
                {
                    _logger.LogInformation(
                        "Target {TargetType} {TargetId} has empty content. Auto-approving.",
                        item.TargetType, item.TargetId);

                    await targetAccessor.ApplyStatusAsync(
                        dbContext,
                        item.TargetType,
                        item.TargetId,
                        ModerationStatus.Approved,
                        DateTime.UtcNow,
                        cancellationToken);

                    item.Status = ModerationStatus.Approved;
                    item.Source = ModerationSource.Rule;
                    item.InternalReasonCode = "empty_content_auto_approve";
                    item.UpdatedAt = DateTime.UtcNow;
                    ReleaseLease(item);

                    await dbContext.SaveChangesAsync(cancellationToken);
                    return;
                }

                // Có OCR text → tiếp tục đi qua pipeline kiểm duyệt text.
                content = ocrOnly;
            }
            else if (ocrService.IsEnabled)
            {
                // Nội dung có sẵn text → vẫn OCR ảnh để không bỏ sót vi phạm trong ảnh.
                var ocrText = await TryExtractOcrTextAsync(
                    dbContext, item, targetAccessor, ocrService, cancellationToken);

                if (!string.IsNullOrWhiteSpace(ocrText))
                    content = $"{content}\n\n[Text extracted from images]\n{ocrText}";
            }

            item.AttemptCount++;
            item.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation(
                "Moderating {TargetType} {TargetId} (Attempt {Attempt}/{MaxAttempts}).",
                item.TargetType, item.TargetId, item.AttemptCount, options.MaxAttempts);

            var decision = await llmModerationService.ModerateAsync(
                content, item.TargetType, item.TargetId, cancellationToken);

            // If fallback/transient error occurred and attempts remain, keep Pending to retry
            if (decision.Source == ModerationSource.Fallback && item.AttemptCount < options.MaxAttempts)
            {
                _logger.LogWarning(
                    "{TargetType} {TargetId} moderation returned fallback ({Reason}). Will retry (Attempt {Attempt}/{MaxAttempts}).",
                    item.TargetType, item.TargetId, decision.InternalReasonCode, item.AttemptCount, options.MaxAttempts);

                item.InternalReasonCode = decision.InternalReasonCode;
                ReleaseLease(item);
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }

            // Final decision reached (or max attempts reached)
            var now = DateTime.UtcNow;

            await targetAccessor.ApplyStatusAsync(
                dbContext,
                item.TargetType,
                item.TargetId,
                decision.Status,
                now,
                cancellationToken);

            item.Status = decision.Status;
            item.Source = decision.Source;
            item.AuthorReason = decision.Reason;
            item.InternalReasonCode = decision.InternalReasonCode;
            item.LlmDecision = decision.LlmDecision;
            item.Severity = decision.Severity;
            item.Confidence = decision.Confidence;
            item.Categories = decision.Categories != null && decision.Categories.Count > 0
                ? string.Join(",", decision.Categories)
                : null;

            // ===== Observability & versioning (3.3 / 3.4) =====
            item.PromptVersion = decision.PromptVersion;
            item.ModelName = decision.ModelName;
            item.RawLlmResponse = decision.RawResponse;
            item.LlmLatencyMs = decision.LatencyMs;
            item.PromptTokens = decision.PromptTokens;
            item.CompletionTokens = decision.CompletionTokens;
            item.TotalTokens = decision.TotalTokens;
            item.EstimatedCostUsd = decision.EstimatedCostUsd;

            // ===== Shadow mode (3.3) =====
            item.ShadowDecision = decision.ShadowDecision;
            item.ShadowStatus = decision.ShadowStatus;
            item.ShadowConfidence = decision.ShadowConfidence;
            item.ShadowSeverity = decision.ShadowSeverity;
            item.ShadowModel = decision.ShadowModel;
            item.ShadowPromptVersion = decision.ShadowPromptVersion;
            item.ShadowAgreesWithPrimary = decision.ShadowAgreesWithPrimary;

            item.UpdatedAt = now;
            ReleaseLease(item);

            await dbContext.SaveChangesAsync(cancellationToken);

            // ===== Bằng chứng media (3.7) =====
            // Snapshot URL media tại thời điểm kiểm duyệt để admin vẫn xem được nội dung
            // gốc kể cả khi tác giả đã xoá bài.
            await SnapshotMediaUrlsAsync(dbContext, item, cancellationToken);

            // ===== Nhật ký quyết định (3.2) =====
            // Ghi lại mọi quyết định để sau này đo được độ chính xác của AI.
            await decisionLogger.LogAsync(
                item,
                decision.Status,
                decision.Source,
                StageForSource(decision.Source),
                note: decision.Reason,
                cancellationToken: cancellationToken);

            // Thông báo cho tác giả khi nội dung bị từ chối hoặc chuyển sang vùng xám.
            // Việc này là best-effort — lỗi thông báo không được ảnh hưởng kết quả kiểm duyệt.
            await NotifyAuthorAsync(notifier, targetAccessor, dbContext, item, decision, cancellationToken);

            _logger.LogInformation(
                "{TargetType} {TargetId} moderation finished: Status={Status}, Source={Source}, Code={ReasonCode}",
                item.TargetType, item.TargetId, decision.Status, decision.Source, decision.InternalReasonCode);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing moderation item {ResultId} for target {TargetId}.", itemId, item?.TargetId);

            // Đảm bảo bản ghi không bị bỏ mồ côi ở trạng thái Pending: nếu đã hết lượt
            // thử thì chuyển sang NeedsReview để admin xử lý thủ công.
            await MarkAsNeedsReviewAsync(dbContext, itemId, options, cancellationToken);
        }
    }

    /// <summary>
    /// Thử OCR ảnh của nội dung và lưu kết quả vào bản ghi kiểm duyệt (Phase 3.0).
    ///
    /// Best-effort: lỗi OCR không được ảnh hưởng kết quả kiểm duyệt.
    /// Trả về text OCR (rỗng nếu không có).
    /// </summary>
    private async Task<string> TryExtractOcrTextAsync(
        PostDbContext dbContext,
        ModerationResult item,
        IModerationTargetAccessor targetAccessor,
        IOcrService ocrService,
        CancellationToken cancellationToken)
    {
        if (!ocrService.IsEnabled)
            return string.Empty;

        try
        {
            var urls = await targetAccessor.GetMediaUrlsAsync(
                dbContext, item.TargetType, item.TargetId, cancellationToken);

            if (urls.Count == 0)
                return string.Empty;

            var text = await ocrService.ExtractTextFromImagesAsync(urls, cancellationToken);

            if (string.IsNullOrWhiteSpace(text))
                return string.Empty;

            item.OcrText = text;
            await dbContext.SaveChangesAsync(cancellationToken);

            return text;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to extract OCR text for moderation item {ResultId}.", item.Id);
            return string.Empty;
        }
    }

    /// <summary>
    /// Giai đoạn sinh ra quyết định — dùng để lọc nhật ký theo nguồn.
    /// </summary>
    private static string StageForSource(ModerationSource source) => source switch
    {
        ModerationSource.Rule => "rule",
        ModerationSource.Llm => "llm",
        ModerationSource.Human => "admin",
        ModerationSource.Fallback => "system",
        _ => "system"
    };

    /// <summary>
    /// Lưu snapshot URL media của nội dung vào bản ghi kiểm duyệt (3.7).
    ///
    /// Vì sao cần: khi tác giả xoá bài, media trên Cloudinary cũng bị xoá → admin
    /// không còn gì để xác minh khi tác giả khiếu nại. Snapshot giữ lại đường dẫn
    /// gốc tại thời điểm kiểm duyệt.
    ///
    /// Best-effort: lỗi không được ảnh hưởng kết quả kiểm duyệt.
    /// </summary>
    private async Task SnapshotMediaUrlsAsync(
        PostDbContext dbContext,
        ModerationResult item,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(item.TargetMediaUrlsSnapshot))
            return;

        try
        {
            var targetAccessor = _serviceScopeFactory.CreateScope()
                .ServiceProvider.GetRequiredService<IModerationTargetAccessor>();

            var urls = await targetAccessor.GetMediaUrlsAsync(
                dbContext, item.TargetType, item.TargetId, cancellationToken);

            if (urls.Count == 0)
                return;

            item.TargetMediaUrlsSnapshot = string.Join(",", urls);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to snapshot media urls for moderation item {ResultId}.", item.Id);
        }
    }

    /// <summary>
    /// Gửi thông báo cho tác giả khi nội dung bị từ chối hoặc vào vùng xám.
    /// Nội dung được duyệt thì không cần báo — tác giả tự thấy nó hiện lên feed.
    /// </summary>
    private async Task NotifyAuthorAsync(
        IContentModerationNotifier notifier,
        IModerationTargetAccessor targetAccessor,
        PostDbContext dbContext,
        ModerationResult item,
        ModerationDecisionResult decision,
        CancellationToken cancellationToken)
    {
        if (decision.Status != ModerationStatus.Rejected && decision.Status != ModerationStatus.NeedsReview)
            return;

        var authorId = await targetAccessor.GetAuthorIdAsync(
            dbContext, item.TargetType, item.TargetId, cancellationToken);

        if (authorId == null || authorId.Value == Guid.Empty)
            return;

        if (decision.Status == ModerationStatus.Rejected)
        {
            await notifier.NotifyRejectedAsync(
                authorId.Value, item.TargetId, item.TargetType, decision.Reason, cancellationToken);
        }
        else
        {
            await notifier.NotifyNeedsReviewAsync(
                authorId.Value, item.TargetId, item.TargetType, decision.Reason, cancellationToken);
        }
    }

    /// <summary>
    /// Chuyển bản ghi lỗi sang NeedsReview khi đã hết lượt thử — tránh việc nó bị
    /// bỏ mồ côi trong hàng đợi (điều kiện query yêu cầu AttemptCount &lt; MaxAttempts).
    /// </summary>
    private async Task MarkAsNeedsReviewAsync(
        PostDbContext dbContext,
        Guid itemId,
        ModerationOptions options,
        CancellationToken cancellationToken)
    {
        try
        {
            var item = await dbContext.ModerationResults
                .FirstOrDefaultAsync(m => m.Id == itemId, cancellationToken);

            if (item == null || item.Status != ModerationStatus.Pending)
                return;

            if (item.AttemptCount < options.MaxAttempts)
            {
                // Còn lượt thử → giữ Pending, chỉ nhả lease để vòng sau xử lý lại.
                ReleaseLease(item);
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }

            item.Status = ModerationStatus.NeedsReview;
            item.Source = ModerationSource.Fallback;
            item.InternalReasonCode = "worker_error_max_attempts";
            item.AuthorReason = null;
            item.UpdatedAt = DateTime.UtcNow;
            ReleaseLease(item);

            await dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogWarning(
                "Moderation item {ResultId} moved to NeedsReview after {Attempts} attempts.",
                itemId, item.AttemptCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking moderation item {ResultId} as NeedsReview.", itemId);
        }
    }

    /// <summary>
    /// Nhả lease để bản ghi có thể được xử lý lại (nếu vẫn ở trạng thái Pending).
    /// </summary>
    private void ReleaseLease(ModerationResult item)
    {
        if (item.WorkerId != _workerId)
            return;

        item.LeaseExpiresAt = null;
        item.WorkerId = null;
    }
}
