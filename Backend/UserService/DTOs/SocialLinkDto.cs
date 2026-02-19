namespace UserService.DTOs
{
    public class SocialLinkDto
    {
        public Guid Id { get; set; }
        public string Platform { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }
}
