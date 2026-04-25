using PostService.DTOs;
using PostService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace PostService.ServiceLayer.Implementation
{
    public class UserProfileRpcClient: IUserProfileRpcClient
    {
        private const string QueueName = "user.profile.get";
        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<UserProfileRpcClient> _logger;

        public UserProfileRpcClient(IConnectionFactory connectionFactory, ILogger<UserProfileRpcClient> logger)
        {
            _connectionFactory = connectionFactory;
            _logger = logger;
        }
        public async Task<UserProfileRpcResponse?> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            await using var connection = await _connectionFactory.CreateConnectionAsync(cancellationToken);
            await using var channel = await connection.CreateChannelAsync(cancellationToken: cancellationToken);

            await channel.QueueDeclareAsync(
                queue: QueueName,
                durable: false,
                exclusive: false,
                autoDelete: false,
                arguments: null,
                cancellationToken: cancellationToken);

            var replyQueue = await channel.QueueDeclareAsync(
                queue: string.Empty,
                durable: false,
                exclusive: true,
                autoDelete: true,
                arguments: null,
                cancellationToken: cancellationToken);

            var correlationId = Guid.NewGuid().ToString();
            var tcs = new TaskCompletionSource<UserProfileRpcResponse?>(TaskCreationOptions.RunContinuationsAsynchronously);

            var consumer = new AsyncEventingBasicConsumer(channel);
            consumer.ReceivedAsync += async (_, ea) =>
            {
                if (ea.BasicProperties?.CorrelationId == correlationId)
                {
                    var payload = Encoding.UTF8.GetString(ea.Body.ToArray());
                    var response = JsonSerializer.Deserialize<UserProfileRpcResponse>(payload);
                    tcs.TrySetResult(response);
                }

                await Task.CompletedTask;
            };

            await channel.BasicConsumeAsync(
                queue: replyQueue.QueueName,
                autoAck: true,
                consumer: consumer,
                cancellationToken: cancellationToken);

            var request = new UserProfileRpcRequest { UserId = userId };
            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request));

            var properties = new BasicProperties
            {
                CorrelationId = correlationId,
                ReplyTo = replyQueue.QueueName
            };

            await channel.BasicPublishAsync(
                exchange: string.Empty,
                routingKey: QueueName,
                mandatory: false,
                basicProperties: properties,
                body: body,
                cancellationToken: cancellationToken);

            var timeout = Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
            var completed = await Task.WhenAny(tcs.Task, timeout);
            if (completed != tcs.Task)
            {
                _logger.LogWarning("User profile RPC timeout for user {UserId}", userId);
                return null;
            }

            return await tcs.Task;
        }
    }
}
