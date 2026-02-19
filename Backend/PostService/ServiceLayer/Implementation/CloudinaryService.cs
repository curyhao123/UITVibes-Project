using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using PostService.ServiceLayer.Interface;

namespace PostService.ServiceLayer.Implementation;

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;
    private readonly ILogger<CloudinaryService> _logger;

    public CloudinaryService(IConfiguration configuration, ILogger<CloudinaryService> logger)
    {
        var cloudName = configuration["Cloudinary:CloudName"] 
            ?? throw new InvalidOperationException("Cloudinary CloudName is not configured");
        var apiKey = configuration["Cloudinary:ApiKey"] 
            ?? throw new InvalidOperationException("Cloudinary ApiKey is not configured");
        var apiSecret = configuration["Cloudinary:ApiSecret"] 
            ?? throw new InvalidOperationException("Cloudinary ApiSecret is not configured");

        var account = new Account(cloudName, apiKey, apiSecret);
        _cloudinary = new Cloudinary(account);
        _logger = logger;
    }

    public async Task<(string Url, string PublicId, int? Width, int? Height)> UploadImageAsync(
        IFormFile file, 
        string folder = "posts")
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is empty");

        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            throw new ArgumentException("Invalid file type. Only images are allowed.");

        if (file.Length > 10 * 1024 * 1024) // 10MB
            throw new ArgumentException("File size must be less than 10MB");

        try
        {
            using var stream = file.OpenReadStream();
            
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                Transformation = new Transformation()
                    .Quality("auto")
                    .FetchFormat("auto")
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                _logger.LogError("Cloudinary upload error: {Error}", uploadResult.Error.Message);
                throw new Exception($"Upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId, uploadResult.Width, uploadResult.Height);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image to Cloudinary");
            throw;
        }
    }

    public async Task<(string Url, string ThumbnailUrl, string PublicId, int? Duration)> UploadVideoAsync(
        IFormFile file, 
        string folder = "posts")
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is empty");

        var allowedTypes = new[] { "video/mp4", "video/mpeg", "video/quicktime" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            throw new ArgumentException("Invalid file type. Only videos are allowed.");

        if (file.Length > 100 * 1024 * 1024) // 100MB
            throw new ArgumentException("Video size must be less than 100MB");

        try
        {
            using var stream = file.OpenReadStream();
            
            var uploadParams = new VideoUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                _logger.LogError("Cloudinary upload error: {Error}", uploadResult.Error.Message);
                throw new Exception($"Upload failed: {uploadResult.Error.Message}");
            }

            // Generate thumbnail
            var thumbnailUrl = _cloudinary.Api.UrlVideoUp
                .Transform(new Transformation().Width(300).Height(300).Crop("fill"))
                .Format("jpg")
                .BuildUrl(uploadResult.PublicId);

            return (uploadResult.SecureUrl.ToString(), thumbnailUrl, uploadResult.PublicId, (int?)uploadResult.Duration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading video to Cloudinary");
            throw;
        }
    }

    public async Task<bool> DeleteMediaAsync(string publicId)
    {
        if (string.IsNullOrEmpty(publicId))
            return false;

        try
        {
            var deletionParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deletionParams);

            return result.Result == "ok";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting media from Cloudinary: {PublicId}", publicId);
            return false;
        }
    }
}