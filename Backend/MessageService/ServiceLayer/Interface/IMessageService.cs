using MessageService.DTOs;

namespace MessageService.ServiceLayer.Interface;

public interface IMessageService
{
    Task<MessageDto> SendMessageAsync(Guid conversationId, Guid senderId, SendMessageRequest request);
    Task<List<MessageDto>> GetMessagesAsync(Guid conversationId, Guid userId, int skip = 0, int take = 50);
    Task<MessageDto> EditMessageAsync(Guid messageId, Guid userId, EditMessageRequest request);
    Task DeleteMessageAsync(Guid messageId, Guid userId);
    Task MarkAsReadAsync(Guid conversationId, Guid userId, Guid messageId);
}