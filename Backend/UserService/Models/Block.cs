namespace UserService.Models
{
    public class Block
    {
        public Guid Id { get; set; }
        public Guid BlockerId { get; set; } // UserId of the blocker (from AuthService)
        public Guid BlockedId { get; set; } // UserId of the blocked user (from AuthService)
        public DateTime CreatedAt { get; set; }
    }
}
