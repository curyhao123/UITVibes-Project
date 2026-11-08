using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PostService.Configurations;
using PostService.ServiceLayer.Implementation;

namespace Test.PostService.Moderation;

/// <summary>
/// Unit test cho AdminIdentityResolver — bảo vệ endpoint quản trị khỏi việc giả mạo
/// header của gateway bằng cách xác thực JWT thật.
/// </summary>
public class AdminIdentityResolverTests
{
    private const string JwtKey = "SuperSecretIntegrationTestingJwtKey1234567890_UITVibes!";
    private const string JwtIssuer = "UITVibes.AuthService";
    private const string JwtAudience = "UITVibes.Client";

    private readonly AdminIdentityResolver _resolver;

    public AdminIdentityResolverTests()
    {
        _resolver = new AdminIdentityResolver(
            Options.Create(new JwtOptions
            {
                Key = JwtKey,
                Issuer = JwtIssuer,
                Audience = JwtAudience,
            }),
            NullLogger<AdminIdentityResolver>.Instance);
    }

    [Fact]
    public void GetAdminId_WhenTokenHasAdminRole_ReturnsUserId()
    {
        var adminId = Guid.NewGuid();
        var httpContext = BuildContextWithToken(adminId, "Admin");

        var result = _resolver.GetAdminId(httpContext);

        Assert.Equal(adminId, result);
    }

    [Fact]
    public void GetAdminId_WhenTokenHasUserRole_ReturnsNull()
    {
        var httpContext = BuildContextWithToken(Guid.NewGuid(), "User");

        var result = _resolver.GetAdminId(httpContext);

        Assert.Null(result);
    }

    [Fact]
    public void GetAdminId_WhenTokenIsSignedWithAnotherKey_ReturnsNull()
    {
        var token = CreateToken(Guid.NewGuid(), "Admin", "SomeOtherKeyThatIsLongEnough1234567890");
        var httpContext = BuildContextWithAuthorization($"Bearer {token}");

        var result = _resolver.GetAdminId(httpContext);

        Assert.Null(result);
    }

    [Fact]
    public void GetAdminId_WhenTokenIsExpired_ReturnsNull()
    {
        var token = CreateToken(Guid.NewGuid(), "Admin", JwtKey, expires: DateTime.UtcNow.AddMinutes(-5));
        var httpContext = BuildContextWithAuthorization($"Bearer {token}");

        var result = _resolver.GetAdminId(httpContext);

        Assert.Null(result);
    }

    [Fact]
    public void GetAdminId_WhenOnlyGatewayHeadersArePresent_ReturnsNull()
    {
        // Không có JWT → không được tin header của gateway (có thể bị giả mạo khi
        // service bị truy cập trực tiếp, bỏ qua gateway).
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-User-Role"] = "Admin";
        httpContext.Request.Headers["X-User-Id"] = Guid.NewGuid().ToString();

        var result = _resolver.GetAdminId(httpContext);

        Assert.Null(result);
    }

    [Fact]
    public void GetAdminId_WhenJwtKeyIsNotConfigured_FallsBackToGatewayHeaders()
    {
        // Chạy PostService độc lập ngoài Aspire (chưa có Jwt:Key) → fallback header.
        var resolver = new AdminIdentityResolver(
            Options.Create(new JwtOptions { Key = string.Empty }),
            NullLogger<AdminIdentityResolver>.Instance);

        var expectedAdminId = Guid.NewGuid();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-User-Role"] = "Admin";
        httpContext.Request.Headers["X-User-Id"] = expectedAdminId.ToString();

        var result = resolver.GetAdminId(httpContext);

        Assert.Equal(expectedAdminId, result);
    }

    [Fact]
    public void GetAdminId_WhenAuthorizationHeaderIsDuplicated_ReturnsUserId()
    {
        // Gateway có thể forward header Authorization lặp lần ("Bearer a, Bearer b")
        // → phải lấy token đầu tiên hợp lệ, không được reject toàn bộ request.
        var adminId = Guid.NewGuid();
        var token = CreateToken(adminId, "Admin", JwtKey);
        var httpContext = BuildContextWithAuthorization($"Bearer {token}, Bearer {token}");

        var result = _resolver.GetAdminId(httpContext);

        Assert.Equal(adminId, result);
    }

    [Fact]
    public void GetAdminId_WhenAuthorizationHeaderContainsGarbageFirstToken_ReturnsUserId()
    {
        var adminId = Guid.NewGuid();
        var token = CreateToken(adminId, "Admin", JwtKey);
        var httpContext = BuildContextWithAuthorization($"Basic abc123, Bearer {token}");

        var result = _resolver.GetAdminId(httpContext);

        Assert.Equal(adminId, result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static DefaultHttpContext BuildContextWithToken(Guid userId, string role)
    {
        var token = CreateToken(userId, role, JwtKey);
        return BuildContextWithAuthorization($"Bearer {token}");
    }

    private static DefaultHttpContext BuildContextWithAuthorization(string authorizationHeader)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["Authorization"] = authorizationHeader;
        return httpContext;
    }

    private static string CreateToken(
        Guid userId,
        string role,
        string signingKey,
        DateTime? expires = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Role, role),
        };

        var token = new JwtSecurityToken(
            issuer: JwtIssuer,
            audience: JwtAudience,
            claims: claims,
            expires: expires ?? DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
