namespace UITVibes_Microservices.ApiService.Services;



public class ServiceDiscovery : IServiceDiscovery
{
    private readonly IConfiguration _configuration;

    public ServiceDiscovery(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GetAuthServiceUrl()
    {
        // Aspire injects service URLs via configuration
        return _configuration["services:authservice:https:0"] 
            ?? _configuration["services:authservice:http:0"]
            ?? "https://localhost:7233";
    }

    public string GetUserServiceUrl()
    {
        return _configuration["services:userservice:https:0"] 
            ?? _configuration["services:userservice:http:0"]
            ?? "https://localhost:7234";
    }
    public string GetPostServiceUrl()
    {
        return _configuration["services:postservice:https:0"]
            ?? _configuration["services:postservice:http:0"]
            ?? "https://localhost:7146"; // Default port
    }
}