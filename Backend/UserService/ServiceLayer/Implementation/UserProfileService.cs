using CloudinaryDotNet;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using UserService.DTOs;
using UserService.Models;
using UserService.ServiceLayer.Interface;

namespace UserService.ServiceLayer.Implementation;

public class UserProfileService : IUserProfileService
{
    private readonly UserDbContext _context;
    private readonly ILogger<UserProfileService> _logger;
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IBlockService _blockService;
    private readonly IDistributedCache _cache;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const int MaxRecentSearches = 10;
    private const int SearchCacheTtlMinutes = 5;

    public UserProfileService(
        UserDbContext context,
        ILogger<UserProfileService> logger,
        ICloudinaryService cloudinaryService,
        IBlockService blockService,
        IDistributedCache cache)
    {
        _context = context;
        _logger = logger;
        _cloudinaryService = cloudinaryService;
        _blockService = blockService;
        _cache = cache;
    }

    public async Task<UserProfileDto?> GetProfileByUserIdAsync(Guid currentUserId, Guid userId)
    {
        var blocked = await _blockService.IsBlockedAsync(currentUserId, userId);
        if (blocked)
        {
            throw new UnauthorizedAccessException("You cannot view this profile");
        }
        var blocking = await _blockService.IsBlockedAsync(userId, currentUserId);
        if (blocking)
        {
            throw new UnauthorizedAccessException("You cannot view this profile");
        }
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            throw new KeyNotFoundException("User profile not found");
        }

