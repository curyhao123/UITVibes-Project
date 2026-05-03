using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace MessageService.ServiceLayer.Implementation
{
    public class UserProfileRpcClient : IUserProfileRpcClient
    {
        private const string QueueName = "user.profile.get";
        private readonly IConnection _connection; // dùng chung connection
        private readonly ILogger<UserProfileRpcClient> _logger;

        public UserProfileRpcClient(
            IConnection connection,
            ILogger<UserProfileRpcClient> logger)
        {
            _connection = connection;
            _logger = logger;
        }

        public async Task<UserProfileRpcResponse?> GetUserProfileAsync(
            Guid userId,
            CancellationToken cancellationToken = default)
        {
            await using var channel = await _connection.CreateChannelAsync(
                cancellationToken: cancellationToken);

            var replyQueue = await channel.QueueDeclareAsync(
                queue: string.Empty,
                durable: false,
                exclusive: true,
                autoDelete: true,
                arguments: null,
                cancellationToken: cancellationToken);

            var correlationId = Guid.NewGuid().ToString();
            var tcs = new TaskCompletionSource<UserProfileRpcResponse?>(
                TaskCreationOptions.RunContinuationsAsynchronously);

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

            // Subscribe TRƯỚC khi publish
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

            // Timeout 5 giây
            using var cts = CancellationTokenSource
                .CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(5));
            cts.Token.Register(() => tcs.TrySetCanceled());

            try
            {
                return await tcs.Task;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("UserProfile RPC timeout for userId {UserId}", userId);
                return null;
            }
        }
    }
}
