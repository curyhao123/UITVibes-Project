using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PostService.DTOs;
using PostService.Enums;
using PostService.Messaging.Interface;
using PostService.Models;
using PostService.ServiceLayer.Implementation;
using PostService.ServiceLayer.Interface;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho UpdatePostAsync — luồng "resubmit" của tác giả.
///
/// Hành vi cần bảo vệ:
///   1. Sửa nội dung → bài quay về Pending và bản ghi kiểm duyệt được reset.
///   2. Sửa mà nội dung KHÔNG đổi → không reset trạng thái kiểm duyệt.
///   3. Sửa bài không gửi Visibility/Location → giữ nguyên giá trị cũ.
///   4. Chỉ tác giả mới được sửa bài của mình.
/// </summary>
public class PostServiceUpdateTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly PostDbContext _context;
    private readonly global::PostService.ServiceLayer.Implementation.PostService _postService;
    private readonly Mock<IModerationEnqueuer> _moderationEnqueuer;

    public PostServiceUpdateTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<PostDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new PostDbContext(options);
        _context.Database.EnsureCreated();

        // ModerationEnqueuer thật sẽ ghi DB — ở đây chỉ cần quan sát hành vi gọi.
        _moderationEnqueuer = new Mock<IModerationEnqueuer>();
        _moderationEnqueuer
            .Setup(e => e.ResubmitAsync(
                It.IsAny<ModerationTargetType>(),
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<Action<ModerationStatus>>(),
                It.IsAny<CancellationToken>()))
            .Callback<ModerationTargetType, Guid, string?, Action<ModerationStatus>, CancellationToken>(
                (_, _, _, applyStatus, _) => applyStatus?.Invoke(ModerationStatus.Pending));

        _postService = new global::PostService.ServiceLayer.Implementation.PostService(
            _context,
            Mock.Of<ICloudinaryService>(),
            Mock.Of<IUserFollowRpcClient>(),
            NullLogger<global::PostService.ServiceLayer.Implementation.PostService>.Instance,
            Mock.Of<IPostLikedPublisher>(),
            Mock.Of<IUserProfileRpcClient>(),
            Mock.Of<IRepostService>(),
            Mock.Of<IPostMentionedPublisher>(),
            _moderationEnqueuer.Object,
            Mock.Of<IModerationReportService>());
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdatePostAsync_WhenContentChanged_ResubmitsForModeration()
    {
        var post = await SeedPostAsync(content: "Nội dung cũ", status: ModerationStatus.Rejected);

        await _postService.UpdatePostAsync(post.Id, post.UserId, new UpdatePostRequest
        {
            Content = "Nội dung đã sửa"
        });

        _moderationEnqueuer.Verify(e => e.ResubmitAsync(
            ModerationTargetType.Post,
            post.Id,
            "Nội dung đã sửa",
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Once);

        // Callback của enqueuer gán trạng thái lên chính entity đang được track.
        var tracked = await _context.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.Equal(ModerationStatus.Pending, tracked.ModerationStatus);
        Assert.Null(tracked.ModeratedAt);
    }

    [Fact]
    public async Task UpdatePostAsync_WhenContentUnchanged_KeepsModerationStatus()
    {
        var post = await SeedPostAsync(content: "Nội dung giữ nguyên", status: ModerationStatus.Approved);

        await _postService.UpdatePostAsync(post.Id, post.UserId, new UpdatePostRequest
        {
            Content = "Nội dung giữ nguyên"
        });

        _moderationEnqueuer.Verify(e => e.ResubmitAsync(
            It.IsAny<ModerationTargetType>(),
            It.IsAny<Guid>(),
            It.IsAny<string?>(),
            It.IsAny<Action<ModerationStatus>>(),
            It.IsAny<CancellationToken>()), Times.Never);

        var tracked = await _context.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.Equal(ModerationStatus.Approved, tracked.ModerationStatus);
    }

    [Fact]
    public async Task UpdatePostAsync_WhenVisibilityNotProvided_KeepsCurrentVisibility()
    {
        var post = await SeedPostAsync(
            content: "Bài followers",
            status: ModerationStatus.Approved,
            visibility: PostVisibility.Followers);

        await _postService.UpdatePostAsync(post.Id, post.UserId, new UpdatePostRequest
        {
            Content = "Bài followers đã sửa"
        });

        var tracked = await _context.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.Equal(PostVisibility.Followers, tracked.Visibility);
    }

    [Fact]
    public async Task UpdatePostAsync_WhenLocationNotProvided_KeepsCurrentLocation()
    {
        var post = await SeedPostAsync(
            content: "Bài có địa điểm",
            status: ModerationStatus.Approved,
            location: "Hà Nội");

        await _postService.UpdatePostAsync(post.Id, post.UserId, new UpdatePostRequest
        {
            Content = "Bài có địa điểm đã sửa"
        });

        var tracked = await _context.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.Equal("Hà Nội", tracked.Location);
    }

    [Fact]
    public async Task UpdatePostAsync_WhenUserIsNotAuthor_Throws()
    {
        var post = await SeedPostAsync(content: "Bài của người khác", status: ModerationStatus.Approved);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _postService.UpdatePostAsync(post.Id, Guid.NewGuid(), new UpdatePostRequest
            {
                Content = "Cố sửa bài người khác"
            }));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Post> SeedPostAsync(
        string content,
        ModerationStatus status,
        PostVisibility visibility = PostVisibility.Public,
        string? location = null)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            Content = content,
            Visibility = visibility,
            Location = location,
            PostType = PostType.Original,
            ModerationStatus = status,
            ModeratedAt = status == ModerationStatus.Pending ? null : DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        return post;
    }
}
