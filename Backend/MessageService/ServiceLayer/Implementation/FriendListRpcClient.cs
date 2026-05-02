using MessageService.DTOs;
using MessageService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;
using UserService.DTOs;

namespace MessageService.ServiceLayer.Implementation;

public class FriendListRpcClient : IFriendListRpcClient
{
    private const string QueueName = "friend.get";
    private readonly IConnectionFactory _connectionFactory;
    private readonly ILogger<FriendListRpcClient> _logger;

    public FriendListRpcClient(IConnectionFactory connectionFactory, ILogger<FriendListRpcClient> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public async Task<List<FriendSummaryDto>> GetFriendListAsync(
        Guid userId,
        int skip = 0,
        int take = 50,
        CancellationToken cancellationToken = default)
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
        var tcs = new TaskCompletionSource<FriendListRpcResponse?>(TaskCreationOptions.RunContinuationsAsynchronously);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += async (_, ea) =>
        {
            if (ea.BasicProperties?.CorrelationId == correlationId)
            {
                var payload = Encoding.UTF8.GetString(ea.Body.ToArray());
                var response = JsonSerializer.Deserialize<FriendListRpcResponse>(payload);
                tcs.TrySetResult(response);
            }

            await Task.CompletedTask;
        };

        await channel.BasicConsumeAsync(
            queue: replyQueue.QueueName,
            autoAck: true,
            consumer: consumer,
            cancellationToken: cancellationToken);

        var request = new FriendListRpcRequest
        {
            UserId = userId,
            Skip = skip,
            Take = take
        };

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
            _logger.LogWarning("Friend list RPC timeout for user {UserId}", userId);
            return new List<FriendSummaryDto>();
        }

        var response = await tcs.Task;
        return response?.Friends?
            .Select(f => new FriendSummaryDto
            {
                UserId = f.UserId,
                DisplayName = f.DisplayName,
                AvatarUrl = f.AvatarUrl
            }).ToList() ?? new List<FriendSummaryDto>();
    }
}