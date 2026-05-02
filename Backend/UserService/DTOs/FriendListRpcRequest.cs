namespace UserService.DTOs;

public class FriendListRpcRequest
{
    public Guid UserId { get; set; }
    public int Skip { get; set; }
    public int Take { get; set; } = 50;
}
