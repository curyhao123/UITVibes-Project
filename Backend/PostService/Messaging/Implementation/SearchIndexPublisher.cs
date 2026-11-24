using System.Text;
using System.Text.Json;
using PostService.DTOs;
using PostService.Messaging.Interface;
using RabbitMQ.Client;

namespace PostService.Messaging.Implementation;

public class SearchIndexPublisher : ISearchIndexPublisher
{
    public const string QueueName = "search.index.requested";
    public static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(2);

    private readonly Func<IConnection> _connectionProvider;
    private readonly ILogger<SearchIndexPublisher> _logger;
    private readonly TimeSpan _timeout;
    private volatile bool _queueDeclared;

    // Lấy connection lazy bên trong try: RabbitMQ chết lúc resolve DI cũng không làm hỏng request.
    public SearchIndexPublisher(Func<IConnection> connectionProvider, ILogger<SearchIndexPublisher> logger, TimeSpan? timeout = null)
    {
        _connectionProvider = connectionProvider;
        _logger = logger;
        _timeout = timeout ?? DefaultTimeout;
    }

    public async Task PublishAsync(IReadOnlyCollection<SearchIndexRequestedEvent> events, CancellationToken ct = default)
    {
        if (events.Count == 0) return;

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(_timeout);

            var connection = await Task.Run(_connectionProvider, cts.Token).WaitAsync(cts.Token);
            // Connection dùng chung cho cả service nên tuyệt đối không đóng; chỉ đóng channel.
            await using var channel = await connection.CreateChannelAsync(cancellationToken: cts.Token);

            if (!_queueDeclared)
            {
                await channel.QueueDeclareAsync(QueueName, durable: true, exclusive: false, autoDelete: false,
                    arguments: null, cancellationToken: cts.Token);
                _queueDeclared = true;
            }

            var props = new BasicProperties { Persistent = true };
            foreach (var evt in events)
            {
                var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(evt));
                await channel.BasicPublishAsync(string.Empty, QueueName, false, props, body, cts.Token);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to publish {Count} search index events; backfill will reconcile them", events.Count);
        }
    }
}
