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

    /// Nguồn ra quyết định: Llm / Rule / Human / Fallback.
    public ModerationSource Source { get; set; }

    /// Quyết định thô mà LLM trả về: "approve" | "reject" | "review".
    /// Null nếu LLM không trả về hoặc parse thất bại.
    /// KHÔNG bị ghi đè khi admin quyết định — dùng để so sánh với quyết định của admin.
    public string? LlmDecision { get; set; }

    /// Mức độ nghiêm trọng (0–3) mà LLM đánh giá.
    /// KHÔNG bị ghi đè khi admin quyết định.
    public int? Severity { get; set; }

    /// Độ tin cậy (0.0–1.0) mà LLM đánh giá.
    /// KHÔNG bị ghi đè khi admin quyết định.
    public double? Confidence { get; set; }

    /// Danh sách category vi phạm, lưu dưới dạng CSV.
    /// Ví dụ: "harassment,spam". Null/empty = không vi phạm category nào.
    public string? Categories { get; set; }

    // ===== Prompt versioning + A/B routing =====
    // Cho phép truy vết "quyết định này do prompt nào / model nào tạo ra".
    // Không dùng để quyết định — chỉ để đo lường khi đổi prompt/model.

    /// Phiên bản prompt đã dùng để ra quyết định (vd: "v3").
    public string? PromptVersion { get; set; }

    /// Model LLM đã dùng (A/B routing có thể chọn model khác nhau theo bucket).
    public string? ModelName { get; set; }

    // ===== Observability (3.4) =====
    // Giữ lại dấu vết kỹ thuật để đo chất lượng và chi phí, không hiển thị cho tác giả.

    /// Raw response của LLM (đã cắt ngắn) — để audit khi model trả kết quả lạ.
    public string? RawLlmResponse { get; set; }

    /// Thời gian gọi LLM (ms).
    public int? LlmLatencyMs { get; set; }

    /// Token usage do DeepSeek báo về.
    public int? PromptTokens { get; set; }
    public int? CompletionTokens { get; set; }
    public int? TotalTokens { get; set; }

    /// Chi phí ước tính (USD) của một lần gọi LLM.
    public double? EstimatedCostUsd { get; set; }

    // ===== Shadow mode (3.3) =====
    // Chạy thêm một "model bóng" để đo độ chính xác của prompt/model mới TRƯỚC khi
    // bật. Quyết định của shadow KHÔNG bao giờ được áp dụng — chỉ ghi lại để so sánh.

    /// Quyết định thô của shadow model: "approve" | "reject" | "review".
    public string? ShadowDecision { get; set; }

    /// Trạng thái cuối đã quy đổi của shadow model.
    public ModerationStatus? ShadowStatus { get; set; }

    public double? ShadowConfidence { get; set; }
    public int? ShadowSeverity { get; set; }

    /// Model dùng cho shadow run.
    public string? ShadowModel { get; set; }

    /// Phiên bản prompt dùng cho shadow run.
    public string? ShadowPromptVersion { get; set; }

    /// Shadow có đồng ý với quyết định chính không (null = chưa chạy shadow).
    public bool? ShadowAgreesWithPrimary { get; set; }

    // ===== Bằng chứng media (3.7) =====
    // Snapshot URL media tại thời điểm kiểm duyệt, để admin vẫn xem được nội dung
    // gốc khi tác giả đã xoá bài (bản ghi moderation vẫn còn nguyên).

    /// Danh sách URL media (CSV) tại thời điểm kiểm duyệt.
    public string? TargetMediaUrlsSnapshot { get; set; }

    /// Text trích xuất từ ảnh bằng OCR (Phase 3.0).
    /// Chỉ dùng để admin đối chiếu — không gửi cho tác giả.
    public string? OcrText { get; set; }

    /// Lý do hiển thị cho tác giả (tối đa 300 ký tự, đã normalize).
    /// Null khi Status = Approved.
    public string? AuthorReason { get; set; }

    /// Mã nội bộ dùng cho log/metric, KHÔNG gửi ra client.
    public string InternalReasonCode { get; set; } = string.Empty;

    /// Số lần đã thử gọi LLM
    public int AttemptCount { get; set; }

    // ===== Quyết định của admin =====
    // Các field dưới đây được set khi admin xử lý một nội dung đang chờ duyệt
    // (ModerationStatus.NeedsReview). Chúng tách biệt hoàn toàn với quyết định
    // của LLM ở trên — LLM không bao giờ được phép ghi vào các field này.

    /// Ghi chú của admin khi xử lý (tuỳ chọn).
    public string? AdminNote { get; set; }

    /// Id của admin đã xử lý nội dung này.
    public Guid? ReviewedBy { get; set; }

    /// Thời điểm admin xử lý.
    public DateTime? ReviewedAt { get; set; }

    // ===== Khiếu nại của tác giả (appeal) =====
    // Tác giả có thể khiếu nại khi nội dung bị từ chối. Khiếu nại không tự
    // đảo ngược quyết định — nó chỉ đưa nội dung vào vùng xám để admin xử lại.

    /// Trạng thái khiếu nại: None / Pending / Resolved.
    public ModerationAppealStatus AppealStatus { get; set; } = ModerationAppealStatus.None;

    /// Lý do tác giả khiếu nại (tối đa 500 ký tự, đã normalize).
    public string? AppealReason { get; set; }

    /// Thời điểm tác giả gửi khiếu nại.
    public DateTime? AppealSubmittedAt { get; set; }

    /// Thời điểm admin xử lý xong khiếu nại.
    public DateTime? AppealResolvedAt { get; set; }

    /// Thời điểm tạo bản ghi.
    public DateTime CreatedAt { get; set; }

    /// Thời điểm cập nhật gần nhất (sau mỗi lần retry hoặc khi có kết quả).
    public DateTime UpdatedAt { get; set; }

    // ===== Lease (chống xử lý trùng khi chạy nhiều replica) =====
    // Worker "giành" một bản ghi Pending bằng cách đặt LeaseExpiresAt/WorkerId.
    // Bản ghi có lease còn hiệu lực sẽ không được worker khác đụng tới.
    // Nếu worker chết giữa chừng, lease tự hết hạn và bản ghi được xử lý lại.

    /// Thời điểm hết hạn của lease hiện tại. Null = không ai đang giữ.
    public DateTime? LeaseExpiresAt { get; set; }

    /// Định danh worker đang giữ lease (dùng để nhận diện và giải phóng lease).
    public string? WorkerId { get; set; }

    // ===== Ưu tiên trong hàng đợi admin (3.6) =====

    /// Số report đang mở (chưa xử lý) cho nội dung này.
    /// Nội dung bị report nhiều → admin nên xem trước.
    public int ReportCount { get; set; }

    /// Điểm ưu tiên trong hàng đợi (số lớn hơn = xét trước).
    /// Cơ sở: report count × boost + severity.
    public int Priority { get; set; }
}
