using MessageService.DTOs;
using MessageService.Messaging.Interface;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace MessageService.Messaging.Implementation
{
    public class MessageSentPublisher : IMessageSentPublisher
    {
        private const string QueueName = "message.sent";
        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<MessageSentPublisher> _logger;

        public MessageSentPublisher(
            IConnectionFactory connectionFactory,
            ILogger<MessageSentPublisher> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task PublishAsync(MessageSentEvent evt, CancellationToken ct = default)
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
                _logger.LogError(ex, "Failed to publish MessageSent event");
                throw;
            }
        }
    }
}