        return MapToDto(profile);
    }

    public async Task<UserProfileDto> CreateProfileAsync(Guid userId, string username)
    {
        // Check if profile already exists
        var existingProfile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (existingProfile != null)
        {
            throw new InvalidOperationException("Profile already exists for this user");
        }

        var profile = new UserProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            DisplayName = username, // Default to username
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.UserProfiles.Add(profile);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created profile for user {UserId}", userId);

        return MapToDto(profile);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            throw new KeyNotFoundException("Profile not found");
        }

        // Update basic fields
        if (request.DisplayName != null)
        {
            var trimmedDisplayName = request.DisplayName.Trim();
            if (string.IsNullOrWhiteSpace(trimmedDisplayName))
            {
                throw new ArgumentException("Display name cannot be empty");
            }
            if (trimmedDisplayName.Length > 100)
            {
                throw new ArgumentException("Display name cannot exceed 100 characters");
            }
            // Check for duplicate display name (case-insensitive)
            var displayNameExists = await _context.UserProfiles
                .AnyAsync(p => p.DisplayName != null &&
                               EF.Functions.ILike(p.DisplayName, trimmedDisplayName) &&
                               p.UserId != userId);
            if (displayNameExists)
            {
                throw new InvalidOperationException("Display name is already taken");
            }
            profile.DisplayName = trimmedDisplayName;
        }

        if (request.Bio != null)
            profile.Bio = request.Bio;

        if (request.AvatarUrl != null)
        {
            ThrowIfEphemeralMediaUrl(nameof(request.AvatarUrl), request.AvatarUrl);
            profile.AvatarUrl = request.AvatarUrl;
        }

        if (request.CoverImageUrl != null)
        {
            ThrowIfEphemeralMediaUrl(nameof(request.CoverImageUrl), request.CoverImageUrl);
            profile.CoverImageUrl = request.CoverImageUrl;
        }

        if (request.DateOfBirth.HasValue)
            profile.DateOfBirth = request.DateOfBirth.Value;

        if (request.Location != null)
            profile.Location = request.Location;

        if (request.Website != null)
            profile.Website = request.Website;

        if (request.FullName != null)
            profile.FullName = request.FullName;

        if (request.Gender != null)
            profile.Gender = request.Gender;

        // Update social links if provided
        if (request.SocialLinks != null)
        {
            // Remove existing links
            _context.SocialLinks.RemoveRange(profile.SocialLinks);

            // Add new links
            foreach (var linkDto in request.SocialLinks)
            {
                profile.SocialLinks.Add(new SocialLink
                {
                    Id = Guid.NewGuid(),
                    UserProfileId = profile.Id,
                    Platform = linkDto.Platform,
                    Url = linkDto.Url,
                    DisplayOrder = linkDto.DisplayOrder
                });
            }
        }

        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated profile for user {UserId}", userId);

        return MapToDto(profile);
    }

    public async Task DeleteProfileAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile != null)
        {
            _context.UserProfiles.Remove(profile);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Deleted profile for user {UserId}", userId);
        }
    }

    private static UserProfileDto MapToDto(UserProfile profile)
    {
        return new UserProfileDto
        {
            Id = profile.Id,
            UserId = profile.UserId,
            DisplayName = profile.DisplayName,
            Bio = profile.Bio,
            AvatarUrl = profile.AvatarUrl,
            CoverImageUrl = profile.CoverImageUrl,
            DateOfBirth = profile.DateOfBirth == default ? null : profile.DateOfBirth,
            Location = profile.Location,
            Website = profile.Website,
            FullName = profile.FullName,
            Gender = profile.Gender,
            SocialLinks = profile.SocialLinks.Select(sl => new SocialLinkDto
            {
                Id = sl.Id,
                Platform = sl.Platform,
                Url = sl.Url,
                DisplayOrder = sl.DisplayOrder
            }).OrderBy(sl => sl.DisplayOrder).ToList()
        };
    }
    public async Task<UserProfileDto> UpdateAvatarAsync(Guid userId, string avatarUrl)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            throw new KeyNotFoundException("Profile not found");
        }

        // Delete old avatar from Cloudinary if exists
        if (!string.IsNullOrEmpty(profile.AvatarPublicId))
        {
            await _cloudinaryService.DeleteImageAsync(profile.AvatarPublicId);
        }

        // Extract public ID from Cloudinary URL
        var publicId = ExtractPublicIdFromUrl(avatarUrl);

        profile.AvatarUrl = avatarUrl;
        profile.AvatarPublicId = publicId;
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated avatar for user {UserId}", userId);

        return MapToDto(profile);
    }
    public async Task<UserProfileDto> UpdateCoverImageAsync(Guid userId, string coverImageUrl)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            throw new KeyNotFoundException("Profile not found");
        }

        // Delete old cover image from Cloudinary if exists
        if (!string.IsNullOrEmpty(profile.CoverImagePublicId))
        {
            await _cloudinaryService.DeleteImageAsync(profile.CoverImagePublicId);
        }

        // Extract public ID from Cloudinary URL
        var publicId = ExtractPublicIdFromUrl(coverImageUrl);

        profile.CoverImageUrl = coverImageUrl;
        profile.CoverImagePublicId = publicId;
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated cover image for user {UserId}", userId);

        return MapToDto(profile);
    }


    private static string? ExtractPublicIdFromUrl(string url)
    {
        // Extract public ID from Cloudinary URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/uitvibes/avatars/abc123.jpg
        // Public ID: uitvibes/avatars/abc123

        try
        {
            var uri = new Uri(url);
            var segments = uri.AbsolutePath.Split('/');

            // Find "upload" or "image" segment
            var uploadIndex = Array.FindIndex(segments, s => s == "upload");
            if (uploadIndex >= 0 && uploadIndex < segments.Length - 2)
            {
                // Skip version (v1234567890) if exists
                var startIndex = segments[uploadIndex + 1].StartsWith('v') ? uploadIndex + 2 : uploadIndex + 1;
                var publicIdParts = segments[startIndex..];

                // Remove file extension from last part
                var lastPart = publicIdParts[^1];
                var lastPartWithoutExt = Path.GetFileNameWithoutExtension(lastPart);
                publicIdParts[^1] = lastPartWithoutExt;

                return string.Join("/", publicIdParts);
            }
        }
        catch (Exception)
        {
            return null;
        }

        return null;
    }
    public async Task<UserProfileDto> UpdateBioAsync(Guid userId, string? bio)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            throw new KeyNotFoundException("Profile not found");
        }
        // Validate bio length
        if (bio != null && bio.Length > 500)
        {
            throw new ArgumentException("Bio cannot exceed 500 characters");
        }
        profile.Bio = bio;
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        _logger.LogInformation("Updated bio for user {UserId}", userId);
        return MapToDto(profile);
    }

    public async Task<UserProfileDto> DeleteAvatarAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            throw new KeyNotFoundException("Profile not found");
        }

        if (!string.IsNullOrEmpty(profile.AvatarPublicId))
        {
            await _cloudinaryService.DeleteImageAsync(profile.AvatarPublicId);
        }

        profile.AvatarUrl = null;
        profile.AvatarPublicId = null;
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted avatar for user {UserId}", userId);
        return MapToDto(profile);
    }

    public async Task<UserProfileDto> DeleteCoverImageAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            throw new KeyNotFoundException("Profile not found");
        }

        if (!string.IsNullOrEmpty(profile.CoverImagePublicId))
        {
            await _cloudinaryService.DeleteImageAsync(profile.CoverImagePublicId);
        }

        profile.CoverImageUrl = null;
        profile.CoverImagePublicId = null;
        profile.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted cover image for user {UserId}", userId);
        return MapToDto(profile);
    }

    private static void ThrowIfEphemeralMediaUrl(string fieldName, string url)
    {
        var t = url.Trim();
        if (t.StartsWith("blob:", StringComparison.OrdinalIgnoreCase) ||
            t.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
            t.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException(
                $"{fieldName} must be a permanent https URL or uploaded via the avatar/cover endpoints, not a browser-local blob/data/file URL.");
        }
    }

    public async Task<List<SearchUserProfileDto>> SearchUserProfileAsync(string search, Guid? currentUserId = null)
    {
        if (!string.IsNullOrWhiteSpace(search))
        {
            // Build cache key: per-user so blocked results are excluded per user
            var normalizedQuery = search.ToLower().Trim();
            var cacheKey = currentUserId.HasValue
                ? $"search:{currentUserId}:{normalizedQuery}"
                : $"search:{normalizedQuery}";

            var cached = await _cache.GetStringAsync(cacheKey);
            List<SearchUserProfileDto> results;

            if (cached != null)
            {
                results = JsonSerializer.Deserialize<List<SearchUserProfileDto>>(cached, _jsonOptions)!;
            }
            else
            {
                IQueryable<UserProfile> baseQuery = _context.UserProfiles
                    .Where(p =>
                        EF.Functions.ILike(p.DisplayName!, $"%{search}%") ||
                        (p.Bio != null && EF.Functions.ILike(p.Bio!, $"%{search}%")));

                if (currentUserId.HasValue)
                {
                    var uid = currentUserId.Value;

                    // Load all block relationships involving this user in one shot
                    var allBlockRelations = await _context.Blocks
                        .Where(b => b.BlockerId == uid || b.BlockedId == uid)
                        .Select(b => new { b.BlockerId, b.BlockedId })
                        .ToListAsync();

                    var excludedIds = allBlockRelations
                        .SelectMany(r => new[] { r.BlockerId, r.BlockedId })
                        .Where(id => id != uid)
                        .Distinct()
                        .ToHashSet();

                    baseQuery = baseQuery.Where(p => !excludedIds.Contains(p.UserId));
                }

                results = await baseQuery
                    .Select(p => new SearchUserProfileDto
                    {
                        UserId = p.UserId,
                        DisplayName = p.DisplayName,
                        Bio = p.Bio,
                        AvatarUrl = p.AvatarUrl,
                        AvatarPublicId = p.AvatarPublicId,
                        FollowersCount = p.FollowersCount
                    })
                    .ToListAsync();

                // Cache: include currentUserId in key so each user gets their own result set
                await _cache.SetStringAsync(cacheKey,
                    JsonSerializer.Serialize(results),
                    new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(SearchCacheTtlMinutes)
                    });
            }
            return results;
        }
        else
        {
            throw new ArgumentException("Search query cannot be empty");
        }
    }

    // 2️⃣ Save a user to current user's recent searches
    public async Task SaveRecentSearchAsync(Guid currentUserId, SearchUserProfileDto searchedUser)
    {
        var key = $"recent_searches:{currentUserId}";
        var cached = await _cache.GetStringAsync(key);

        var recentList = cached != null
            ? JsonSerializer.Deserialize<List<SearchUserProfileDto>>(cached, _jsonOptions)!
            : new List<SearchUserProfileDto>();

        // Remove duplicate if already exists
        recentList.RemoveAll(u => u.UserId == searchedUser.UserId);

        // Add to top
        recentList.Insert(0, searchedUser);

        // Keep only last N
        if (recentList.Count > MaxRecentSearches)
            recentList = recentList.Take(MaxRecentSearches).ToList();

        // Save back (e.g. 7 days TTL)
        await _cache.SetStringAsync(key,
            JsonSerializer.Serialize(recentList),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
            });
    }

    // 3️⃣ Get recent searches for a user
    public async Task<List<SearchUserProfileDto>> GetRecentSearchesAsync(Guid currentUserId)
    {
        var key = $"recent_searches:{currentUserId}";
        var cached = await _cache.GetStringAsync(key);

        return cached != null
            ? JsonSerializer.Deserialize<List<SearchUserProfileDto>>(cached, _jsonOptions)!
            : new List<SearchUserProfileDto>();
    }

    // 4️⃣ Remove one recent search
    public async Task RemoveRecentSearchAsync(Guid currentUserId, Guid targetUserId)
    {
        var key = $"recent_searches:{currentUserId}";
        var cached = await _cache.GetStringAsync(key);
        if (cached == null) return;

        var recentList = JsonSerializer.Deserialize<List<SearchUserProfileDto>>(cached, _jsonOptions)!;
        recentList.RemoveAll(u => u.UserId == targetUserId);

        await _cache.SetStringAsync(key, JsonSerializer.Serialize(recentList),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
            });
    }

    public async Task<SetDisplayNameDto> UpdateDisplayNameAsync(Guid currentUserId, string displayName)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == currentUserId);

        if (profile == null)
        {
            throw new KeyNotFoundException("Profile not found");
        }

        var exist = await _context.UserProfiles.AnyAsync(p => p.DisplayName == displayName && p.UserId != currentUserId);
        if (exist)
        {
            throw new ArgumentException("Display name is already taken");
        }

        var trimmedDisplayName = displayName?.Trim();
        if (string.IsNullOrWhiteSpace(trimmedDisplayName))
        {
            throw new ArgumentException("Display name cannot be empty");
        }

        if (trimmedDisplayName.Length > 100)
        {
            throw new ArgumentException("Display name cannot exceed 100 characters");
        }

        profile.DisplayName = trimmedDisplayName;
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated display name for user {UserId}", currentUserId);

        return new SetDisplayNameDto
        {
            DisplayName = profile.DisplayName!
        };
    }

    public async Task<bool> IsDisplayNameAvailableAsync(string displayName)
    {
        var trimmed = displayName?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return false;
        }

        return !await _context.UserProfiles
            .AnyAsync(p => p.DisplayName != null &&
                           EF.Functions.ILike(p.DisplayName, trimmed));
    }

    public async Task<List<UserProfileDto>> GetAllUserProfilesAsync(int skip = 0, int take = 20)
    {
        return await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .Skip(skip)
            .Take(take)
            .Select(p => MapToDto(p))
            .ToListAsync();
    }
    public async Task<List<UserReportDto>> GetUserReportsAsync(
        int skip = 0, 
        int take = 20,
        ReportStatus? status = null)
    {

        var query = _context.UserReports
        .AsQueryable();

        // Filter theo status nếu có
        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        var reports = await query
           .OrderByDescending(r => r.CreatedAt)
           .Skip(skip)
           .Take(take)
           .ToListAsync();


        // Lấy tất cả UserId liên quan
        var userIds = reports
            .SelectMany(r => new[] { r.ReporterId, r.TargetUserId })
            .Distinct()
            .ToList();

        // Query UserProfile một lần duy nhất
        var profiles = await _context.UserProfiles
            .Where(p => userIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, p => p.DisplayName ?? "Someone");

        return reports.Select(r => new UserReportDto
        {
            Id = r.Id,
            ReporterUserId = r.ReporterId,
            ReportedUserId = r.TargetUserId,
            ReporterDisplayName = profiles.GetValueOrDefault(r.ReporterId, "Someone"),
            ReportedDisplayName = profiles.GetValueOrDefault(r.TargetUserId, "Someone"),
            Reason = r.Reason,
            CreatedAt = r.CreatedAt,
            Status = r.Status,
            AdminNote = r.AdminNote,
            ResolvedAt = r.ResolvedAt
        }).ToList();
    }

    public async Task<UserReportDto> CreateUserReportAsync(Guid userId, ReportUserRequest request)
    {
        if (userId == request.TargetUserId)
        {
            throw new ArgumentException("You cannot report yourself");
        }

        var reporter = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (reporter == null)
        {
            throw new KeyNotFoundException("Reporter profile not found");
        }

        var targetProfile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == request.TargetUserId);
        if (targetProfile == null)
        {
            throw new KeyNotFoundException("Target user not found");
        }
        var existingReport = await _context.UserReports
            .FirstOrDefaultAsync(r =>
                r.ReporterId == userId &&
                r.TargetUserId == request.TargetUserId &&
                r.Status == ReportStatus.Pending);

        if (existingReport != null)
        {
            throw new InvalidOperationException("You have already reported this user");
        }


        // Lấy thông tin reporter
        var reporterProfile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var report = new UserReport
        {
            Id = Guid.NewGuid(),
            ReporterId = userId,
            TargetUserId = request.TargetUserId,
            Reason = request.Reason,
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.UserReports.Add(report);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "User {ReporterId} reported user {TargetUserId} for reason: {Reason}",
            userId, request.TargetUserId, request.Reason);

        return new UserReportDto
        {
            Id = report.Id,
            ReporterUserId = report.ReporterId,
            ReportedUserId = report.TargetUserId,
            ReporterDisplayName = reporterProfile?.DisplayName ?? "Someone",
            ReportedDisplayName = targetProfile.DisplayName ?? "Someone",
            Reason = report.Reason,
            CreatedAt = report.CreatedAt,
            Status = report.Status
        };
    }
}