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
        return _configuration["services:authservice:http:0"]
            ?? _configuration["services:authservice:https:0"]
            ?? "http://localhost:5158";
    }

    public string GetUserServiceUrl()
    {
        return _configuration["services:userservice:http:0"]
            ?? _configuration["services:userservice:https:0"]
            ?? "http://localhost:5016";
    }
    public string GetPostServiceUrl()
    {
        return _configuration["services:postservice:http:0"]
            ?? _configuration["services:postservice:https:0"]
            ?? "http://localhost:5078";
    }
    public string GetMessageServiceUrl()
    {
        return _configuration["services:messageservice:http:0"]
            ?? _configuration["services:messageservice:https:0"]
            ?? "http://localhost:5240";
    }
}
