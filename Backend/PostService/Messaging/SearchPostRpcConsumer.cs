using System.Text;
using System.Text.Json;
using PostService.DTOs;
using PostService.Enums;
using PostService.ServiceLayer.Interface;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace PostService.Messaging;

/// <summary>RPC cho SearchService: lấy một Post/Reel ("search.post.get") và export phân trang ("search.post.export").</summary>
public class SearchPostRpcConsumer : BackgroundService
{
    public const string GetQueue = "search.post.get";
    public const string ExportQueue = "search.post.export";
    private static readonly TimeSpan ReconnectDelay = TimeSpan.FromSeconds(5);

    private readonly ILogger<SearchPostRpcConsumer> _logger;
    private readonly IServiceProvider _serviceProvider;
    private IConnection? _connection;
    private IChannel? _channel;

    public SearchPostRpcConsumer(ILogger<SearchPostRpcConsumer> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Giống PostCountRpcConsumer: không để exception thoát ra làm dừng cả host.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ConsumeAsync(stoppingToken);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SearchPostRpcConsumer failed. Retrying in {Delay}s.", ReconnectDelay.TotalSeconds);
                await CleanupAsync();
                try
                {
                    await Task.Delay(ReconnectDelay, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }

    private async Task ConsumeAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var connectionFactory = scope.ServiceProvider.GetRequiredService<IConnectionFactory>();

        _connection = await connectionFactory.CreateConnectionAsync(stoppingToken);
        _channel = await _connection.CreateChannelAsync(cancellationToken: stoppingToken);
        await _channel.BasicQosAsync(0, 4, false, stoppingToken);

        foreach (var queue in new[] { GetQueue, ExportQueue })
        {
            await _channel.QueueDeclareAsync(queue, durable: false, exclusive: false, autoDelete: false,
                arguments: null, cancellationToken: stoppingToken);

            var consumer = new AsyncEventingBasicConsumer(_channel);
            consumer.ReceivedAsync += (_, ea) => HandleAsync(ea, stoppingToken);
            await _channel.BasicConsumeAsync(queue, autoAck: false, consumer: consumer, cancellationToken: stoppingToken);
        }

        _logger.LogInformation("SearchPostRpcConsumer started on {GetQueue} and {ExportQueue}", GetQueue, ExportQueue);
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleAsync(BasicDeliverEventArgs ea, CancellationToken ct)
    {
        object response;
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var documents = scope.ServiceProvider.GetRequiredService<ISearchDocumentService>();
            var payload = Encoding.UTF8.GetString(ea.Body.ToArray());

            response = ea.RoutingKey == ExportQueue
                ? await HandleExportAsync(documents, payload, ct)
                : await HandleGetAsync(documents, payload, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing search RPC on {Queue}", ea.RoutingKey);
            response = ea.RoutingKey == ExportQueue
                ? new SearchPostExportRpcResponse()
                : new SearchPostGetRpcResponse();
        }

        var replyTo = ea.BasicProperties?.ReplyTo;
        if (!string.IsNullOrEmpty(replyTo) && _channel != null)
        {
            var props = new BasicProperties { CorrelationId = ea.BasicProperties?.CorrelationId };
            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(response));
            await _channel.BasicPublishAsync(string.Empty, replyTo, false, props, body, ct);
        }

        if (_channel != null) await _channel.BasicAckAsync(ea.DeliveryTag, false, ct);
    }

    private static async Task<SearchPostGetRpcResponse> HandleGetAsync(
        ISearchDocumentService documents, string payload, CancellationToken ct)
    {
        var request = JsonSerializer.Deserialize<SearchPostGetRpcRequest>(payload);
        if (request is null || !TryParseTarget(request.TargetType, out var type))
            return new SearchPostGetRpcResponse();

        var doc = await documents.GetAsync(type, request.TargetId, ct);
        return new SearchPostGetRpcResponse { Found = doc != null, Document = doc };
    }

    private static async Task<SearchPostExportRpcResponse> HandleExportAsync(
        ISearchDocumentService documents, string payload, CancellationToken ct)
    {
        var request = JsonSerializer.Deserialize<SearchPostExportRpcRequest>(payload);
        if (request is null || !TryParseTarget(request.TargetType, out var type))
            return new SearchPostExportRpcResponse();

        return await documents.ExportAsync(type, request.AfterCreatedAt, request.AfterId, request.Limit, ct);
    }

    private static bool TryParseTarget(string value, out ModerationTargetType type) =>
        Enum.TryParse(value, ignoreCase: true, out type)
        && type is ModerationTargetType.Post or ModerationTargetType.Reel;

    private async Task CleanupAsync()
    {
        try
        {
            if (_channel != null) await _channel.DisposeAsync();
            if (_connection != null) await _connection.DisposeAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error while cleaning up SearchPostRpcConsumer connection");
        }
        finally
        {
            _channel = null;
            _connection = null;
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await CleanupAsync();
        await base.StopAsync(cancellationToken);
    }
}
