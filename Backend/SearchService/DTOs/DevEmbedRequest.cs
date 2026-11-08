namespace SearchService.DTOs;

public class DevEmbedRequest
{
    public List<string> Texts { get; set; } = new();
}

public class DevRerankRequest
{
    public string Query { get; set; } = string.Empty;
    public List<string> Texts { get; set; } = new();
}
