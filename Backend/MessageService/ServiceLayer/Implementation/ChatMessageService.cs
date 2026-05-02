using MessageService.DTOs;
using MessageService.Models;
using MessageService.DTOs;
using MessageService.Hubs;
using MessageService.ServiceLayer.Interface;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace MessageService.ServiceLayer.Implementation
{
    public class ChatMessageService: IMessageService
    {
        private readonly MessageDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly ILogger<ChatMessageService> _logger;

        public ChatMessageService(MessageDbContext context, IHubContext<ChatHub> hubContext, ILogger<ChatMessageService> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task DeleteMessageAsync(Guid messageId, Guid userId)
        {
            var message = await _context.Messages.FirstOrDefaultAsync(m => m.Id == messageId && !m.IsDeleted);

            if (message == null)
                throw new KeyNotFoundException("Message not found");

            if (message.SenderId != userId)
                throw new UnauthorizedAccessException("You can only delete your own messages");

            message.IsDeleted = true;
            message.Content = null;
            message.MediaUrl = null;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Message {MessageId} deleted by {UserId}", messageId, userId);

            await _hubContext.Clients.Group(message.ConversationId.ToString()).SendAsync("MessageDeleted", new
            {
                conversationId = message.ConversationId,
                messageId = messageId,
                deletedBy = userId,
                deletedAt = DateTime.UtcNow
            });
        }

        public async Task<MessageDto> EditMessageAsync(Guid messageId, Guid userId, EditMessageRequest request)
        {
            var message = await _context.Messages.FirstOrDefaultAsync(m => m.Id == messageId && !m.IsDeleted);

            if (message == null)
                throw new KeyNotFoundException("Message not found");

            if (message.SenderId != userId)
                throw new UnauthorizedAccessException("You can only edit your own messages");

            if (message.Type != MessageType.Text)
                throw new InvalidOperationException("Only text messages can be edited");

            message.Content = request.Content;
            message.IsEdited = true;
            message.EditedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Message {MessageId} edited by {UserId}", messageId, userId);

            var messageDto = MapToDto(message);
            await _hubContext.Clients.Group(message.ConversationId.ToString()).SendAsync("MessageEdited", messageDto);

            return messageDto;
        }

        public async Task<List<MessageDto>> GetMessagesAsync(Guid conversationId, Guid userId, int skip = 0, int take = 50)
        {
            // Verify user is member
            var isMember = await _context.ConversationMembers
                .AnyAsync(m => m.ConversationId == conversationId && m.UserId == userId && m.LeftAt == null);

            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this conversation");

            var messages = await _context.Messages
                .Where(m => m.ConversationId == conversationId && !m.IsDeleted)
                .Include(m => m.ReplyToMessage)
                .Include(m => m.ReadReceipts)
                .OrderByDescending(m => m.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();

            return messages.Select(MapToDto).ToList();
        }

        public async Task MarkAsReadAsync(Guid conversationId, Guid userId, Guid messageId)
        {
            // Verify message exists in conversation
            var message = await _context.Messages
                .FirstOrDefaultAsync(m => m.Id == messageId && m.ConversationId == conversationId);

            if (message == null)
                throw new KeyNotFoundException("Message not found");

            // Update member's last read
            var member = await _context.ConversationMembers
                .FirstOrDefaultAsync(m => m.ConversationId == conversationId && m.UserId == userId && m.LeftAt == null);

            if (member == null)
                throw new UnauthorizedAccessException("You are not a member of this conversation");

            member.LastReadMessageId = messageId;
            member.LastReadAt = DateTime.UtcNow;

            // Add read receipt (if not already exists)
            var existingReceipt = await _context.MessageReadReceipts
                .AnyAsync(r => r.MessageId == messageId && r.UserId == userId);

            if (!existingReceipt)
            {
                _context.MessageReadReceipts.Add(new MessageReadReceipt
                {
                    Id = Guid.NewGuid(),
                    MessageId = messageId,
                    UserId = userId,
                    ReadAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group(conversationId.ToString()).SendAsync("MessagesRead", new
            {
                conversationId,
                userId,
                messageId,
                readAt = DateTime.UtcNow
            });
        }

        public async Task<MessageDto> SendMessageAsync(Guid conversationId, Guid senderId, SendMessageRequest request)
        {
            // Verify user is member of conversation
            var isMember = await _context.ConversationMembers
                .AnyAsync(m => m.ConversationId == conversationId && m.UserId == senderId && m.LeftAt == null);

            if (!isMember)
                throw new UnauthorizedAccessException("You are not a member of this conversation");

            // Validate reply
            if (request.ReplyToMessageId.HasValue)
            {
                var replyMessage = await _context.Messages
                    .FirstOrDefaultAsync(m => m.Id == request.ReplyToMessageId.Value && m.ConversationId == conversationId);

                if (replyMessage == null)
                    throw new KeyNotFoundException("Reply target message not found");
            }

            var message = new Message
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                SenderId = senderId,
                Content = request.Content,
                Type = (MessageType)request.Type,
                MediaUrl = request.MediaUrl,
                MediaPublicId = request.MediaPublicId,
                FileName = request.FileName,
                FileSize = request.FileSize,
                ReplyToMessageId = request.ReplyToMessageId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);

            // Update conversation's last message
            var conversation = await _context.Conversations.FindAsync(conversationId);
            if (conversation != null)
            {
                conversation.LastMessageContent = request.Type == 0
                    ? (request.Content?.Length > 500 ? request.Content[..500] : request.Content)
                    : $"[{(MessageType)request.Type}]";
                conversation.LastMessageSenderId = senderId;
                conversation.LastMessageAt = message.CreatedAt;
                conversation.LastUpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Message {MessageId} sent to conversation {ConversationId} by {SenderId}",
                message.Id, conversationId, senderId);

            var messageDto = MapToDto(message);
            await _hubContext.Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", messageDto);

            return messageDto;
        }

        private MessageDto MapToDto(Message message)
        {
            return new MessageDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                Content = message.IsDeleted ? null : message.Content,
                Type = message.Type.ToString(),
                MediaUrl = message.IsDeleted ? null : message.MediaUrl,
                FileName = message.FileName,
                FileSize = message.FileSize,
                ReplyToMessageId = message.ReplyToMessageId,
                ReplyToMessage = message.ReplyToMessage != null ? MapToDto(message.ReplyToMessage) : null,
                IsEdited = message.IsEdited,
                IsDeleted = message.IsDeleted,
                ReadBy = (message.ReadReceipts ?? new List<MessageReadReceipt>())
                    .Select(r => new ReadReceiptDto
                    {
                        UserId = r.UserId,
                        ReadAt = r.ReadAt
                    }).ToList(),
                CreatedAt = message.CreatedAt,
                EditedAt = message.EditedAt
            };
        }
    }
}
