namespace PostService.Enums;

/// <summary>
/// Loại nội dung được kiểm duyệt.
/// </summary>
public enum ModerationTargetType
{
    Post = 0,
    Comment = 1,
    Reel = 2,
    Story = 3,
    /// <summary>Bình luận trên reel (Phase 3.0).</summary>
    ReelComment = 4,
}
