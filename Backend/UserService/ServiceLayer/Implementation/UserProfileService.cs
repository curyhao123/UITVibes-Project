using Microsoft.EntityFrameworkCore;
using UserService.DTOs;
using UserService.Models;
using UserService.ServiceLayer.Interface;

namespace UserService.ServiceLayer.Implementation;

public class UserProfileService : IUserProfileService
{
    private readonly UserDbContext _context;
    private readonly ILogger<UserProfileService> _logger;
    private readonly ICloudinaryService _cloudinaryService;

    public UserProfileService(
        UserDbContext context, 
        ILogger<UserProfileService> logger,
        ICloudinaryService cloudinaryService)
    {
        _context = context;
        _logger = logger;
        _cloudinaryService = cloudinaryService;
    }

    public async Task<UserProfileDto?> GetProfileByUserIdAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .Include(p => p.SocialLinks)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            return null;
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
            profile.DisplayName = request.DisplayName;
        
        if (request.Bio != null)
            profile.Bio = request.Bio;
        
        if (request.AvatarUrl != null)
            profile.AvatarUrl = request.AvatarUrl;
        
        if (request.CoverImageUrl != null)
            profile.CoverImageUrl = request.CoverImageUrl;
        
        if (request.DateOfBirth.HasValue)
            profile.DateOfBirth = request.DateOfBirth.Value;
        
        if (request.Location != null)
            profile.Location = request.Location;
        
        if (request.Website != null)
            profile.Website = request.Website;

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
}