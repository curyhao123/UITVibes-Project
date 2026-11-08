using PostService.DTOs;
using PostService.Messaging.Interface;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace PostService.Messaging.Implementation
{
    /// <summary>
    /// Publish event khoá tài khoản sang AuthService (queue "user.banned").
    ///
    /// Queue name phải khớp với AuthService/RabbitMQPublisher ("user.banned").
    /// Lỗi publish được nuốt ở tầng caller (best-effort) — không được làm hỏng
    /// luồng kiểm duyệt chính.
    /// </summary>
    public class UserBannedPublisher : IUserBannedPublisher
    {
        private const string QueueName = "user.banned";

        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<UserBannedPublisher> _logger;

        public UserBannedPublisher(
            IConnectionFactory connectionFactory,
            ILogger<UserBannedPublisher> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }

        public async Task PublishAsync(UserBannedEvent evt, CancellationToken ct = default)
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

                _logger.LogInformation(
                    "Published user.banned event for user {UserId} (isBanned={IsBanned}).",
                    evt.UserId, evt.IsBanned);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to publish user.banned event for user {UserId}.", evt.UserId);
                throw;
            }
        }
    }
}
