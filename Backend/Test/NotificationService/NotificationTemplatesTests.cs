using NotificationService.Enums;
using NotificationService.Models;
using Xunit;

namespace Test.NotificationService;

/// <summary>
/// Test cho <see cref="NotificationTemplates"/> — đặc biệt là việc gọi đúng
/// tên loại nội dung trong thông báo kiểm duyệt.
///
/// Bối cảnh: trước đây mọi nội dung bị từ chối đều báo "Your post was rejected",
/// kể cả bình luận và reel — gây hiểu nhầm cho tác giả. Bình luận trên reel
/// (ReelComment) còn tệ hơn: rơi về fallback "post".
/// </summary>
public class NotificationTemplatesTests
{
    [Theory]
    [InlineData("Post", "post")]
    [InlineData("Comment", "comment")]
    [InlineData("Reel", "reel")]
    [InlineData("Story", "story")]
    public void NormalizeContentType_MapsKnownTypes(string targetType, string expected)
    {
        var (_, body) = NotificationTemplates.Render(
            NotificationType.ContentRejected, targetType, extra: null);

        Assert.Contains($"Your {expected} was rejected", body);
    }

    [Fact]
    public void NormalizeContentType_ReelComment_MapsToComment()
    {
        // "ReelComment" là bình luận trên reel → phải báo "comment",
        // không được báo "post" (fallback mặc định).
        var (_, body) = NotificationTemplates.Render(
            NotificationType.ContentRejected, "ReelComment", extra: null);

        Assert.Contains("Your comment was rejected", body);
        Assert.DoesNotContain("Your post was rejected", body);
    }

    [Fact]
    public void NormalizeContentType_IsCaseInsensitive()
    {
        var (_, body) = NotificationTemplates.Render(
            NotificationType.ContentRejected, "REELCOMMENT", extra: null);

        Assert.Contains("Your comment was rejected", body);
    }

    [Fact]
    public void UnknownContentType_FallsBackToPost()
    {
        var (_, body) = NotificationTemplates.Render(
            NotificationType.ContentRejected, "SomethingElse", extra: null);

        Assert.Contains("Your post was rejected", body);
    }

    [Fact]
    public void BuildRejectedBody_WithoutReason_KeepsGenericMessage()
    {
        var (_, body) = NotificationTemplates.Render(
            NotificationType.ContentRejected, "Comment", extra: null);

        Assert.Contains("no longer visible to other people", body);
    }

    [Fact]
    public void BuildRejectedBody_WithReason_AppendsReason()
    {
        const string reason = "Your content contains abusive or profane language.";

        var (_, body) = NotificationTemplates.Render(
            NotificationType.ContentRejected, "Reel", extra: reason);

        Assert.Contains("Your reel was rejected", body);
        Assert.Contains(reason, body);
    }

    [Fact]
    public void BuildNeedsReviewBody_UsesCorrectContentType()
    {
        var (_, body) = NotificationTemplates.Render(
            NotificationType.ContentNeedsReview, "ReelComment", extra: null);

        Assert.Contains("Your comment needs a review", body);
        Assert.DoesNotContain("Your post needs a review", body);
    }

    [Fact]
    public void BuildAppealResolvedBody_UsesCorrectContentType()
    {
        var (_, body) = NotificationTemplates.Render(
            NotificationType.AppealResolved, "Comment", extra: null);

        Assert.Contains("Your appeal for the comment was reviewed", body);
        Assert.DoesNotContain("post", body);
    }
}

