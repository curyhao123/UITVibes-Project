namespace PostService.ServiceLayer.Interface;

/// <summary>
/// RPC client to query UserService for follow relationships.
/// PostService has no direct DB access to UserService's Follow table,
/// so it calls UserService via RabbitMQ.
/// </summary>
public interface IUserFollowRpcClient
{
    /// <summary>
    /// Returns the list of user IDs that the given user follows.
    /// Returns an empty list on timeout or error (safe fallback — user sees own content only).
    /// </summary>
    Task<List<Guid>> GetFollowingIdsAsync(Guid userId, CancellationToken cancellationToken = default);
}
