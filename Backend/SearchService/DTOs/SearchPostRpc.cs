namespace SearchService.DTOs;

public class SearchPostGetRpcRequest
{
    public Guid TargetId { get; set; }
    public string TargetType { get; set; } = string.Empty;
}

public class SearchPostGetRpcResponse
{
    public bool Found { get; set; }
    public SearchPostDocument? Document { get; set; }
}

public class SearchPostExportRpcRequest
{
    public string TargetType { get; set; } = string.Empty;
    public DateTime? AfterCreatedAt { get; set; }
    public Guid? AfterId { get; set; }
    public int Limit { get; set; } = 100;
}

public class SearchPostExportRpcResponse
{
    public List<SearchPostDocument> Items { get; set; } = [];
    public bool HasMore { get; set; }
}

public class SearchPostDocument
{
    public Guid TargetId { get; set; }
    public string TargetType { get; set; } = string.Empty;
    public Guid AuthorId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? OcrText { get; set; }
    public List<string> Hashtags { get; set; } = [];
    public int Visibility { get; set; }
    public bool Searchable { get; set; }
    public DateTime CreatedAt { get; set; }
}
