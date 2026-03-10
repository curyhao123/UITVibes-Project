namespace MessageService.DTOs
{
    public class CreateGroupConversationRequest
    {
        public string Name { get; set; } = string.Empty;
        public List<Guid> MemberUserIds { get; set; } = new();
    }
}
