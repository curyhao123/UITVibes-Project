namespace UserService.ServiceLayer.Interface;

public interface ICloudinaryService
{
    Task<string> UploadImageAsync(IFormFile file, string folder = "avatars");
    Task<bool> DeleteImageAsync(string publicId);
}