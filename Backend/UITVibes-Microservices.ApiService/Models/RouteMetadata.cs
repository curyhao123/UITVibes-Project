namespace UITVibes_Microservices.ApiService.Models;

public class RouteMetadata
{
    public List<ServiceMetadata> Services { get; set; } = new();
}

public class ServiceMetadata
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<EndpointMetadata> Endpoints { get; set; } = new();
}

public class EndpointMetadata
{
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool RequiresAuth { get; set; }
    public string? ContentType { get; set; }
    public object? RequestBody { get; set; }
    public object? QueryParameters { get; set; }
    public object? PathParameters { get; set; }
}