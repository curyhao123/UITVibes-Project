using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.Models;

namespace PostService.Messaging.SearchIndex;

/// <summary>
/// Bắt mọi thay đổi Post/Reel ảnh hưởng tới search ở một chỗ duy nhất, thay vì sửa từng service.
/// </summary>
public class SearchIndexChangeInterceptor : SaveChangesInterceptor
{
    private static readonly string[] PostFields =
        [nameof(Post.ModerationStatus), nameof(Post.Visibility), nameof(Post.IsDeleted), nameof(Post.Content)];

    private static readonly string[] ReelFields =
        [nameof(Reel.ModerationStatus), nameof(Reel.Caption)];

    private readonly ISearchIndexPublisher? _publisher;
    private readonly ConditionalWeakTable<DbContext, List<(Guid Id, ModerationTargetType Type)>> _pending = new();

    public SearchIndexChangeInterceptor(ISearchIndexPublisher? publisher = null)
    {
        _publisher = publisher;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Collect(eventData.Context);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Collect(eventData.Context);
        return ValueTask.FromResult(result);
    }

    // PostService không gọi SaveChanges đồng bộ; nếu có thì chờ đồng bộ, tối đa bằng timeout của publisher.
    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        PublishAsync(eventData.Context, CancellationToken.None).GetAwaiter().GetResult();
        return result;
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        await PublishAsync(eventData.Context, cancellationToken);
        return result;
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) => Discard(eventData.Context);

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        Discard(eventData.Context);
        return Task.CompletedTask;
    }

    private void Collect(DbContext? context)
    {
        if (context is null) return;

        var changes = new List<(Guid, ModerationTargetType)>();
        foreach (var entry in context.ChangeTracker.Entries())
        {
            switch (entry.Entity)
            {
                case Post post when IsRelevant(entry, PostFields):
                    changes.Add((post.Id, ModerationTargetType.Post));
                    break;
                case Reel reel when IsRelevant(entry, ReelFields):
                    changes.Add((reel.Id, ModerationTargetType.Reel));
                    break;
            }
        }

        if (changes.Count == 0) return;
        _pending.AddOrUpdate(context, changes);
    }

    private async Task PublishAsync(DbContext? context, CancellationToken ct)
    {
        if (context is null || !_pending.TryGetValue(context, out var changes)) return;
        _pending.Remove(context);

        var publisher = _publisher ?? ResolvePublisher(context);
        if (publisher is null) return;

        var now = DateTime.UtcNow;
        var events = changes.Distinct()
            .Select(c => new SearchIndexRequestedEvent(c.Id, c.Type.ToString(), now))
            .ToList();
        await publisher.PublishAsync(events, ct);
    }

    private static ISearchIndexPublisher? ResolvePublisher(DbContext context)
    {
        try
        {
            return context.GetService<ISearchIndexPublisher>();
        }
        catch (InvalidOperationException)
        {
            return null;
        }
    }

    private void Discard(DbContext? context)
    {
        if (context is not null) _pending.Remove(context);
    }

    private static bool IsRelevant(EntityEntry entry, string[] fields) => entry.State switch
    {
        EntityState.Added or EntityState.Deleted => true,
        EntityState.Modified => fields.Any(f => entry.Property(f).IsModified),
        _ => false
    };
}
