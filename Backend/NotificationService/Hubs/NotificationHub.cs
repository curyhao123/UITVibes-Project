using Microsoft.AspNetCore.SignalR;
using NotificationService.ServiceLayer.Interface;

namespace NotificationService.Hubs;

/// <summary>
/// SignalR Hub cho real-time notifications.
/// Client subscribe events: NewNotification, UnreadCountChanged, NotificationsRead.
/// </summary>
public class NotificationHub : Hub
{
    private readonly ILogger<NotificationHub> _logger;

    public NotificationHub(ILogger<NotificationHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = ParseUserId();
        if (userId == Guid.Empty)
        {
            Context.Abort();
            return;
        }

        // Lưu vào Context.Items — tồn tại suốt vòng đời connection
        Context.Items["UserId"] = userId;

        // Join group theo userId — để server có thể push tới đúng user
        await Groups.AddToGroupAsync(Context.ConnectionId, GetUserGroup(userId));

        _logger.LogInformation("User {UserId} connected to NotificationHub (conn: {ConnectionId})",
            userId, Context.ConnectionId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId != Guid.Empty)
        {
            _logger.LogInformation("User {UserId} disconnected from NotificationHub", userId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Public helper để các service khác build group name.
    /// </summary>
    public static string GetUserGroup(Guid userId) => $"user-{userId}";

    /// <summary>
    /// Dùng trong mọi method — đọc từ Context.Items
    /// </summary>
    private Guid GetUserId()
    {
        if (Context.Items.TryGetValue("UserId", out var value) && value is Guid userId)
            return userId;

        _logger.LogWarning("UserId not found in Context.Items — ConnectionId: {ConnectionId}",
            Context.ConnectionId);
        return Guid.Empty;
    }

    /// <summary>
    /// Chỉ gọi 1 lần trong OnConnectedAsync — đọc từ HttpContext
    /// </summary>
    private Guid ParseUserId()
    {
        var httpContext = Context.GetHttpContext();

        // 1. Đọc từ header X-User-Id (khi qua Gateway đã forward)
        var fromHeader = httpContext?.Request.Headers["X-User-Id"].FirstOrDefault();
        if (!string.IsNullOrEmpty(fromHeader) && Guid.TryParse(fromHeader, out var headerUserId))
            return headerUserId;

        // 2. Fallback — đọc từ query string (test trực tiếp)
        var fromQuery = httpContext?.Request.Query["userId"].FirstOrDefault();
        if (!string.IsNullOrEmpty(fromQuery) && Guid.TryParse(fromQuery, out var queryUserId))
            return queryUserId;

        // 3. Decode access_token từ query string (khi Gateway forward token)
        var accessToken = httpContext?.Request.Query["access_token"].FirstOrDefault();
        if (!string.IsNullOrEmpty(accessToken))
        {
            try
            {
                // Decode JWT payload manually — tránh dependency System.IdentityModel.Tokens.Jwt
                // Format: header.payload.signature — lấy payload
                var parts = accessToken.Split('.');
                if (parts.Length >= 2)
                {
                    var payload = parts[1];
                    // Base64Url → Base64
                    var base64 = payload.Replace('-', '+').Replace('_', '/');
                    switch (base64.Length % 4)
                    {
                        case 2: base64 += "=="; break;
                        case 3: base64 += "="; break;
                    }
                    var jsonBytes = Convert.FromBase64String(base64);
                    var json = System.Text.Encoding.UTF8.GetString(jsonBytes);

                    // Tìm claim "sub" / "nameid" trong JSON — đơn giản, không cần full parser
                    var userId = ExtractJsonStringValue(json, "sub")
                                 ?? ExtractJsonStringValue(json, "nameid");
                    if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var tokenUserId))
                        return tokenUserId;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decode access_token");
            }
        }

        return Guid.Empty;
    }

    /// <summary>
    /// Extract một string value từ JSON theo key. Đơn giản để tránh kéo theo package.
    /// </summary>
    private static string? ExtractJsonStringValue(string json, string key)
    {
        // Tìm "key":"value" hoặc "key": "value"
        var keyPattern = $"\"{key}\"";
        var keyIdx = json.IndexOf(keyPattern, StringComparison.Ordinal);
        if (keyIdx < 0) return null;
        var colonIdx = json.IndexOf(':', keyIdx + keyPattern.Length);
        if (colonIdx < 0) return null;
        var quoteStart = json.IndexOf('"', colonIdx + 1);
        if (quoteStart < 0) return null;
        var quoteEnd = json.IndexOf('"', quoteStart + 1);
        if (quoteEnd < 0) return null;
        return json.Substring(quoteStart + 1, quoteEnd - quoteStart - 1);
    }
}
