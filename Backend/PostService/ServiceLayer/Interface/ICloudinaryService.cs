namespace PostService.ServiceLayer.Interface;

public interface ICloudinaryService
{
    Task<(string Url, string PublicId, int? Width, int? Height)> UploadImageAsync(
        IFormFile file, 
        string folder = "posts");
    
    Task<(string Url, string ThumbnailUrl, string PublicId, int? Duration)> UploadVideoAsync(
        IFormFile file, 
        string folder = "posts");
    
    Task<bool> DeleteMediaAsync(string publicId);
}