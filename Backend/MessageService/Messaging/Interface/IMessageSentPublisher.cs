using MessageService.DTOs;

namespace MessageService.Messaging.Interface
{
    public interface IMessageSentPublisher
    {
        Task PublishAsync(MessageSentEvent evt, CancellationToken ct = default);
    }
}
