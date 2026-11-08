namespace PostService.Configurations;

/// <summary>
/// Cấu hình A/B routing cho LLM kiểm duyệt (Phase 3.3).
///
/// Cho phép chạy nhiều model/prompt song song trên các "bucket" khác nhau để đo
/// độ chính xác trước khi chuyển một model/prompt làm mặc định.
///
/// Bucket được chọn **tất định** theo hash của TargetId → cùng một nội dung luôn
/// rơi vào cùng một bucket. Nếu chọn ngẫu nhiên thì việc so sánh kết quả giữa các
/// nhóm sẽ bị nhiễu bởi sự khác biệt của nội dung, không còn là so sánh model.
///
/// Bind từ section "Moderation:Routing".
/// </summary>
public class ModerationRoutingOptions
{
    public const string SectionName = "Moderation:Routing";

    /// Bật/tắt A/B routing. Tắt → mọi nội dung dùng model mặc định (DeepSeekOptions.Model).
    public bool Enabled { get; set; } = false;

    /// Danh sách biến thể (model + prompt version + trọng số).
    /// Tổng trọng số = 100.
    public List<ModerationModelVariant> Variants { get; set; } = [];

    /// <summary>
    /// Chọn biến thể theo bucket tất định từ TargetId.
    /// Trả về null nếu routing tắt hoặc không có biến thể hợp lệ.
    /// </summary>
    public ModerationModelVariant? SelectVariant(Guid targetId)
    {
        if (!Enabled || Variants.Count == 0)
            return null;

        var totalWeight = Variants.Sum(v => Math.Max(0, v.Weight));
        if (totalWeight <= 0)
            return null;

        // Hash ổn định (không dùng string.GetHashCode vì nó randomize mỗi process).
        var hash = StableHash(targetId);
        var bucket = hash % totalWeight;

        var cumulative = 0;
        foreach (var variant in Variants)
        {
            cumulative += Math.Max(0, variant.Weight);
            if (bucket < cumulative)
                return variant;
        }

        return Variants[^1];
    }

    /// <summary>
    /// Hash ổn định (FNV-1a 64-bit) → cùng input luôn cho cùng output,
    /// không phụ thuộc vào process/randomization của runtime.
    /// </summary>
    private static long StableHash(Guid value)
    {
        var bytes = value.ToByteArray();
        const ulong offsetBasis = 14695981039346656037;
        const ulong prime = 1099511628211;

        var hash = offsetBasis;
        foreach (var b in bytes)
        {
            hash ^= b;
            hash *= prime;
        }

        return (long)(hash & 0x7FFFFFFFFFFFFFFF);
    }
}

/// <summary>
/// Một biến thể model trong A/B routing.
/// </summary>
public class ModerationModelVariant
{
    /// Tên model DeepSeek (vd: "deepseek-flash", "deepseek-chat").
    public string Model { get; set; } = string.Empty;

    /// Phiên bản prompt dùng kèm biến thể này (để admin biết đang so sánh gì).
    public string? PromptVersion { get; set; }

    /// Bật/tắt thinking mode cho biến thể này.
    public bool? EnableThinking { get; set; }

    /// Mức độ suy luận: "low" | "medium" | "high" | "max".
    public string? ReasoningEffort { get; set; }

    /// Trọng số phân bổ bucket (tổng các variant = 100).
    public int Weight { get; set; } = 0;
}
