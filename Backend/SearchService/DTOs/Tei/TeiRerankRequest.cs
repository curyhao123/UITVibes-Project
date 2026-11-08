using System.Text.Json.Serialization;

namespace SearchService.DTOs.Tei;

public record TeiRerankRequest(
    [property: JsonPropertyName("query")] string Query,
    [property: JsonPropertyName("texts")] IReadOnlyList<string> Texts,
    [property: JsonPropertyName("truncate")] bool Truncate,
    [property: JsonPropertyName("raw_scores")] bool RawScores);
