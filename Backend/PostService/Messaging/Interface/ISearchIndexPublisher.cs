using PostService.DTOs;

namespace PostService.Messaging.Interface;

/// <summary>Báo SearchService index lại; không bao giờ ném lỗi, lỗi chỉ được log.</summary>
public interface ISearchIndexPublisher
{
    Task PublishAsync(IReadOnlyCollection<SearchIndexRequestedEvent> events, CancellationToken ct = default);
}
