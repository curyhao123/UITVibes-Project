namespace PostService.DTOs
{
    public class ReelMediaUploadResponse
    {
        public string VideoUrl { get; set; } = string.Empty;
        public string VideoPublicId { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public string? ThumbnailPublicId { get; set; }
        public int Duration { get; set; }
    }
}
