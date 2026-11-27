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
        // Mỗi service dùng một queue riêng cho cùng một event. Nếu cùng consume
        // một queue, RabbitMQ sẽ chia message ngẫu nhiên (competing consumers) →
        // AuthService hoặc UserService có thể không bao giờ nhận được event ban.
        private const string QueueNameUserBanned = "user.banned";
        private const string QueueNameUserBannedAuth = "user.banned.auth";

        private static readonly string[] BannedQueues =
            { QueueNameUserBanned, QueueNameUserBannedAuth };

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

                foreach (var queue in BannedQueues)
                {
                    await channel.QueueDeclareAsync(
                        queue: queue,
                        durable: true,
                        exclusive: false,
                        autoDelete: false,
                        arguments: null,
                        cancellationToken: ct);
                }

                var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));

                foreach (var queue in BannedQueues)
                {
                    await channel.BasicPublishAsync(
                        exchange: string.Empty,
                        routingKey: queue,
                        body: body,
                        cancellationToken: ct);
                }

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
