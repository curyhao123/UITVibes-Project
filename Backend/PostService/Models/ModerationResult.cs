using PostService.Enums;

namespace PostService.Models;

/// <summary>
/// Lưu kết quả kiểm duyệt từ LLM cho bất kỳ loại nội dung nào (Post, Comment, Reel, Story...)
/// </summary>
public class ModerationResult
{
    public Guid Id { get; set; }

    /// ID của nội dung được kiểm duyệt (PostId, CommentId, ReelId...).
    public Guid TargetId { get; set; }

    /// Loại nội dung: Post / Comment / Reel / Story.
    public ModerationTargetType TargetType { get; set; }

    /// Quyết định cuối: Approved / Rejected / NeedsReview / Pending.
    public ModerationStatus Status { get; set; }

    /// Nguồn ra quyết định: Llm / Rule / Fallback.
    public ModerationSource Source { get; set; }

    /// Quyết định thô mà LLM trả về: "approve" | "reject" | "review".
    /// Null nếu LLM không trả về hoặc parse thất bại.
    public string? LlmDecision { get; set; }

    /// Mức độ nghiêm trọng (0–3) mà LLM đánh giá.
    public int? Severity { get; set; }

    /// Độ tin cậy (0.0–1.0) mà LLM đánh giá.
    public double? Confidence { get; set; }

    /// Danh sách category vi phạm, lưu dưới dạng CSV.
    /// Ví dụ: "harassment,spam". Null/empty = không vi phạm category nào.
    public string? Categories { get; set; }

    /// Lý do hiển thị cho tác giả (tối đa 300 ký tự, đã normalize).
    /// Null khi Status = Approved.
    public string? AuthorReason { get; set; }

    /// Mã nội bộ dùng cho log/metric, KHÔNG gửi ra client.
    public string InternalReasonCode { get; set; } = string.Empty;

    /// Số lần đã thử gọi LLM 
    public int AttemptCount { get; set; }

    public DateTime CreatedAt { get; set; }

    /// Thời điểm cập nhật gần nhất (sau mỗi lần retry hoặc khi có kết quả).
    public DateTime UpdatedAt { get; set; }
}