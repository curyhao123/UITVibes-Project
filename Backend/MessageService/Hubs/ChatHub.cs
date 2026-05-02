using Microsoft.AspNetCore.SignalR;
using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;

namespace MessageService.Hubs;

public class ChatHub : Hub
{
    private readonly IMessageService _messageService;
    private readonly IConversationService _conversationService;
    private readonly IOnlineTrackingService _onlineTrackingService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(
        IMessageService messageService,
        IConversationService conversationService,
        IOnlineTrackingService onlineTrackingService,
        ILogger<ChatHub> logger)
    {
        _messageService = messageService;
        _conversationService = conversationService;
        _onlineTrackingService = onlineTrackingService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = ParseUserId(); // đọc từ HttpContext lúc connect
        if (userId == Guid.Empty)
        {
            Context.Abort();
            return;
        }

        // Lưu vào Context.Items — tồn tại suốt vòng đời connection
        Context.Items["UserId"] = userId;

        // Track user online status
        await _onlineTrackingService.SetUserOnlineAsync(userId, Context.ConnectionId);

        // Join all user's conversation groups
        var conversations = await _conversationService.GetUserConversationsAsync(userId, 0, 100);
        foreach (var conversation in conversations)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, conversation.Id.ToString());
        }

        // Notify friends that user is online
        await Clients.Others.SendAsync("UserOnline", userId);

        _logger.LogInformation("User {UserId} connected to ChatHub", userId);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Lấy từ Context.Items — luôn có, kể cả khi HttpContext đã null
        var userId = GetUserId();
        if (userId != Guid.Empty)
        {
            await _onlineTrackingService.SetUserOfflineAsync(userId, Context.ConnectionId);

            // Check if user is fully offline (no remaining connections)
            var isStillOnline = await _onlineTrackingService.IsUserOnlineAsync(userId);
            if (!isStillOnline)
            {
                await Clients.Others.SendAsync("UserOffline", userId);
            }
        }

        _logger.LogInformation("User {UserId} disconnected from ChatHub", userId);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Send a message to a conversation
    /// </summary>
    public async Task SendMessage(Guid conversationId, SendMessageRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return;

        try
        {
            var message = await _messageService.SendMessageAsync(conversationId, userId, request);

            // Broadcast to all members in the conversation group
            await Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message in conversation {ConversationId}", conversationId);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    /// <summary>
    /// Edit a message
    /// </summary>
    public async Task EditMessage(Guid conversationId, Guid messageId, EditMessageRequest request)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return;

        try
        {
            var message = await _messageService.EditMessageAsync(messageId, userId, request);

            await Clients.Group(conversationId.ToString()).SendAsync("MessageEdited", message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error editing message {MessageId}", messageId);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    /// <summary>
    /// Delete a message
    /// </summary>
    public async Task DeleteMessage(Guid conversationId, Guid messageId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return;

        try
        {
            await _messageService.DeleteMessageAsync(messageId, userId);

            await Clients.Group(conversationId.ToString()).SendAsync("MessageDeleted", new
            {
                conversationId,
                messageId,
                deletedBy = userId,
                deletedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting message {MessageId}", messageId);
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    /// <summary>
    /// Mark messages as read
    /// </summary>
    public async Task MarkAsRead(Guid conversationId, Guid messageId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return;

        try
        {
            await _messageService.MarkAsReadAsync(conversationId, userId, messageId);

            await Clients.Group(conversationId.ToString()).SendAsync("MessagesRead", new
            {
                conversationId,
                userId,
                messageId,
                readAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking messages as read in conversation {ConversationId}", conversationId);
        }
    }

    /// <summary>
    /// Typing indicator
    /// </summary>
    public async Task StartTyping(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return;

        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("UserTyping", new
        {
            conversationId,
            userId,
            isTyping = true
        });
    }

    public async Task StopTyping(Guid conversationId)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return;

        await Clients.OthersInGroup(conversationId.ToString()).SendAsync("UserTyping", new
        {
            conversationId,
            userId,
            isTyping = false
        });
    }

    /// <summary>
    /// Join a new conversation group (after being added)
    /// </summary>
    public async Task JoinConversation(Guid conversationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, conversationId.ToString());
    }

    /// <summary>
    /// Dùng trong mọi method — đọc từ Context.Items (luôn available)
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

        // Đọc từ header X-User-Id (khi qua Gateway)
        var fromHeader = httpContext?.Request.Headers["X-User-Id"].FirstOrDefault();
        if (!string.IsNullOrEmpty(fromHeader) && Guid.TryParse(fromHeader, out var headerUserId))
            return headerUserId;

        // Fallback — đọc từ query string (khi test trực tiếp)
        var fromQuery = httpContext?.Request.Query["userId"].FirstOrDefault();
        if (!string.IsNullOrEmpty(fromQuery) && Guid.TryParse(fromQuery, out var queryUserId))
            return queryUserId;

        // ✅ Thêm — decode access_token từ query string (khi Gateway forward token)
        var accessToken = httpContext?.Request.Query["access_token"].FirstOrDefault();
        if (!string.IsNullOrEmpty(accessToken))
        {
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            if (handler.CanReadToken(accessToken))
            {
                var jwt = handler.ReadJwtToken(accessToken);
                var userId = jwt.Claims.FirstOrDefault(c =>
                    c.Type == "sub" ||
                    c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var tokenUserId))
                    return tokenUserId;
            }
        }

        return Guid.Empty;


    }
}