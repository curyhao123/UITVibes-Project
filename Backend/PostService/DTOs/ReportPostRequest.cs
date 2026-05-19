namespace PostService.DTOs
{
    public class ReportPostRequest
    {
        public Guid PostId { get; set; }
        public string Reason { get; set; } = string.Empty;

    }
}
