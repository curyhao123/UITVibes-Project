using PostService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace PostService.ServiceLayer.Implementation;

/// <summary>
/// Sends a RabbitMQ RPC request to UserService to get the list of user IDs
/// that a given user follows. The response is a JSON array of Guids.
/// </summary>
public class UserFollowRpcClient : IUserFollowRpcClient
{
    private const string QueueName = "user.follow.get";
    private readonly IConnectionFactory _connectionFactory;
    private readonly ILogger<UserFollowRpcClient> _logger;

    public UserFollowRpcClient(IConnectionFactory connectionFactory, ILogger<UserFollowRpcClient> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<List<Guid>> GetFollowingIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
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
            var tcs = new TaskCompletionSource<List<Guid>>(TaskCreationOptions.RunContinuationsAsynchronously);

            var consumer = new AsyncEventingBasicConsumer(channel);
            consumer.ReceivedAsync += async (_, ea) =>
            {
                if (ea.BasicProperties?.CorrelationId == correlationId)
                {
                    try
                    {
                        var payload = Encoding.UTF8.GetString(ea.Body.ToArray());
                        var ids = JsonSerializer.Deserialize<List<Guid>>(payload);
                        tcs.TrySetResult(ids ?? new List<Guid>());
                    }
                    catch
                    {
                        tcs.TrySetResult(new List<Guid>());
                    }
                }
                await Task.CompletedTask;
            };

            await channel.BasicConsumeAsync(
                queue: replyQueue.QueueName,
                autoAck: true,
                consumer: consumer,
                cancellationToken: cancellationToken);

            var request = new { UserId = userId };
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
                _logger.LogWarning("Follow RPC timeout for user {UserId}", userId);
                return new List<Guid>();
            }

            return await tcs.Task;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Follow RPC failed for user {UserId}", userId);
            return new List<Guid>();
        }
    }
}
