using PostService.DTOs;
using PostService.Models;

namespace PostService.Messaging.Interface
{
    public interface IPostMentionedPublisher
    {
        Task PublishAsync(PostMentionedEvent evt, CancellationToken ct = default);
    }
}
