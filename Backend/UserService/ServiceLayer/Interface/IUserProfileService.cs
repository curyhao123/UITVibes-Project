using UserService.DTOs;

namespace UserService.ServiceLayer.Interface;

public interface IUserProfileService
{
    Task<UserProfileDto?> GetProfileByUserIdAsync(Guid currentUserId, Guid userId);
    Task<UserProfileDto> CreateProfileAsync(Guid userId, string username);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<UserProfileDto> UpdateAvatarAsync(Guid userId, string avatarUrl);
    Task<UserProfileDto> UpdateCoverImageAsync(Guid userId, string coverImageUrl);
    Task<UserProfileDto> UpdateBioAsync(Guid userId, string? bio);
    Task DeleteProfileAsync(Guid userId);
}