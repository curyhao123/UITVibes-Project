using PostService.DTOs;
using PostService.Messaging.Interface;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace PostService.Messaging.Implementation
{
    /// <summary>
    /// Publish sự kiện kiểm duyệt nội dung tới NotificationService.
    ///
    /// Dùng queue "content.moderated" (default exchange, routing key = tên queue).
    /// Lỗi publish được log và nuốt — không được làm hỏng luồng kiểm duyệt chính
    /// vì thông báo chỉ là thông tin phụ.
    /// </summary>
    public class ContentModeratedPublisher : IContentModeratedPublisher
    {
        private const string QueueName = "content.moderated";
        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<ContentModeratedPublisher> _logger;

        public ContentModeratedPublisher(
            IConnectionFactory connectionFactory,
            ILogger<ContentModeratedPublisher> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task PublishAsync(ContentModeratedEvent evt, CancellationToken ct = default)
        {
            try
            {
                var connection = await _connectionFactory.CreateConnectionAsync(ct);
                var channel = await connection.CreateChannelAsync(cancellationToken: ct);

                await channel.QueueDeclareAsync(
                    queue: QueueName,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null,
                    cancellationToken: ct);

                var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));

                await channel.BasicPublishAsync(
                    exchange: string.Empty,
                    routingKey: QueueName,
                    body: body,
                    cancellationToken: ct);

                await channel.CloseAsync(ct);
                await connection.CloseAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish ContentModerated event for target {TargetId}", evt.TargetId);
                throw;
            }
        }
    }
}
