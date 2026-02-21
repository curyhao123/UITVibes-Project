namespace UserService.DTOs
{
    public class BlockDto
    {
        public Guid Id { get; set; }
        public Guid BlockerId { get; set; }
        public Guid BlockedId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
