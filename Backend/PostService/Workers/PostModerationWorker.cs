using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PostService.Configurations;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.Workers;

public class PostModerationWorker : BackgroundService
{
    private readonly ILogger<PostModerationWorker> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly IOptions<ModerationOptions> _moderationOptions;

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
        _logger.LogInformation("PostModerationWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _moderationOptions.Value;

            if (!options.Enabled)
            {
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

    private async Task<int> ProcessPendingBatchAsync(ModerationOptions options, CancellationToken cancellationToken)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<PostDbContext>();
        var llmModerationService = scope.ServiceProvider.GetRequiredService<ILlmModerationService>();

        var pendingItems = await dbContext.ModerationResults
            .Where(m => m.TargetType == ModerationTargetType.Post
                     && m.Status == ModerationStatus.Pending
                     && m.AttemptCount < options.MaxAttempts)
            .OrderBy(m => m.CreatedAt)
            .Take(options.BatchSize)
            .ToListAsync(cancellationToken);

        if (pendingItems.Count == 0)
        {
            return 0;
        }

        _logger.LogInformation("Processing batch of {Count} pending post moderation tasks.", pendingItems.Count);

        foreach (var item in pendingItems)
        {
            if (cancellationToken.IsCancellationRequested)
                break;

            await ProcessItemAsync(item, dbContext, llmModerationService, options, cancellationToken);
        }

        return pendingItems.Count;
    }

    private async Task ProcessItemAsync(
        ModerationResult item,
        PostDbContext dbContext,
        ILlmModerationService llmModerationService,
        ModerationOptions options,
        CancellationToken cancellationToken)
    {
        try
        {
            var post = await dbContext.Posts
                .FirstOrDefaultAsync(p => p.Id == item.TargetId, cancellationToken);

            if (post == null)
            {
                _logger.LogWarning("Post {PostId} for ModerationResult {ResultId} not found.", item.TargetId, item.Id);
                item.Status = ModerationStatus.Rejected;
                item.InternalReasonCode = "target_post_not_found";
                item.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }

            // If post has no text content (e.g. image-only post), auto-approve
            if (string.IsNullOrWhiteSpace(post.Content))
            {
                _logger.LogInformation("Post {PostId} has empty content. Auto-approving.", post.Id);

                post.ModerationStatus = ModerationStatus.Approved;
                post.ModeratedAt = DateTime.UtcNow;

                item.Status = ModerationStatus.Approved;
                item.Source = ModerationSource.Rule;
                item.InternalReasonCode = "empty_content_auto_approve";
                item.UpdatedAt = DateTime.UtcNow;

                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }

            item.AttemptCount++;
            item.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation("Moderating Post {PostId} (Attempt {Attempt}/{MaxAttempts}).",
                post.Id, item.AttemptCount, options.MaxAttempts);

            var decision = await llmModerationService.ModerateAsync(post.Content, ModerationTargetType.Post, cancellationToken);

            // If fallback/transient error occurred and attempts remain, keep Pending to retry
            if (decision.Source == ModerationSource.Fallback && item.AttemptCount < options.MaxAttempts)
            {
                _logger.LogWarning(
                    "Post {PostId} moderation returned fallback ({Reason}). Will retry (Attempt {Attempt}/{MaxAttempts}).",
                    post.Id, decision.InternalReasonCode, item.AttemptCount, options.MaxAttempts);

                item.InternalReasonCode = decision.InternalReasonCode;
                await dbContext.SaveChangesAsync(cancellationToken);
                return;
            }

            // Final decision reached (or max attempts reached)
            post.ModerationStatus = decision.Status;
            post.ModeratedAt = DateTime.UtcNow;

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

            await dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Post {PostId} moderation finished: Status={Status}, Source={Source}, Code={ReasonCode}",
                post.Id, decision.Status, decision.Source, decision.InternalReasonCode);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing moderation item {ResultId} for Post {PostId}.", item.Id, item.TargetId);
        }
    }
}