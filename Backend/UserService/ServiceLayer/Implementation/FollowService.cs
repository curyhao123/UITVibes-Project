using Microsoft.EntityFrameworkCore;
using UserService.DTOs;
using UserService.Models;
using UserService.ServiceLayer.Interface;

namespace UserService.ServiceLayer.Implementation;

public class FollowService : IFollowService
{
    private readonly UserDbContext _context;
    private readonly ILogger<FollowService> _logger;

    public FollowService(UserDbContext context, ILogger<FollowService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<FollowDto> FollowUserAsync(Guid followerId, Guid followingId)
    {
        // Validate: Cannot follow yourself
        if (followerId == followingId)
        {
            throw new InvalidOperationException("Cannot follow yourself");
        }

        var followerProfile = await _context.UserProfiles
           .FirstOrDefaultAsync(p => p.UserId == followerId);
        var followingProfile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == followingId);

        if (followerProfile == null)
        {
            throw new KeyNotFoundException($"Follower user not found: {followerId}");
        }

        if (followingProfile == null)
        {
            throw new KeyNotFoundException($"Following user not found: {followingId}");
        }

        // Check if already following
        var existingFollow = await _context.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);

        if (existingFollow != null)
        {
            throw new InvalidOperationException("Already following this user");
        }

        // Create follow relationship
        var follow = new Follow
        {
            Id = Guid.NewGuid(),
            FollowerId = followerId,
            FollowingId = followingId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Follows.Add(follow);

        followerProfile.FollowingCount++;
        followingProfile.FollowersCount++;
        followerProfile.UpdatedAt = DateTime.UtcNow;
        followingProfile.UpdatedAt = DateTime.UtcNow;

      
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {FollowerId} followed user {FollowingId}", followerId, followingId);

        return new FollowDto
        {
            Id = follow.Id,
            FollowerId = follow.FollowerId,
            FollowingId = follow.FollowingId,
            CreatedAt = follow.CreatedAt
        };
    }

    public async Task UnfollowUserAsync(Guid followerId, Guid followingId)
    {
        // Validate: Cannot unfollow yourself
        if (followerId == followingId)
        {
            throw new InvalidOperationException("Invalid operation");
        }

        // Find follow relationship
        var follow = await _context.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);

        if (follow == null)
        {
            throw new KeyNotFoundException("Follow relationship not found");
        }

        // Remove follow relationship
        _context.Follows.Remove(follow);

        // Update follower/following counts
        var followerProfile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == followerId);
        var followingProfile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.UserId == followingId);

        if (followerProfile != null && followerProfile.FollowingCount > 0)
        {
            followerProfile.FollowingCount--;
        }

        if (followingProfile != null && followingProfile.FollowersCount > 0)
        {
            followingProfile.FollowersCount--;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {FollowerId} unfollowed user {FollowingId}", followerId, followingId);
    }

    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
    {
        return await _context.Follows
            .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }

    public async Task<UserFollowStatsDto> GetFollowStatsAsync(Guid userId, Guid? currentUserId = null)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        var stats = new UserFollowStatsDto
        {
            UserId = userId,
            DisplayName = profile.DisplayName,
            AvatarUrl = profile.AvatarUrl,
            FollowersCount = profile.FollowersCount,
            FollowingCount = profile.FollowingCount,
            IsFollowing = false,
            IsFollowedBy = false
        };

        // Check relationship with current user
        if (currentUserId.HasValue && currentUserId.Value != userId)
        {
            stats.IsFollowing = await IsFollowingAsync(currentUserId.Value, userId);
            stats.IsFollowedBy = await IsFollowingAsync(userId, currentUserId.Value);
        }

        return stats;
    }

    public async Task<List<FollowerListDto>> GetFollowersAsync(Guid userId, int skip = 0, int take = 50)
    {
        var followers = await _context.Follows
            .Where(f => f.FollowingId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Join(
                _context.UserProfiles,
                follow => follow.FollowerId,
                profile => profile.UserId,
                (follow, profile) => new FollowerListDto
                {
                    UserId = profile.UserId,
                    DisplayName = profile.DisplayName,
                    AvatarUrl = profile.AvatarUrl,
                    FollowedAt = follow.CreatedAt
                })
            .ToListAsync();

        return followers;
    }

    public async Task<List<FollowerListDto>> GetFollowingAsync(Guid userId, int skip = 0, int take = 50)
    {
        var following = await _context.Follows
            .Where(f => f.FollowerId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Join(
                _context.UserProfiles,
                follow => follow.FollowingId,
                profile => profile.UserId,
                (follow, profile) => new FollowerListDto
                {
                    UserId = profile.UserId,
                    DisplayName = profile.DisplayName,
                    AvatarUrl = profile.AvatarUrl,
                    FollowedAt = follow.CreatedAt
                })
            .ToListAsync();

        return following;
    }
}