namespace UserService.DTOs;

public class FriendListRpcResponse
{
    public List<FriendListOnlineDto> Friends { get; set; } = new();
}
