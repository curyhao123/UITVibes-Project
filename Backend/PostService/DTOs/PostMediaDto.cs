namespace PostService.DTOs;

public class PostMediaDto
{
    public Guid Id { get; set; }
    public MediaTypeDto Type { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public int DisplayOrder { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Duration { get; set; }
}

public enum MediaTypeDto
{
    Image = 0,
    Video = 1,
    Gif = 2
}