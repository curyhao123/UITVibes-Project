using Microsoft.EntityFrameworkCore;
using MessageService.Hubs;
using MessageService.Models;
using MessageService.ServiceLayer.Implementation;
using MessageService.ServiceLayer.Interface;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add PostgreSQL DbContext
builder.AddNpgsqlDbContext<MessageDbContext>("messagedb");

// Add Redis
builder.AddRedisClient("cache");

// Add RabbitMQ
builder.AddRabbitMQClient("messaging");

// Register services
builder.Services.AddScoped<IConversationService, ConversationService>();
builder.Services.AddScoped<IMessageService, ChatMessageService>();
builder.Services.AddScoped<IFriendListRpcClient, FriendListRpcClient>();
builder.Services.AddScoped<IOnlineTrackingService, OnlineTrackingService>();

// Add SignalR with Redis backplane for scaling
builder.Services.AddSignalR();
   
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Message Service API",
        Version = "v1",
        Description = "Real-time messaging service with SignalR"
    });
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://127.0.0.1:5500", 
                "http://localhost:3000", 
                "http://localhost:8081",
                "http://localhost:7497")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

var app = builder.Build();

// Run migrations
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var context = services.GetRequiredService<MessageDbContext>();
        logger.LogInformation("Starting database migration for MessageService...");

        var pendingMigrations = await context.Database.GetPendingMigrationsAsync();
        if (pendingMigrations.Any())
        {
            logger.LogInformation("Found {Count} pending migrations", pendingMigrations.Count());
            await context.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied successfully.");
        }
        else
        {
            logger.LogInformation("Database is up to date.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating the database.");
        throw;
    }
}

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseCors("AllowFrontend");
app.UseWebSockets();        // ← phải trước MapHub
app.UseAuthentication();    // ← thêm vào
app.UseAuthorization();     


app.MapControllers();

// Map SignalR hub
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
