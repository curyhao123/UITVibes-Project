using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace AuthService.Messaging;

public class RabbitMQPublisher : IMessagePublisher
{
    private readonly IConnectionFactory _connectionFactory;
    private readonly ILogger<RabbitMQPublisher> _logger;
    private const string QueueName = "user.created";

    public RabbitMQPublisher(
        IConnectionFactory connectionFactory,
        ILogger<RabbitMQPublisher> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task PublishUserCreatedAsync(Guid userId, string email, string username)
    {
        try
        {
            var connection = await _connectionFactory.CreateConnectionAsync();
            var channel = await connection.CreateChannelAsync();

            await channel.QueueDeclareAsync(
                queue: QueueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null);

            var message = new
            {
                UserId = userId,
                Email = email,
                Username = username,
                CreatedAt = DateTime.UtcNow
            };

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: QueueName,
                body: body);

            _logger.LogInformation("Published UserCreated event for user {UserId}", userId);

            await channel.CloseAsync();
            await connection.CloseAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish UserCreated event for user {UserId}", userId);
            throw;
        }
    }
}