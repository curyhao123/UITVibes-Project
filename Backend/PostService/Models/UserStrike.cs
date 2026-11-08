namespace PostService.Models;

/// <summary>
/// Lịch sử vi phạm của một tài khoản (Phase 3.5).
///
/// Mỗi lần nội dung bị AI/admin từ chối nghiêm trọng → cộng một strike.
/// Đủ ngưỡng → tài khoản bị khoá (publish event "user.banned" cho AuthService).
///
/// Vì sao cần bảng riêng thay vì đếm trên ModerationResult:
///   - Strike có vòng đời (hết hạn, bị admin xoá) — không giống bản ghi kiểm duyệt.
///   - Cần truy vết nhanh "user này đang có bao nhiêu strike còn hiệu lực".
///   - Tách bạch giữa "bị AI chặn" và "bị admin xác nhận vi phạm" — chỉ loại
///     thứ hai mới tính strike nặng.
/// </summary>
public class UserStrike
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    /// Id của nội dung bị vi phạm (PostId, CommentId, ReelId...).
    public Guid TargetId { get; set; }

    /// Loại nội dung: Post / Comment / Reel / Story.
    public int TargetType { get; set; }

    /// Id bản ghi kiểm duyệt liên quan.
    public Guid? ModerationResultId { get; set; }

    /// Mức độ vi phạm (0–3) — quyết định số strike được cộng.
    public int Severity { get; set; }

    /// Số strike đã cộng cho lần vi phạm này.
    public int Weight { get; set; } = 1;

    /// Nguyên nhân (mã nội bộ, vd: "llm_reject", "admin_reject").
    public string ReasonCode { get; set; } = string.Empty;

    /// Người duyệt vi phạm: "System" (AI tự chặn) hoặc "Admin".
    public string IssuedBy { get; set; } = "System";

    /// Admin đã xoá strike này (vd: khiếu nại thành công).
    public bool IsRevoked { get; set; }

    /// Lý do admin xoá strike.
    public string? RevokedReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// Thời điểm strike hết hạn. Null = không hết hạn.
    public DateTime? ExpiresAt { get; set; }
}
