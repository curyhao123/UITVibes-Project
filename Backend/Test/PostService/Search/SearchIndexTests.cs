using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.Messaging.SearchIndex;
using PostService.Models;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Search;

public class SearchIndexTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly FakeSearchIndexPublisher _publisher = new();
    private readonly PostDbContext _context;

    public SearchIndexTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(new SearchIndexChangeInterceptor(_publisher))
            .Options;
        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    private List<SearchIndexRequestedEvent> Drain()
    {
        var events = _publisher.Published.ToList();
        _publisher.Published.Clear();
        return events;
    }

    private Post NewPost(string content = "Lịch thi cuối kỳ") => new()
    {
        Id = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        Content = content,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    private Reel NewReel(string? caption = "Review môn học") => new()
    {
        Id = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        VideoUrl = "https://example.test/v.mp4",
        VideoPublicId = "v",
        Caption = caption
    };

    [Fact]
    public async Task Interceptor_AddedPost_EnqueuesOneEvent()
    {
        var post = NewPost();
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        var evt = Assert.Single(Drain());
        Assert.Equal(post.Id, evt.TargetId);
        Assert.Equal("Post", evt.TargetType);
    }

    [Theory]
    [InlineData(nameof(Post.ModerationStatus))]
    [InlineData(nameof(Post.Visibility))]
    [InlineData(nameof(Post.IsDeleted))]
    [InlineData(nameof(Post.Content))]
    public async Task Interceptor_RelevantPostChange_Enqueues(string field)
    {
        var post = NewPost();
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        Drain();

        switch (field)
        {
            case nameof(Post.ModerationStatus): post.ModerationStatus = ModerationStatus.Approved; break;
            case nameof(Post.Visibility): post.Visibility = PostVisibility.Private; break;
            case nameof(Post.IsDeleted): post.IsDeleted = true; break;
            default: post.Content = "Nội dung mới"; break;
        }
        await _context.SaveChangesAsync();

        Assert.Equal(post.Id, Assert.Single(Drain()).TargetId);
    }

    [Fact]
    public async Task Interceptor_CounterChange_DoesNotEnqueue()
    {
        var post = NewPost();
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        Drain();

        post.LikesCount++;
        post.ViewsCount++;
        await _context.SaveChangesAsync();

        Assert.Empty(Drain());
    }

    [Fact]
    public async Task Interceptor_ReelApprovedAndDeleted_Enqueues()
    {
        var reel = NewReel();
        _context.Reels.Add(reel);
        await _context.SaveChangesAsync();
        Drain();

        reel.ModerationStatus = ModerationStatus.Approved;
        await _context.SaveChangesAsync();
        _context.Reels.Remove(reel);
        await _context.SaveChangesAsync();

        var events = Drain();
        Assert.Equal(2, events.Count);
        Assert.All(events, e => Assert.Equal("Reel", e.TargetType));
    }

    [Fact]
    public async Task Interceptor_FailedSave_DoesNotEnqueue()
    {
        var post = NewPost();
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        Drain();

        _context.ChangeTracker.Clear();
        _context.Posts.Add(new Post { Id = post.Id, UserId = post.UserId, Content = "trùng khoá" });
        await Assert.ThrowsAnyAsync<DbUpdateException>(() => _context.SaveChangesAsync());

        Assert.Empty(Drain());
    }

    [Fact]
    public async Task DocumentService_Get_ReturnsContentHashtagsOcr_AndSearchableFlag()
    {
        var post = NewPost("Lịch thi #uit");
        post.ModerationStatus = ModerationStatus.Approved;
        post.Visibility = PostVisibility.Followers;
        var tag = new Hashtag { Id = Guid.NewGuid(), Name = "uit", NormalizedName = "uit", CreatedAt = DateTime.UtcNow, LastUsedAt = DateTime.UtcNow };
        _context.Posts.Add(post);
        _context.Add(tag);
        _context.Add(new PostHashtag { PostId = post.Id, HashtagId = tag.Id, CreatedAt = DateTime.UtcNow });
        _context.ModerationResults.Add(new ModerationResult
        {
            Id = Guid.NewGuid(),
            TargetId = post.Id,
            TargetType = ModerationTargetType.Post,
            Status = ModerationStatus.Approved,
            OcrText = "PHÒNG ĐÀO TẠO",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var doc = await new SearchDocumentService(_context).GetAsync(ModerationTargetType.Post, post.Id);

        Assert.NotNull(doc);
        Assert.True(doc!.Searchable);
        Assert.Equal(["uit"], doc.Hashtags);
        Assert.Equal("PHÒNG ĐÀO TẠO", doc.OcrText);
        Assert.Equal((int)PostVisibility.Followers, doc.Visibility);
    }

    [Theory]
    [InlineData(ModerationStatus.Pending, PostVisibility.Public, false)]
    [InlineData(ModerationStatus.Approved, PostVisibility.Private, false)]
    [InlineData(ModerationStatus.Approved, PostVisibility.Hidden, false)]
    [InlineData(ModerationStatus.Rejected, PostVisibility.Public, false)]
    [InlineData(ModerationStatus.Approved, PostVisibility.Public, true)]
    public async Task DocumentService_Get_SearchableRule(ModerationStatus status, PostVisibility visibility, bool expected)
    {
        var post = NewPost();
        post.ModerationStatus = status;
        post.Visibility = visibility;
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        var doc = await new SearchDocumentService(_context).GetAsync(ModerationTargetType.Post, post.Id);

        Assert.Equal(expected, doc!.Searchable);
    }

    [Fact]
    public async Task DocumentService_Export_ReturnsOnlySearchable_InKeysetPages()
    {
        var baseTime = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc);
        var approved = Enumerable.Range(0, 3).Select(i =>
        {
            var p = NewPost($"bài {i}");
            p.ModerationStatus = ModerationStatus.Approved;
            p.CreatedAt = baseTime.AddMinutes(i);
            return p;
        }).ToList();
        var pending = NewPost("chưa duyệt");
        var deleted = NewPost("đã xoá");
        deleted.ModerationStatus = ModerationStatus.Approved;
        deleted.IsDeleted = true;
        _context.Posts.AddRange(approved);
        _context.Posts.AddRange(pending, deleted);
        await _context.SaveChangesAsync();
        var service = new SearchDocumentService(_context);

        var page1 = await service.ExportAsync(ModerationTargetType.Post, null, null, 2);
        var last = page1.Items[^1];
        var page2 = await service.ExportAsync(ModerationTargetType.Post, last.CreatedAt, last.TargetId, 2);

        Assert.True(page1.HasMore);
        Assert.False(page2.HasMore);
        Assert.Equal(approved.Select(p => p.Id), page1.Items.Concat(page2.Items).Select(d => d.TargetId));
        Assert.All(page1.Items.Concat(page2.Items), d => Assert.True(d.Searchable));
    }

    [Fact]
    public async Task Interceptor_WithoutExplicitPublisher_ResolvesItFromApplicationServices()
    {
        var services = new ServiceCollection();
        services.AddSingleton<ISearchIndexPublisher>(_publisher);
        services.AddDbContextPool<PostDbContext>(o => o
            .UseSqlite(_connection)
            .AddInterceptors(new SearchIndexChangeInterceptor()));
        await using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<PostDbContext>();

        var post = NewPost();
        context.Posts.Add(post);
        await context.SaveChangesAsync();

        Assert.Equal(post.Id, Assert.Single(Drain()).TargetId);
    }

    [Fact]
    public async Task Interceptor_SeveralChangesInOneSave_PublishesOnceDeduplicated()
    {
        var post = NewPost();
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        Drain();
        var callsBefore = _publisher.Calls;

        post.Content = "mới";
        post.ModerationStatus = ModerationStatus.Approved;
        _context.Posts.Add(NewPost());
        await _context.SaveChangesAsync();

        Assert.Equal(callsBefore + 1, _publisher.Calls);
        Assert.Equal(2, Drain().Count);
    }

    private sealed class FakeSearchIndexPublisher : ISearchIndexPublisher
    {
        public List<SearchIndexRequestedEvent> Published { get; } = [];
        public int Calls { get; private set; }

        public Task PublishAsync(IReadOnlyCollection<SearchIndexRequestedEvent> events, CancellationToken ct = default)
        {
            Calls++;
            Published.AddRange(events);
            return Task.CompletedTask;
        }
    }
}
