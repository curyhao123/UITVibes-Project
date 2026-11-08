using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PostService.Configurations;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Đọc &amp; kiểm tra JWT trong header <c>Authorization</c> để xác định request
/// có phải của Admin hay không. Xem <see cref="IAdminIdentityResolver"/> để hiểu lý do.
/// </summary>
public class AdminIdentityResolver : IAdminIdentityResolver
{
    private const string AdminRole = "Admin";

    private readonly JwtOptions _options;
    private readonly ILogger<AdminIdentityResolver> _logger;

    public AdminIdentityResolver(
        IOptions<JwtOptions> options,
        ILogger<AdminIdentityResolver> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Guid? GetAdminId(HttpContext httpContext)
    {
        // Đã cấu hình Jwt:Key → chỉ tin JWT, KHÔNG fallback sang header của gateway.
        // Header do client kiểm soát nên có thể bị giả mạo khi service bị truy cập trực tiếp.
        if (!string.IsNullOrWhiteSpace(_options.Key))
        {
            return GetAdminIdFromToken(httpContext);
        }

        // Chưa cấu hình Jwt:Key (chạy PostService độc lập ngoài Aspire) → fallback header.
        _logger.LogWarning(
            "Jwt:Key is not configured — falling back to gateway headers for admin authorization. " +
            "Configure Jwt:Key to enable JWT-based admin verification.");
        return GetAdminIdFromGatewayHeaders(httpContext);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Guid? GetAdminIdFromToken(HttpContext httpContext)
    {
        // Header có thể chứa nhiều giá trị (gateway có thể forward lặp, hoặc bị
        // proxy gộp thành "Bearer a, Bearer b"). Ta chỉ lấy token đầu tiên hợp lệ.
        var authorizationHeader = httpContext.Request.Headers.Authorization.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(authorizationHeader))
            return null;

        var token = ExtractFirstBearerToken(authorizationHeader);
        if (token == null)
            return null;

        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
            var parameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = !string.IsNullOrWhiteSpace(_options.Issuer),
                ValidIssuer = _options.Issuer,
                ValidateAudience = !string.IsNullOrWhiteSpace(_options.Audience),
                ValidAudience = _options.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(token, parameters, out _);

            var role = principal.FindFirst(ClaimTypes.Role)?.Value
                       ?? principal.FindFirst("role")?.Value;

            if (!string.Equals(role, AdminRole, StringComparison.OrdinalIgnoreCase))
                return null;

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                              ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

            return Guid.TryParse(userIdClaim, out var adminId) ? adminId : null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to validate admin JWT token.");
            return null;
        }
    }

    private Guid? GetAdminIdFromGatewayHeaders(HttpContext httpContext)
    {
        var role = httpContext.Request.Headers["X-User-Role"].FirstOrDefault();
        if (!string.Equals(role, AdminRole, StringComparison.OrdinalIgnoreCase))
            return null;

        var userId = httpContext.Request.Headers["X-User-Id"].FirstOrDefault();
        return Guid.TryParse(userId, out var adminId) ? adminId : null;
    }

    /// <summary>
    /// Trích token đầu tiên hợp lệ từ header Authorization.
    /// Header có thể bị gộp nhiều giá trị ("Bearer a, Bearer b") khi qua reverse proxy —
    /// phần tử đầu tiên đọc được là token thật, phần còn lại bị bỏ qua.
    /// </summary>
    private static string? ExtractFirstBearerToken(string authorizationHeader)
    {
        foreach (var part in authorizationHeader.Split(','))
        {
            var candidate = part.Trim();
            if (!candidate.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                continue;

            var token = candidate["Bearer ".Length..].Trim();
            if (!string.IsNullOrWhiteSpace(token))
                return token;
        }

        return null;
    }
}
