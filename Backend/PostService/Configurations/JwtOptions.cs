namespace PostService.Configurations;

/// <summary>
/// Cấu hình JWT dùng để xác thực danh tính admin tại chính PostService.
/// Bind từ section "Jwt" trong config (AppHost inject <c>Jwt__Key</c>).
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// Khóa ký HMAC — dùng chung với AuthService và gateway.
    public string Key { get; set; } = string.Empty;

    public string Issuer { get; set; } = "UITVibes.AuthService";

    public string Audience { get; set; } = "UITVibes.Client";
}
