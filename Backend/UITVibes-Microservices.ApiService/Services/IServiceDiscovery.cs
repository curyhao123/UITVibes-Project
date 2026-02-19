namespace UITVibes_Microservices.ApiService.Services;


public interface IServiceDiscovery
{
        string GetAuthServiceUrl();
        string GetUserServiceUrl();
        string GetPostServiceUrl();
}

