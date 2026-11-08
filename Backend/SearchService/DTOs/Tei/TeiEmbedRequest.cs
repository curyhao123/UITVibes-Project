using System.Text.Json.Serialization;

namespace SearchService.DTOs.Tei;

public record TeiEmbedRequest(
    [property: JsonPropertyName("inputs")] IReadOnlyList<string> Inputs,
    [property: JsonPropertyName("normalize")] bool Normalize,
    [property: JsonPropertyName("truncate")] bool Truncate);
