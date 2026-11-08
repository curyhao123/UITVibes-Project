using Microsoft.Extensions.Logging.Abstractions;
using PostService.Enums;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho ModerationPromptBuilder — prompt là hợp đồng với LLM nên phải
/// được chốt bằng test, không được sửa "cho có".
/// </summary>
public class ModerationPromptBuilderTests
{
    private readonly ModerationPromptBuilder _builder =
        new(NullLogger<ModerationPromptBuilder>.Instance);

    [Fact]
    public void Build_RequiresEnglishReasonInSystemPrompt()
    {
        var prompt = _builder.Build("Nội dung tiếng Việt", ModerationTargetType.Post);

        Assert.Contains("written in ENGLISH", prompt.SystemPrompt);
        Assert.Contains("Never write the reason in Vietnamese.", prompt.SystemPrompt);
    }

    [Fact]
    public void Build_NoLongerAsksForReasonInContentLanguage()
    {
        // Prompt cũ yêu cầu reason theo ngôn ngữ của content → sinh ra tiếng Việt.
        var prompt = _builder.Build("Nội dung tiếng Việt", ModerationTargetType.Post);

        Assert.DoesNotContain("in the same language as the content", prompt.SystemPrompt);
    }

    [Fact]
    public void Build_StampsCurrentPromptVersion()
    {
        var prompt = _builder.Build("hello", ModerationTargetType.Post);

        Assert.Equal(ModerationPromptBuilder.CurrentVersion, prompt.PromptVersion);
    }

    [Fact]
    public void Build_RequiresProfanityToBeTreatedAsViolation()
    {
        // LLM từng approve chửi thề đứng riêng lẻ với confidence cao → prompt
        // phải nói rõ đó là vi phạm.
        var prompt = _builder.Build("fuck", ModerationTargetType.Reel);

        Assert.Contains("Profanity and abusive language", prompt.SystemPrompt);
        Assert.Contains("never \"approve\"", prompt.SystemPrompt);
    }

    [Theory]
    [InlineData(ModerationTargetType.Post, "Post")]
    [InlineData(ModerationTargetType.Comment, "Comment")]
    [InlineData(ModerationTargetType.Reel, "Reel caption")]
    [InlineData(ModerationTargetType.Story, "Story caption")]
    public void Build_LabelsTargetTypeInUserMessage(ModerationTargetType targetType, string expectedLabel)
    {
        var prompt = _builder.Build("hello", targetType);

        Assert.Contains($"Content type: {expectedLabel}", prompt.UserMessage);
    }

    [Fact]
    public void Build_WrapsContentInDelimiters()
    {
        var prompt = _builder.Build("Nội dung cần kiểm duyệt", ModerationTargetType.Post);

        Assert.Contains("<<<", prompt.UserMessage);
        Assert.Contains(">>>", prompt.UserMessage);
        Assert.Contains("Nội dung cần kiểm duyệt", prompt.UserMessage);
    }

    [Fact]
    public void Build_WhenContentIsEmpty_Throws()
    {
        Assert.Throws<ArgumentException>(() => _builder.Build("   ", ModerationTargetType.Post));
    }

    [Fact]
    public void Build_WhenContentIsTooLong_TruncatesWithMarker()
    {
        var longContent = new string('a', 5000);

        var prompt = _builder.Build(longContent, ModerationTargetType.Post);

        Assert.Contains("[... content truncated ...]", prompt.UserMessage);
        Assert.True(prompt.UserMessage.Length < longContent.Length);
    }
}
