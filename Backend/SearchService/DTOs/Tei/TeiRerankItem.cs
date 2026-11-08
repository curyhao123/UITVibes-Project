using System.Text.Json.Serialization;

namespace SearchService.DTOs.Tei;

public record TeiRerankItem(
    [property: JsonPropertyName("index")] int Index,
    [property: JsonPropertyName("score")] float Score);
