using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using UITVibes_Microservices.ApiService.Services;
using Yarp.ReverseProxy.Transforms;
using Swashbuckle.AspNetCore.SwaggerGen;
//using Microsoft.AspNetCore.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// ===== REGISTER SERVICE DISCOVERY =====
builder.Services.AddSingleton<IServiceDiscovery, ServiceDiscovery>();

// ===== JWT CONFIGURATION =====
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("JWT Issuer is not configured");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("JWT Audience is not configured");

Console.WriteLine("=== JWT Configuration ===");
Console.WriteLine($"Issuer: {jwtIssuer}");
Console.WriteLine($"Audience: {jwtAudience}");
Console.WriteLine($"Key Length: {jwtKey.Length} chars");
Console.WriteLine("=========================");

// ===== ADD JWT AUTHENTICATION =====
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning("JWT Authentication failed: {Message}", context.Exception.Message);
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                var userId = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                logger.LogInformation("JWT Token validated successfully for user: {UserId}", userId);
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                logger.LogWarning("JWT Challenge triggered for path: {Path}", context.Request.Path);
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ===== ADD YARP REVERSE PROXY =====
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(builderContext =>
    {
        builderContext.AddRequestTransform(async transformContext =>
        {
            var authHeader = transformContext.HttpContext.Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader))
            {
                transformContext.ProxyRequest.Headers.TryAddWithoutValidation("Authorization", authHeader);
            }

            if (transformContext.HttpContext.User.Identity?.IsAuthenticated == true)
            {
                var userId = transformContext.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var email = transformContext.HttpContext.User.FindFirst(ClaimTypes.Email)?.Value;

                if (userId != null)
                    transformContext.ProxyRequest.Headers.TryAddWithoutValidation("X-User-Id", userId);
                if (email != null)
                    transformContext.ProxyRequest.Headers.TryAddWithoutValidation("X-User-Email", email);
            }

            var correlationId = Guid.NewGuid().ToString();
            transformContext.ProxyRequest.Headers.TryAddWithoutValidation("X-Correlation-ID", correlationId);
            transformContext.ProxyRequest.Headers.TryAddWithoutValidation("X-Gateway", "UITVibes-API-Gateway");

            await Task.CompletedTask;
        });
    });

// ===== CORS =====
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ===== RATE LIMITING =====
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1)
            }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsync("Too many requests. Please try again later.", cancellationToken: token);
    };
});

builder.Services.AddHealthChecks();
builder.Services.AddEndpointsApiExplorer();

// ===== SWAGGER WITH JWT SUPPORT =====
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "UITVibes API Gateway",
        Version = "v1",
        Description = "API Gateway with JWT Authentication for UITVibes Microservices"
    });

    // Add JWT Authentication to Swagger
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddHttpClient();

var app = builder.Build();

// ===== GET SERVICE URLS AFTER APP BUILD =====
var serviceDiscovery = app.Services.GetRequiredService<IServiceDiscovery>();
var authServiceUrl = serviceDiscovery.GetAuthServiceUrl();
var userServiceUrl = serviceDiscovery.GetUserServiceUrl();
var postServiceUrl = serviceDiscovery.GetPostServiceUrl();

Console.WriteLine("=== Service Discovery Results ===");
Console.WriteLine($"AuthService: {authServiceUrl}");
Console.WriteLine($"UserService: {userServiceUrl}");
Console.WriteLine($"PostService: {postServiceUrl}");
Console.WriteLine("==================================");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "API Gateway v1");
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");

// ===== AUTHENTICATION & AUTHORIZATION =====
app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

// ===== PUBLIC ENDPOINTS =====

app.MapGet("/", (IServiceDiscovery discovery) => Results.Ok(new
{
    service = "UITVibes API Gateway",
    version = "v1.0",
    status = "running",
    authentication = "JWT Bearer",
    authServiceUrl = discovery.GetAuthServiceUrl(),
    userServiceUrl = discovery.GetUserServiceUrl(),
    postServiceUrl = discovery.GetPostServiceUrl(),
    timestamp = DateTime.UtcNow
}))
.WithName("GetGatewayInfo")
//.WithOpenApi()
.AllowAnonymous();

app.MapGet("/gateway/test", async (IHttpClientFactory httpClientFactory, IServiceDiscovery discovery) =>
{
    var client = httpClientFactory.CreateClient();
    var results = new Dictionary<string, object>();

    var authUrl = discovery.GetAuthServiceUrl();
    var userUrl = discovery.GetUserServiceUrl();
    var postUrl = discovery.GetPostServiceUrl();

    try
    {
        var authResponse = await client.GetAsync($"{authUrl}/health");
        results["authService"] = new
        {
            status = authResponse.IsSuccessStatusCode ? "healthy" : "unhealthy",
            statusCode = (int)authResponse.StatusCode,
            url = authUrl
        };
    }
    catch (Exception ex)
    {
        results["authService"] = new { status = "error", message = ex.Message, url = authUrl };
    }

    try
    {
        var userResponse = await client.GetAsync($"{userUrl}/health");
        results["userService"] = new
        {
            status = userResponse.IsSuccessStatusCode ? "healthy" : "unhealthy",
            statusCode = (int)userResponse.StatusCode,
            url = userUrl
        };
    }
    catch (Exception ex)
    {
        results["userService"] = new { status = "error", message = ex.Message, url = userUrl };
    }

    try
    {
        var postResponse = await client.GetAsync($"{postUrl}/health");
        results["postService"] = new
        {
            status = postResponse.IsSuccessStatusCode ? "healthy" : "unhealthy",
            statusCode = (int)postResponse.StatusCode,
            url = postUrl
        };
    }
    catch (Exception ex)
    {
        results["postService"] = new { status = "error", message = ex.Message, url = postUrl };
    }

    return Results.Ok(new
    {
        gateway = "healthy",
        downstreamServices = results,
        timestamp = DateTime.UtcNow
    });
})
.WithName("TestDownstreamServices")
.AllowAnonymous();

