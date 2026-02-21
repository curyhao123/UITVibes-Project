using Microsoft.EntityFrameworkCore;
using UserService.DTOs;
using UserService.Models;
using UserService.ServiceLayer.Interface;

namespace UserService.ServiceLayer.Implementation
{
    public class BlockService : IBlockService
    {
        private readonly UserDbContext _context;
        private readonly ILogger<BlockService> _logger;
        public BlockService(UserDbContext context, ILogger<BlockService> logger)
        {
            _context = context;
            _logger = logger;
        }
        public async Task<BlockDto> BlockUserAsync(Guid blockerId, Guid blockedId)
        {
            if (blockerId == blockedId)
                throw new ArgumentException("User cannot block themselves.");
            var blocker = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockerId);
            if (blocker == null)
                throw new ArgumentException("Blocker user not found.");
            var blocked = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockedId);
            if (blocked == null)
                throw new ArgumentException("Blocked user not found.");
            var existingBlock = await _context.Blocks
                .FirstOrDefaultAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedId);
            if (existingBlock != null)
                throw new InvalidOperationException("User is already blocked.");
            var block = new Block
                {
                Id = Guid.NewGuid(),
                BlockerId = blockerId,
                BlockedId = blockedId,
                CreatedAt = DateTime.UtcNow
            };
            _context.Blocks.Add(block);

            //remove follow relationships in both directions if they exist
            var blockerFollowing = await _context.Follows.FirstOrDefaultAsync(f => f.FollowerId == blockerId && f.FollowingId == blockedId);
            if (blockerFollowing != null)
            {
                _context.Follows.Remove(blockerFollowing);
                _logger.LogInformation("User {BlockerId} unfollowed user {BlockedId} due to block", blockerId, blockedId);
                // Decrement counts
                var blockerProfile = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockerId);
                var blockedProfile = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockedId);

                if (blockerProfile != null && blockerProfile.FollowingCount > 0)
                    blockerProfile.FollowingCount--;

                if (blockedProfile != null && blockedProfile.FollowersCount > 0)
                    blockedProfile.FollowersCount--;
            }

            //remove follow relationship in the other direction if it exists
            var blockedFollowing = await _context.Follows.FirstOrDefaultAsync(f => f.FollowerId == blockedId && f.FollowingId == blockerId);
            if (blockedFollowing != null)
            {
                _context.Follows.Remove(blockedFollowing);

                var blockerProfile = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockerId);
                var blockedProfile = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockedId);

                if (blockedProfile != null && blockedProfile.FollowingCount > 0)
                    blockedProfile.FollowingCount--;

                if (blockerProfile != null && blockerProfile.FollowersCount > 0)
                    blockerProfile.FollowersCount--;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("User {BlockerId} blocked user {BlockedId}", blockerId, blockedId);
            return new BlockDto
            {
                Id = block.Id,
                BlockerId = block.BlockerId,
                BlockedId = block.BlockedId,
                CreatedAt = block.CreatedAt
            };
        }

        public async Task<List<BlockListDto>> GetBlockedUsersAsync(Guid userId, int skip = 0, int take = 50)
        {
            var blockedUsers = await _context.Blocks
                .Where(b => b.BlockerId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Join(_context.UserProfiles,
                    block => block.BlockedId,
                    user => user.UserId,
                    (block, user) => new BlockListDto
                    {
                        BlockedUserId = block.BlockedId,
                        DisplayName = user.DisplayName,
                        AvatarUrl = user.AvatarUrl,
                        BlockedAt = block.CreatedAt
                    }).ToListAsync();
            return blockedUsers;
        }

        public async Task<bool> IsBlockedAsync(Guid blockerId, Guid blockedId)
        {
            var block = await _context.Blocks
                .FirstOrDefaultAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedId);
            return block != null;
        }

        public async Task UnblockUserAsync(Guid blockerId, Guid blockedId)
        {
            if (blockerId == blockedId)
                throw new ArgumentException("User cannot unblock themselves.");
            var blocker = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockerId);
            if (blocker == null)
                throw new ArgumentException("Blocker user not found.");
            var blocked = await _context.UserProfiles.FirstOrDefaultAsync(u => u.UserId == blockedId);
            if (blocked == null)
                throw new ArgumentException("Blocked user not found.");
            var block = await _context.Blocks.FirstOrDefaultAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedId);
            if (block == null)
                throw new InvalidOperationException("Block relationship does not exist.");
            _context.Blocks.Remove(block);
            await _context.SaveChangesAsync();
            _logger.LogInformation("User {BlockerId} unblocked user {BlockedId}", blockerId, blockedId);

        }
    }
}
