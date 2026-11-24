using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public class SearchDocumentService : ISearchDocumentService
{
    public const int MaxExportLimit = 200;

    private static readonly Expression<Func<Post, bool>> SearchablePost = p =>
        !p.IsDeleted
        && p.PostType == PostType.Original
        && p.ModerationStatus == ModerationStatus.Approved
        && (p.Visibility == PostVisibility.Public || p.Visibility == PostVisibility.Followers);

    private static readonly Expression<Func<Reel, bool>> SearchableReel = r =>
        r.ModerationStatus == ModerationStatus.Approved;

    private readonly PostDbContext _context;

    public SearchDocumentService(PostDbContext context)
    {
        _context = context;
    }

    public async Task<SearchPostDocument?> GetAsync(
        ModerationTargetType targetType, Guid targetId, CancellationToken ct = default)
    {
        var docs = targetType switch
        {
            ModerationTargetType.Post => await LoadPostsAsync(
                _context.Posts.Where(p => p.Id == targetId), SearchablePost.Compile(), ct),
            ModerationTargetType.Reel => await LoadReelsAsync(
                _context.Reels.Where(r => r.Id == targetId), SearchableReel.Compile(), ct),
            _ => []
        };
        return docs.FirstOrDefault();
    }

    public async Task<SearchPostExportRpcResponse> ExportAsync(
        ModerationTargetType targetType, DateTime? afterCreatedAt, Guid? afterId, int limit, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, MaxExportLimit);
        var after = afterCreatedAt ?? DateTime.MinValue;
        var afterKey = afterId ?? Guid.Empty;

        List<SearchPostDocument> docs = targetType switch
        {
            ModerationTargetType.Post => await LoadPostsAsync(
                _context.Posts.Where(SearchablePost)
                    .Where(p => p.CreatedAt > after || (p.CreatedAt == after && p.Id.CompareTo(afterKey) > 0))
                    .OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)
                    .Take(limit + 1),
                _ => true, ct),
            ModerationTargetType.Reel => await LoadReelsAsync(
                _context.Reels.Where(SearchableReel)
                    .Where(r => r.CreatedAt > after || (r.CreatedAt == after && r.Id.CompareTo(afterKey) > 0))
                    .OrderBy(r => r.CreatedAt).ThenBy(r => r.Id)
                    .Take(limit + 1),
                _ => true, ct),
            _ => []
        };

        var hasMore = docs.Count > limit;
        return new SearchPostExportRpcResponse { Items = docs.Take(limit).ToList(), HasMore = hasMore };
    }

    private async Task<List<SearchPostDocument>> LoadPostsAsync(
        IQueryable<Post> query, Func<Post, bool> isSearchable, CancellationToken ct)
    {
        var posts = await query.AsNoTracking()
            .Include(p => p.Hashtags).ThenInclude(h => h.Hashtag)
            .ToListAsync(ct);
        var ocr = await LoadOcrAsync(ModerationTargetType.Post, posts.Select(p => p.Id).ToList(), ct);

        return posts.Select(p => new SearchPostDocument
        {
            TargetId = p.Id,
            TargetType = ModerationTargetType.Post.ToString(),
            AuthorId = p.UserId,
            Content = p.Content,
            OcrText = ocr.GetValueOrDefault(p.Id),
            Hashtags = p.Hashtags.Select(h => h.Hashtag.Name).ToList(),
            Visibility = (int)p.Visibility,
            Searchable = isSearchable(p),
            CreatedAt = p.CreatedAt
        }).ToList();
    }

    private async Task<List<SearchPostDocument>> LoadReelsAsync(
        IQueryable<Reel> query, Func<Reel, bool> isSearchable, CancellationToken ct)
    {
        var reels = await query.AsNoTracking().ToListAsync(ct);
        var ocr = await LoadOcrAsync(ModerationTargetType.Reel, reels.Select(r => r.Id).ToList(), ct);

        return reels.Select(r => new SearchPostDocument
        {
            TargetId = r.Id,
            TargetType = ModerationTargetType.Reel.ToString(),
            AuthorId = r.UserId,
            Content = r.Caption ?? string.Empty,
            OcrText = ocr.GetValueOrDefault(r.Id),
            Visibility = (int)PostVisibility.Public,
            Searchable = isSearchable(r),
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    private async Task<Dictionary<Guid, string?>> LoadOcrAsync(
        ModerationTargetType targetType, List<Guid> ids, CancellationToken ct)
    {
        if (ids.Count == 0) return [];
        var rows = await _context.ModerationResults.AsNoTracking()
            .Where(m => m.TargetType == targetType && ids.Contains(m.TargetId) && m.OcrText != null)
            .Select(m => new { m.TargetId, m.OcrText, m.UpdatedAt })
            .ToListAsync(ct);
        return rows.GroupBy(r => r.TargetId)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(r => r.UpdatedAt).First().OcrText);
    }
}
