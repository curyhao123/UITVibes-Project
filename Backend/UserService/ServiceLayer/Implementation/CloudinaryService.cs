using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using UserService.ServiceLayer.Interface;

namespace UserService.ServiceLayer.Implementation;

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

    public async Task<string> UploadImageAsync(IFormFile file, string folder = "avatars")
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("File is empty");
        }

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
        {
            throw new ArgumentException("Invalid file type. Only images are allowed.");
        }

        // Validate file size (max 5MB)
        if (file.Length > 5 * 1024 * 1024)
        {
            throw new ArgumentException("File size must be less than 5MB");
        }

        try
        {
            using var stream = file.OpenReadStream();
            
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folder,
                Transformation = new Transformation()
                    .Width(500)
                    .Height(500)
                    .Crop("fill")
                    .Gravity("face")
                    .Quality("auto")
                    .FetchFormat("auto")
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                _logger.LogError("Cloudinary upload error: {Error}", uploadResult.Error.Message);
                throw new Exception($"Upload failed: {uploadResult.Error.Message}");
            }

            _logger.LogInformation("Image uploaded successfully to Cloudinary: {PublicId}", uploadResult.PublicId);
            
            return uploadResult.SecureUrl.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading image to Cloudinary");
            throw;
        }
    }

    public async Task<bool> DeleteImageAsync(string publicId)
    {
        if (string.IsNullOrEmpty(publicId))
        {
            return false;
        }

        try
        {
            var deletionParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deletionParams);

            if (result.Result == "ok")
            {
                _logger.LogInformation("Image deleted successfully from Cloudinary: {PublicId}", publicId);
                return true;
            }

            _logger.LogWarning("Failed to delete image from Cloudinary: {PublicId}, Result: {Result}", 
                publicId, result.Result);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting image from Cloudinary: {PublicId}", publicId);
            return false;
        }
    }
}