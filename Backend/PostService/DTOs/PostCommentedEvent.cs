namespace PostService.DTOs
{
    public record PostCommentedEvent(
         Guid PostOwnerId,
         Guid CommenterId,
         string CommenterName,
         Guid PostId,
         string? CommentPreview
     );
}
