namespace PostService.DTOs
{
    public class PostMediaRequest
    {
        public string Url { get; set; } = string.Empty;
        public string? PublicId { get; set; }
        public string? ThumbnailUrl { get; set; }
        public MediaTypeDto Type { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public int? Duration { get; set; }
        public int DisplayOrder { get; set; }
    }
}
