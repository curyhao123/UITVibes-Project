using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using SearchService.DTOs;
using SearchService.Enums;
using SearchService.ServiceLayer.Interface;

namespace SearchService.Messaging;

public class SearchIndexRequestedConsumer : BackgroundService
{
    public const string QueueName = "search.index.requested";
    public const string AttemptHeader = "x-search-attempt";
    public const int MaxAttempts = 5;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan ReconnectDelay = TimeSpan.FromSeconds(5);

    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SearchIndexRequestedConsumer> _logger;
    private IConnection? _connection;
    private IChannel? _channel;

    public SearchIndexRequestedConsumer(IServiceProvider serviceProvider, ILogger<SearchIndexRequestedConsumer> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
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
                _logger.LogError(ex, "Failed to consume {Queue}. Retrying in {Delay}s.", QueueName, ReconnectDelay.TotalSeconds);
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
        await _channel.QueueDeclareAsync(QueueName, durable: true, exclusive: false, autoDelete: false,
            arguments: null, cancellationToken: stoppingToken);
        // Xử lý tuần tự: TEI chạy CPU, và tránh hai lần index cùng một bài chạy song song.
        await _channel.BasicQosAsync(0, 1, false, stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += (_, ea) => HandleAsync(_channel, ea, stoppingToken);
        await _channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer, cancellationToken: stoppingToken);

        _logger.LogInformation("SearchIndexRequestedConsumer started on {Queue}", QueueName);
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleAsync(IChannel channel, BasicDeliverEventArgs ea, CancellationToken ct)
    {
        SearchIndexRequestedEvent? evt;
        try
        {
            evt = JsonSerializer.Deserialize<SearchIndexRequestedEvent>(Encoding.UTF8.GetString(ea.Body.ToArray()));
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid search index message. Dropping.");
            await channel.BasicAckAsync(ea.DeliveryTag, false, ct);
            return;
        }

        if (evt is null || !Enum.TryParse<ChunkTargetType>(evt.TargetType, ignoreCase: true, out var targetType))
        {
            await channel.BasicAckAsync(ea.DeliveryTag, false, ct);
            return;
        }

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var indexing = scope.ServiceProvider.GetRequiredService<IIndexingService>();
            await indexing.IndexAsync(evt.TargetId, targetType, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            await RetryLaterAsync(channel, ea, evt, ex, ct);
        }

        await channel.BasicAckAsync(ea.DeliveryTag, false, ct);
    }

    // Publish lại bản sao kèm số lần thử thay vì nack-requeue, để TEI/PostService chết không tạo vòng lặp nóng.
    private async Task RetryLaterAsync(
        IChannel channel, BasicDeliverEventArgs ea, SearchIndexRequestedEvent evt, Exception error, CancellationToken ct)
    {
        var attempt = GetAttempt(ea.BasicProperties) + 1;
        if (attempt >= MaxAttempts)
        {
            _logger.LogError(error, "Giving up indexing {TargetType} {TargetId} after {Attempts} attempts; backfill will reconcile it",
                evt.TargetType, evt.TargetId, attempt);
            return;
        }

        _logger.LogWarning(error, "Indexing {TargetType} {TargetId} failed (attempt {Attempt}/{Max}). Retrying in {Delay}s.",
            evt.TargetType, evt.TargetId, attempt, MaxAttempts, RetryDelay.TotalSeconds);
        await Task.Delay(RetryDelay, ct);

        var props = new BasicProperties
        {
            Persistent = true,
            Headers = new Dictionary<string, object?> { [AttemptHeader] = attempt }
        };
        await channel.BasicPublishAsync(string.Empty, QueueName, false, props, ea.Body, ct);
    }

    public static int GetAttempt(IReadOnlyBasicProperties? props) =>
        props?.Headers is { } headers && headers.TryGetValue(AttemptHeader, out var value)
            ? Convert.ToInt32(value)
            : 0;

    private async Task CleanupAsync()
    {
        try
        {
            if (_channel != null) await _channel.DisposeAsync();
            if (_connection != null) await _connection.DisposeAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error while cleaning up {Queue} connection", QueueName);
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
