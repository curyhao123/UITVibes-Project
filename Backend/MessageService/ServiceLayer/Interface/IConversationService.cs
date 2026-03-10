using MessageService.DTOs;

namespace MessageService.ServiceLayer.Interface;

public interface IConversationService
{
    Task<ConversationDto> CreatePrivateConversationAsync(Guid userId, CreatePrivateConversationRequest request);
    Task<ConversationDto> CreateGroupConversationAsync(Guid userId, CreateGroupConversationRequest request);
    Task<List<ConversationDto>> GetUserConversationsAsync(Guid userId, int skip = 0, int take = 20);
    Task<ConversationDto> GetConversationByIdAsync(Guid conversationId, Guid userId);
    Task AddMemberToGroupAsync(Guid conversationId, Guid userId, Guid targetUserId);
    Task RemoveMemberFromGroupAsync(Guid conversationId, Guid userId, Guid targetUserId);
    Task LeaveGroupAsync(Guid conversationId, Guid userId);
}