app.MapGet("/gateway/routes", (IServiceDiscovery discovery) =>
{
    var routes = new[]
    {
        new
        {
            service = "AuthService",
            baseUrl = discovery.GetAuthServiceUrl(),
            routes = new[]
            {
                new { gateway = "/auth/register", proxiedTo = "/api/register", auth = "Public" },
                new { gateway = "/auth/login", proxiedTo = "/api/login", auth = "Public" },
                new { gateway = "/auth/refresh-token", proxiedTo = "/api/refresh-token", auth = "Public" },
                new { gateway = "/auth/validate", proxiedTo = "/api/validate", auth = "Public" },
                new { gateway = "/auth/revoke", proxiedTo = "/api/revoke", auth = "Public" }
            }
        },
        new
        {
            service = "UserService - UserProfile",
            baseUrl = discovery.GetUserServiceUrl(),
            routes = new[]
            {
                new { gateway = "/user/userprofile/me", proxiedTo = "/api/userprofile/me", auth = "Required" },
                new { gateway = "/user/userprofile/{userId}", proxiedTo = "/api/userprofile/{userId}", auth = "Public" },
                new { gateway = "/user/userprofile/me/avatar", proxiedTo = "/api/userprofile/me/avatar", auth = "Required" },
                new { gateway = "/user/userprofile/me/bio", proxiedTo = "/api/userprofile/me/bio", auth = "Required" }
            }
        },
        new
        {
            service = "UserService - Follow",
            baseUrl = discovery.GetUserServiceUrl(),
            routes = new[]
            {
                new { gateway = "/user/follow/{userId}", proxiedTo = "/api/follow/{userId}", auth = "Required (POST/DELETE)" },
                new { gateway = "/user/follow/{userId}/stats", proxiedTo = "/api/follow/{userId}/stats", auth = "Public" },
                new { gateway = "/user/follow/{userId}/followers", proxiedTo = "/api/follow/{userId}/followers", auth = "Public" },
                new { gateway = "/user/follow/{userId}/following", proxiedTo = "/api/follow/{userId}/following", auth = "Public" }
            }
        },

        new
        {
            service = "PostService",
            baseUrl = discovery.GetPostServiceUrl(),
            routes = new[]
            {
                new { gateway = "/post", proxiedTo = "/api/post", auth = "Required (POST)" },
                new { gateway = "/post/{id}", proxiedTo = "/api/post/{id}", auth = "Public (GET), Required (PUT/DELETE)" },
                new { gateway = "/post/user/{userId}", proxiedTo = "/api/post/user/{userId}", auth = "Public" },
                new { gateway = "/post/feed", proxiedTo = "/api/post/feed", auth = "Required" },
                new { gateway = "/post/media", proxiedTo = "/api/post/media", auth = "Required" }
            }
        }
    };

    return Results.Ok(new
    {
        gatewayBaseUrl = "Check Aspire Dashboard",
        services = routes,
        note = "JWT token required for endpoints marked as 'Required'"
    });
})
.WithName("GetRoutes")
.AllowAnonymous();

// ===== PROTECTED ENDPOINT EXAMPLE =====
app.MapGet("/gateway/me", [Authorize] (HttpContext context) =>
{
    var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var email = context.User.FindFirst(ClaimTypes.Email)?.Value;
    var username = context.User.FindFirst(ClaimTypes.Name)?.Value;

    return Results.Ok(new
    {
        message = "You are authenticated!",
        userId,
        email,
        username,
        claims = context.User.Claims.Select(c => new { c.Type, c.Value }),
        timestamp = DateTime.UtcNow
    });
})
.WithName("GetAuthenticatedUser")
.RequireAuthorization();

app.MapDefaultEndpoints();

// ===== MAP REVERSE PROXY WITH AUTH MIDDLEWARE =====
app.MapReverseProxy(proxyPipeline =>
{
    proxyPipeline.Use(async (context, next) =>
    {
        var path = context.Request.Path.Value?.ToLower() ?? "";
        var method = context.Request.Method.ToUpper();

        // Define public paths (no auth required)
        var publicPaths = new[]
        {
            "/auth/",
            "/gateway/",
            "/health",
            "/swagger"
        };

        // Check if path is public
        var isPublicPath = publicPaths.Any(p => path.StartsWith(p));

        // Special handling for GET requests to user profiles and follow stats (public)
        var isPublicGetRequest =
            method == "GET" &&
            (path.Contains("/user/userprofile/") && !path.Contains("/me")) ||
            (path.Contains("/user/follow/") && (path.Contains("/stats") || path.Contains("/followers") || path.Contains("/following"))) ||
            (path.Contains("/post/") && !path.Contains("/feed"));
        // Require authentication for non-public paths
        if (!isPublicPath && !isPublicGetRequest)
        {
            if (context.User.Identity?.IsAuthenticated != true)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Unauthorized",
                    message = "JWT token is required to access this endpoint",
                    path = path,
                    hint = "Login at /auth/login to get a token"
                });
                return;
            }
        }

        await next();
    });
});

app.Run();