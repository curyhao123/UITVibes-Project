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
        var userId = GetUserId();
        if (userId == Guid.Empty)
        {
            Context.Abort();
            return;
        }

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

    private Guid GetUserId()
    {
        var userIdHeader = Context.GetHttpContext()?.Request.Headers["X-User-Id"].FirstOrDefault()
            ?? Context.GetHttpContext()?.Request.Query["userId"].FirstOrDefault();

        if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
        {
            return Guid.Empty;
        }

        return userId;
    }
}