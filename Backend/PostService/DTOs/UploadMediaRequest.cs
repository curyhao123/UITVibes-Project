namespace PostService.DTOs;

public class UploadMediaRequest
{
    public IFormFile File { get; set; } = null!;
}