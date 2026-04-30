namespace MessageService.DTOs
{
    public class GetOnlineUsersRequest
    {
        public List<Guid> UserIds { get; set; } = new();
    }
}
