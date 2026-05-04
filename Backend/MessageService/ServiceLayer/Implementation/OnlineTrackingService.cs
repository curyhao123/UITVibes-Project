using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;
using StackExchange.Redis;

namespace MessageService.ServiceLayer.Implementation;

public class OnlineTrackingService : IOnlineTrackingService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IFriendListRpcClient _friendListRpcClient;
    private readonly ILogger<OnlineTrackingService> _logger;
    private const string OnlineUsersKey = "online_users";
    private const string UserConnectionsPrefix = "user_connections:";

    public OnlineTrackingService(
        IConnectionMultiplexer redis,
        IFriendListRpcClient friendListRpcClient,
        ILogger<OnlineTrackingService> logger)
    {
        _redis = redis;
        _friendListRpcClient = friendListRpcClient;
        _logger = logger;
    }

    public async Task SetUserOnlineAsync(Guid userId, string connectionId)
    {
        var db = _redis.GetDatabase();
        var userKey = $"{UserConnectionsPrefix}{userId}";

        // Add connection ID to user's set of connections (supports multiple devices)
        await db.SetAddAsync(userKey, connectionId);
        await db.KeyExpireAsync(userKey, TimeSpan.FromMinutes(2)); // TTL
        // Add user to online users set
        await db.SetAddAsync(OnlineUsersKey, userId.ToString());

        _logger.LogInformation("User {UserId} connected with {ConnectionId}", userId, connectionId);
    }

    // Gọi định kỳ từ client (heartbeat mỗi 5 phút) để gia hạn TTL
    public async Task RefreshOnlineAsync(Guid userId)
    {
        var db = _redis.GetDatabase();
        var userKey = $"{UserConnectionsPrefix}{userId}";
        await db.KeyExpireAsync(userKey, TimeSpan.FromMinutes(2));
    }


    public async Task SetUserOfflineAsync(Guid userId, string connectionId)
    {
        var db = _redis.GetDatabase();
        var userKey = $"{UserConnectionsPrefix}{userId}";

        // Remove this specific connection
        await db.SetRemoveAsync(userKey, connectionId);

        // Check if user has any remaining connections
        var remainingConnections = await db.SetLengthAsync(userKey);
        if (remainingConnections == 0)
        {
            // User has no more connections — fully offline
            await db.SetRemoveAsync(OnlineUsersKey, userId.ToString());
            await db.KeyDeleteAsync(userKey);
        }

        _logger.LogInformation("User {UserId} disconnected from {ConnectionId}. Remaining: {Count}",
            userId, connectionId, remainingConnections);
    }

    public async Task<bool> IsUserOnlineAsync(Guid userId)
    {
        var db = _redis.GetDatabase();
        return await db.SetContainsAsync(OnlineUsersKey, userId.ToString());
    }

    public async Task<List<Guid>> GetOnlineUsersAsync(IEnumerable<Guid> userIds)
    {
        var db = _redis.GetDatabase();
        var onlineUsers = new List<Guid>();

        foreach (var userId in userIds)
        {
            if (await db.SetContainsAsync(OnlineUsersKey, userId.ToString()))
            {
                onlineUsers.Add(userId);
            }
        }

        return onlineUsers;
    }

    public async Task<List<string>> GetUserConnectionIdsAsync(Guid userId)
    {
        var db = _redis.GetDatabase();
        var userKey = $"{UserConnectionsPrefix}{userId}";
        var connections = await db.SetMembersAsync(userKey);
        return connections.Select(c => c.ToString()).ToList();
    }

    public async Task<List<OnlineFriendDto>> GetOnlineFriendsAsync(
        Guid userId,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
    {
        var friends = await _friendListRpcClient.GetFriendListAsync(userId, skip, take, cancellationToken);
        if (friends.Count == 0) return new List<OnlineFriendDto>();

        var onlineIds = await GetOnlineUsersAsync(friends.Select(f => f.UserId));
        var onlineSet = onlineIds.ToHashSet();

        return friends.Select(friend => new OnlineFriendDto
        {
            UserId = friend.UserId,
            DisplayName = friend.DisplayName,
            AvatarUrl = friend.AvatarUrl,
            IsOnline = onlineSet.Contains(friend.UserId)
        }).ToList();
    }
}