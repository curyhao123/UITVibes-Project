using System.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PostService.DTOs;
using PostService.Messaging.Implementation;
using RabbitMQ.Client;

namespace Test.PostService.Search;

public class SearchIndexPublisherTests
{
    private readonly Mock<IConnection> _connection = new();
    private readonly Mock<IChannel> _channel = new();

    public SearchIndexPublisherTests()
    {
        _connection
            .Setup(c => c.CreateChannelAsync(It.IsAny<CreateChannelOptions?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(_channel.Object);
    }

    private static List<SearchIndexRequestedEvent> Events(int count) =>
        Enumerable.Range(0, count)
            .Select(_ => new SearchIndexRequestedEvent(Guid.NewGuid(), "Post", DateTime.UtcNow))
            .ToList();

    private SearchIndexPublisher Create(Func<IConnection>? provider = null, TimeSpan? timeout = null) =>
        new(provider ?? (() => _connection.Object), NullLogger<SearchIndexPublisher>.Instance, timeout);

    [Fact]
    public async Task PublishAsync_PublishesEveryEventPersistently_OnOneChannel()
    {
        var publisher = Create();

        await publisher.PublishAsync(Events(3));

        _connection.Verify(c => c.CreateChannelAsync(It.IsAny<CreateChannelOptions?>(), It.IsAny<CancellationToken>()), Times.Once);
        _channel.Verify(c => c.QueueDeclareAsync(SearchIndexPublisher.QueueName, true, false, false,
            It.IsAny<IDictionary<string, object?>>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Once);
        _channel.Verify(c => c.BasicPublishAsync(string.Empty, SearchIndexPublisher.QueueName, false,
            It.Is<BasicProperties>(p => p.Persistent), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()), Times.Exactly(3));
    }

    [Fact]
    public async Task PublishAsync_DeclaresQueueOnlyOnce_AndDisposesChannelButNeverTheSharedConnection()
    {
        var publisher = Create();

        await publisher.PublishAsync(Events(1));
        await publisher.PublishAsync(Events(1));

        _channel.Verify(c => c.QueueDeclareAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<bool>(),
            It.IsAny<IDictionary<string, object?>>(), It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Once);
        _channel.Verify(c => c.DisposeAsync(), Times.Exactly(2));
        _connection.Verify(c => c.CloseAsync(It.IsAny<ushort>(), It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
        _connection.Verify(c => c.Dispose(), Times.Never);
        _connection.Verify(c => c.DisposeAsync(), Times.Never);
    }

    [Fact]
    public async Task PublishAsync_ConnectionUnavailable_SwallowsError()
    {
        var publisher = Create(() => throw new InvalidOperationException("RabbitMQ down"));

        var ex = await Record.ExceptionAsync(() => publisher.PublishAsync(Events(1)));

        Assert.Null(ex);
    }

    [Fact]
    public async Task PublishAsync_PublishThrows_SwallowsError()
    {
        _channel.Setup(c => c.BasicPublishAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>(),
                It.IsAny<BasicProperties>(), It.IsAny<ReadOnlyMemory<byte>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("socket closed"));
        var publisher = Create();

        var ex = await Record.ExceptionAsync(() => publisher.PublishAsync(Events(1)));

        Assert.Null(ex);
    }

    [Fact]
    public async Task PublishAsync_SlowConnection_GivesUpAfterTimeout()
    {
        var publisher = Create(() =>
        {
            Thread.Sleep(TimeSpan.FromSeconds(5));
            return _connection.Object;
        }, TimeSpan.FromMilliseconds(200));

        var sw = Stopwatch.StartNew();
        await publisher.PublishAsync(Events(1));

        Assert.True(sw.Elapsed < TimeSpan.FromSeconds(2), $"took {sw.Elapsed}");
    }

    [Fact]
    public async Task PublishAsync_NoEvents_DoesNotTouchRabbitMq()
    {
        var called = false;
        var publisher = Create(() =>
        {
            called = true;
            return _connection.Object;
        });

        await publisher.PublishAsync([]);

        Assert.False(called);
    }
}
