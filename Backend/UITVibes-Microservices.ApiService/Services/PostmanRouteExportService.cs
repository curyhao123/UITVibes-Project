using System.Text.Json;
using UITVibes_Microservices.ApiService.Models;

namespace UITVibes_Microservices.ApiService.Services;

public interface IPostmanRouteExportService
{
    JsonDocument GeneratePostmanCollection();
}

public class PostmanRouteExportService : IPostmanRouteExportService
{
    private readonly IWebHostEnvironment _environment;
    private readonly IServiceDiscovery _serviceDiscovery;

    public PostmanRouteExportService(
        IWebHostEnvironment environment,
        IServiceDiscovery serviceDiscovery)
    {
        _environment = environment;
        _serviceDiscovery = serviceDiscovery;
    }

    public JsonDocument GeneratePostmanCollection()
    {
        // Load metadata from JSON file
        var metadataPath = Path.Combine(_environment.ContentRootPath, "route-metadata.json");

        if (!File.Exists(metadataPath))
        {
            throw new FileNotFoundException($"Route metadata file not found: {metadataPath}");
        }

        var json = File.ReadAllText(metadataPath);
        var metadata = JsonSerializer.Deserialize<RouteMetadata>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (metadata == null || !metadata.Services.Any())
        {
            throw new InvalidOperationException("No route metadata found");
        }

        // Build Postman collection
        var postmanItems = new List<object>();

        foreach (var service in metadata.Services)
        {
            var serviceItems = new List<object>();

            foreach (var endpoint in service.Endpoints)
            {
                var headers = new List<object>();

                // Add Authorization header if required
                if (endpoint.RequiresAuth)
                {
                    headers.Add(new { key = "Authorization", value = "Bearer {{token}}", type = "text" });
                }

                // Add Content-Type header
                if (!string.IsNullOrEmpty(endpoint.ContentType) && endpoint.ContentType != "multipart/form-data")
                {
                    headers.Add(new { key = "Content-Type", value = endpoint.ContentType, type = "text" });
                }

                // Build URL
                var cleanPath = endpoint.Path;
                var urlRaw = $"{{{{gatewayUrl}}}}{cleanPath}";

                // Add query parameters to URL if present
                if (endpoint.QueryParameters != null)
                {
                    var queryParams = JsonSerializer.Serialize(endpoint.QueryParameters);
                    var queryDict = JsonSerializer.Deserialize<Dictionary<string, object>>(queryParams);
                    if (queryDict != null && queryDict.Any())
                    {
                        var queryString = string.Join("&", queryDict.Select(kv => $"{kv.Key}={kv.Value}"));
                        urlRaw += $"?{queryString}";
                    }
                }

                // Build request body
                object? body = null;
                if (endpoint.RequestBody != null)
                {
                    if (endpoint.ContentType == "multipart/form-data")
                    {
                        body = new
                        {
                            mode = "formdata",
                            formdata = new[]
                            {
                                new
                                {
                                    key = "file",
                                    type = "file",
                                    src = new string[] { }
                                }
                            }
                        };
                    }
                    else
                    {
                        var bodyJson = JsonSerializer.Serialize(endpoint.RequestBody, new JsonSerializerOptions
                        {
                            WriteIndented = true
                        });

                        body = new
                        {
                            mode = "raw",
                            raw = bodyJson,
                            options = new { raw = new { language = "json" } }
                        };
                    }
                }

                // Create request item
                var requestItem = new
                {
                    name = $"{endpoint.Method} {cleanPath}",
                    request = new
                    {
                        method = endpoint.Method,
                        header = headers,
                        body,
                        url = new
                        {
                            raw = urlRaw,
                            host = new[] { "{{gatewayUrl}}" },
                            path = cleanPath.TrimStart('/').Split('/')
                        },
                        description = endpoint.Description
                    }
                };

                serviceItems.Add(requestItem);
            }

            // Add service folder
            postmanItems.Add(new
            {
                name = service.Name,
                description = service.Description,
                item = serviceItems
            });
        }

        // Create variables with explicit List<object> type
        var variables = new List<object>
        {
            new
            {
                key = "gatewayUrl",
                value = "https://localhost:7497",
                type = "string"
            },
            new
            {
                key = "token",
                value = "",
                type = "string",
                disabled = false
            }
        };

        // Create events with explicit List<object> type
        var events = new List<object>
        {
            new
            {
                listen = "prerequest",
                script = new
                {
                    type = "text/javascript",
                    exec = new[]
                    {
                        "// You can add pre-request scripts here",
                        "// For example, auto-refresh token if expired"
                    }
                }
            },
            new
            {
                listen = "test",
                script = new
                {
                    type = "text/javascript",
                    exec = new[]
                    {
                        "// Global test scripts",
                        "if (pm.response.code === 401) {",
                        "    console.log('Token expired or invalid');",
                        "}"
                    }
                }
            }
        };

        // Build final collection
        var postmanCollection = new
        {
            info = new
            {
                _postman_id = Guid.NewGuid().ToString(),
                name = "UITVibes API Gateway - Complete Collection",
                description = "Auto-generated Postman collection for all UITVibes microservices endpoints",
                schema = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
                _exporter_id = "generated"
            },
            item = postmanItems,
            variable = variables,
            @event = events
        };

        return JsonSerializer.SerializeToDocument(postmanCollection, new JsonSerializerOptions
        {
            WriteIndented = true
        });
    }
}