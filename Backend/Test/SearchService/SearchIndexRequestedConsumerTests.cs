using RabbitMQ.Client;
using SearchService.Messaging;

namespace Test.SearchService;

public class SearchIndexRequestedConsumerTests
{
    [Fact]
    public void GetAttempt_NoHeader_IsZero()
    {
        Assert.Equal(0, SearchIndexRequestedConsumer.GetAttempt(new BasicProperties()));
        Assert.Equal(0, SearchIndexRequestedConsumer.GetAttempt(null));
    }

    [Theory]
    [InlineData(3)]
    [InlineData(3L)]
    public void GetAttempt_ReadsIntOrLongHeader(object value)
    {
        var props = new BasicProperties
        {
            Headers = new Dictionary<string, object?> { [SearchIndexRequestedConsumer.AttemptHeader] = value }
        };

        Assert.Equal(3, SearchIndexRequestedConsumer.GetAttempt(props));
    }
}
