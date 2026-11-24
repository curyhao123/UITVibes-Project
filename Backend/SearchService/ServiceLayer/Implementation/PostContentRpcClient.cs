using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SearchService.DTOs;
using SearchService.Enums;
using SearchService.ServiceLayer.Interface;

namespace SearchService.ServiceLayer.Implementation;

public class PostContentRpcClient : IPostContentRpcClient
{
    public const string GetQueue = "search.post.get";
    public const string ExportQueue = "search.post.export";
    private static readonly TimeSpan GetTimeout = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan ExportTimeout = TimeSpan.FromSeconds(30);

    private readonly IConnectionFactory _connectionFactory;
    private readonly ILogger<PostContentRpcClient> _logger;

    public PostContentRpcClient(IConnectionFactory connectionFactory, ILogger<PostContentRpcClient> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
    }

    public Task<SearchPostGetRpcResponse?> GetAsync(
        Guid targetId, ChunkTargetType targetType, CancellationToken ct = default) =>
        CallAsync<SearchPostGetRpcResponse>(GetQueue,
            new SearchPostGetRpcRequest { TargetId = targetId, TargetType = targetType.ToString() },
            GetTimeout, ct);

    public Task<SearchPostExportRpcResponse?> ExportAsync(
        ChunkTargetType targetType, DateTime? afterCreatedAt, Guid? afterId, int limit, CancellationToken ct = default) =>
        CallAsync<SearchPostExportRpcResponse>(ExportQueue,
            new SearchPostExportRpcRequest
            {
                TargetType = targetType.ToString(),
                AfterCreatedAt = afterCreatedAt,
                AfterId = afterId,
                Limit = limit
            },
            ExportTimeout, ct);

    private async Task<TResponse?> CallAsync<TResponse>(
        string queue, object request, TimeSpan timeout, CancellationToken ct) where TResponse : class
    {
        await using var connection = await _connectionFactory.CreateConnectionAsync(ct);
        await using var channel = await connection.CreateChannelAsync(cancellationToken: ct);

        await channel.QueueDeclareAsync(queue, durable: false, exclusive: false, autoDelete: false,
            arguments: null, cancellationToken: ct);
        var replyQueue = await channel.QueueDeclareAsync(string.Empty, durable: false, exclusive: true,
            autoDelete: true, arguments: null, cancellationToken: ct);

        var correlationId = Guid.NewGuid().ToString();
        var tcs = new TaskCompletionSource<TResponse?>(TaskCreationOptions.RunContinuationsAsynchronously);

        var consumer = new AsyncEventingBasicConsumer(channel);
        consumer.ReceivedAsync += (_, ea) =>
        {
            if (ea.BasicProperties?.CorrelationId == correlationId)
            {
                tcs.TrySetResult(JsonSerializer.Deserialize<TResponse>(Encoding.UTF8.GetString(ea.Body.ToArray())));
            }
            return Task.CompletedTask;
        };
        await channel.BasicConsumeAsync(replyQueue.QueueName, autoAck: true, consumer: consumer, cancellationToken: ct);

        var props = new BasicProperties { CorrelationId = correlationId, ReplyTo = replyQueue.QueueName };
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(request));
        await channel.BasicPublishAsync(string.Empty, queue, false, props, body, ct);

        var completed = await Task.WhenAny(tcs.Task, Task.Delay(timeout, ct));
        if (completed != tcs.Task)
        {
            _logger.LogWarning("RPC {Queue} timed out after {Timeout}s", queue, timeout.TotalSeconds);
            return null;
        }
        return await tcs.Task;
    }
}
