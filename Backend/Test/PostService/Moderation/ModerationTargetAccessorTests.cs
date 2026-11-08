using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PostService.Enums;
using PostService.Models;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho <see cref="ModerationTargetAccessor"/> — lớp trừu tượng hoá
/// việc đọc/ghi trạng thái kiểm duyệt cho Post, Comment và Reel.
///
/// Hành vi cần bảo vệ:
///   1. GetContent trả về text đúng theo từng loại target; reel không caption → chuỗi rỗng.
///   2. ApplyStatus gán trạng thái lên đúng entity; target không tồn tại → false.
///   3. GetAuthorId trả về đúng tác giả cho cả 3 loại.
/// </summary>
public class ModerationTargetAccessorTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly ModerationTargetAccessor _accessor;

    public ModerationTargetAccessorTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        _accessor = new ModerationTargetAccessor();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task GetContentAsync_ForEachTargetType_ReturnsCorrespondingText()
    {
        var post = await SeedPostAsync("nội dung bài");
        var comment = await SeedCommentAsync(post.Id, "nội dung bình luận");
        var reel = await SeedReelAsync("caption của reel");

        Assert.Equal("nội dung bài",
            await _accessor.GetContentAsync(_context, ModerationTargetType.Post, post.Id));
        Assert.Equal("nội dung bình luận",
            await _accessor.GetContentAsync(_context, ModerationTargetType.Comment, comment.Id));
        Assert.Equal("caption của reel",
            await _accessor.GetContentAsync(_context, ModerationTargetType.Reel, reel.Id));
    }

    [Fact]
    public async Task GetContentAsync_WhenReelHasNoCaption_ReturnsEmptyString()
    {
        var reel = await SeedReelAsync(caption: null);

        var content = await _accessor.GetContentAsync(
            _context, ModerationTargetType.Reel, reel.Id);

        Assert.NotNull(content);
        Assert.Equal(string.Empty, content);
    }

    [Fact]
    public async Task GetContentAsync_WhenTargetDoesNotExist_ReturnsNull()
    {
        var content = await _accessor.GetContentAsync(
            _context, ModerationTargetType.Post, Guid.NewGuid());

        Assert.Null(content);
    }

    [Fact]
    public async Task ApplyStatusAsync_UpdatesTheMatchingEntityOnly()
    {
        var post = await SeedPostAsync("bài");
        var comment = await SeedCommentAsync(post.Id, "bình luận");
        var reel = await SeedReelAsync("reel");

        var now = DateTime.UtcNow;

        Assert.True(await _accessor.ApplyStatusAsync(
            _context, ModerationTargetType.Comment, comment.Id, ModerationStatus.Rejected, now));

        Assert.Equal(ModerationStatus.Rejected,
            (await _context.Comments.FirstAsync(c => c.Id == comment.Id)).ModerationStatus);

        // Post và reel không bị ảnh hưởng.
        Assert.Equal(ModerationStatus.Pending,
            (await _context.Posts.FirstAsync(p => p.Id == post.Id)).ModerationStatus);
        Assert.Equal(ModerationStatus.Pending,
            (await _context.Reels.FirstAsync(r => r.Id == reel.Id)).ModerationStatus);
    }

    [Fact]
    public async Task ApplyStatusAsync_WhenTargetDoesNotExist_ReturnsFalse()
    {
        var applied = await _accessor.ApplyStatusAsync(
            _context, ModerationTargetType.Reel, Guid.NewGuid(), ModerationStatus.Approved, DateTime.UtcNow);

        Assert.False(applied);
    }

    [Fact]
    public async Task GetAuthorIdAsync_ReturnsAuthorForEachTargetType()
    {
        var authorId = Guid.NewGuid();

        var post = await SeedPostAsync("bài", authorId);
        var comment = await SeedCommentAsync(post.Id, "bình luận", authorId);
        var reel = await SeedReelAsync("reel", authorId);

        Assert.Equal(authorId,
            await _accessor.GetAuthorIdAsync(_context, ModerationTargetType.Post, post.Id));
        Assert.Equal(authorId,
            await _accessor.GetAuthorIdAsync(_context, ModerationTargetType.Comment, comment.Id));
        Assert.Equal(authorId,
            await _accessor.GetAuthorIdAsync(_context, ModerationTargetType.Reel, reel.Id));
    }

    // ── ReelComment (Phase 3.0) ──────────────────────────────────────────────

    [Fact]
    public async Task GetContentAsync_ForReelComment_ReturnsCommentText()
    {
        var reel = await SeedReelAsync("reel");
        var comment = await SeedReelCommentAsync(reel.Id, "bình luận reel");

        var content = await _accessor.GetContentAsync(
            _context, ModerationTargetType.ReelComment, comment.Id);

        Assert.Equal("bình luận reel", content);
    }

    [Fact]
    public async Task ApplyStatusAsync_ForReelComment_UpdatesReelCommentOnly()
    {
        var reel = await SeedReelAsync("reel");
        var comment = await SeedReelCommentAsync(reel.Id, "bình luận reel");

        var applied = await _accessor.ApplyStatusAsync(
            _context, ModerationTargetType.ReelComment, comment.Id,
            ModerationStatus.Rejected, DateTime.UtcNow);

        Assert.True(applied);
        Assert.Equal(ModerationStatus.Rejected,
            (await _context.ReelComments.FirstAsync(c => c.Id == comment.Id)).ModerationStatus);

        // Reel chứa bình luận không bị ảnh hưởng.
        Assert.Equal(ModerationStatus.Pending,
            (await _context.Reels.FirstAsync(r => r.Id == reel.Id)).ModerationStatus);
    }

    [Fact]
    public async Task GetAuthorIdAsync_ForReelComment_ReturnsCommentAuthor()
    {
        var authorId = Guid.NewGuid();
        var reel = await SeedReelAsync("reel");
        var comment = await SeedReelCommentAsync(reel.Id, "bình luận", authorId);

        Assert.Equal(authorId,
            await _accessor.GetAuthorIdAsync(_context, ModerationTargetType.ReelComment, comment.Id));
    }

    // ── Story (Phase 3.0) ────────────────────────────────────────────────────

    [Fact]
    public async Task GetContentAsync_ForStory_ReturnsEmptyStringSoWorkerCanOcr()
    {
        var group = await SeedStoryGroupAsync();
        var item = await SeedStoryItemAsync(group.Id);

        var content = await _accessor.GetContentAsync(
            _context, ModerationTargetType.Story, item.Id);

        Assert.NotNull(content);
        Assert.Equal(string.Empty, content);
    }

    [Fact]
    public async Task ApplyStatusAsync_ForStory_UpdatesStoryItem()
    {
        var group = await SeedStoryGroupAsync();
        var item = await SeedStoryItemAsync(group.Id);

        var applied = await _accessor.ApplyStatusAsync(
            _context, ModerationTargetType.Story, item.Id,
            ModerationStatus.Approved, DateTime.UtcNow);

        Assert.True(applied);
        Assert.Equal(ModerationStatus.Approved,
            (await _context.StoryItems.FirstAsync(i => i.Id == item.Id)).ModerationStatus);
    }

    [Fact]
    public async Task GetAuthorIdAsync_ForStory_ReturnsStoryOwner()
    {
        var ownerId = Guid.NewGuid();
        var group = await SeedStoryGroupAsync(ownerId);
        var item = await SeedStoryItemAsync(group.Id);

        Assert.Equal(ownerId,
            await _accessor.GetAuthorIdAsync(_context, ModerationTargetType.Story, item.Id));
    }

    [Fact]
    public async Task GetMediaUrlsAsync_ForStory_ReturnsItemUrl()
    {
        var group = await SeedStoryGroupAsync();
        var item = await SeedStoryItemAsync(group.Id);

        var urls = await _accessor.GetMediaUrlsAsync(
            _context, ModerationTargetType.Story, item.Id);

        Assert.Equal(new[] { "https://example.com/story.jpg" }, urls);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Post> SeedPostAsync(string content, Guid? authorId = null)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = authorId ?? Guid.NewGuid(),
            Content = content,
            Visibility = PostVisibility.Public,
            PostType = PostType.Original,
            ModerationStatus = ModerationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        return post;
    }

    private async Task<Comment> SeedCommentAsync(Guid postId, string content, Guid? authorId = null)
    {
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            UserId = authorId ?? Guid.NewGuid(),
            Content = content,
            ModerationStatus = ModerationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Comments.Add(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    private async Task<Reel> SeedReelAsync(string? caption, Guid? authorId = null)
    {
        var reel = new Reel
        {
            Id = Guid.NewGuid(),
            UserId = authorId ?? Guid.NewGuid(),
            VideoUrl = "https://example.com/video.mp4",
            VideoPublicId = "video_public_id",
            Caption = caption,
            ModerationStatus = ModerationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Reels.Add(reel);
        await _context.SaveChangesAsync();
        return reel;
    }

    private async Task<ReelComment> SeedReelCommentAsync(Guid reelId, string content, Guid? authorId = null)
    {
        var comment = new ReelComment
        {
            Id = Guid.NewGuid(),
            ReelId = reelId,
            UserId = authorId ?? Guid.NewGuid(),
            Content = content,
            ModerationStatus = ModerationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        };

        _context.ReelComments.Add(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    private async Task<StoryGroup> SeedStoryGroupAsync(Guid? ownerId = null)
    {
        var group = new StoryGroup
        {
            Id = Guid.NewGuid(),
            UserId = ownerId ?? Guid.NewGuid(),
            OwnerDisplayName = "Người dùng",
            OwnerAvatarUrl = "https://example.com/avatar.jpg",
            ExpiresAt = DateTime.UtcNow.AddHours(24),
            CreatedAt = DateTime.UtcNow,
        };

        _context.StoryGroups.Add(group);
        await _context.SaveChangesAsync();
        return group;
    }

    private async Task<StoryItem> SeedStoryItemAsync(Guid groupId)
    {
        var item = new StoryItem
        {
            Id = Guid.NewGuid(),
            StoryGroupId = groupId,
            Type = MediaType.Image,
            Url = "https://example.com/story.jpg",
            DisplayOrder = 0,
            CreatedAt = DateTime.UtcNow,
            ModerationStatus = ModerationStatus.Pending,
        };

        _context.StoryItems.Add(item);
        await _context.SaveChangesAsync();
        return item;
    }
}
