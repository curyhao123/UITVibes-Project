namespace PostService.DTOs
{
    public class CreateReelCommentRequest
    {
        public string Content { get; set; } = string.Empty;
        public Guid? ParentCommentId { get; set; }  // null = comment gốc, có giá trị = reply
    }
}
