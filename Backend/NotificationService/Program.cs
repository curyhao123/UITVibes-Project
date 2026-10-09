using Microsoft.EntityFrameworkCore;
using NotificationService.Hubs;
using NotificationService.Messaging;
using NotificationService.Models;
using NotificationService.ServiceLayer.Implementation;
using NotificationService.ServiceLayer.Interface;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Add services to the container.
builder.AddNpgsqlDbContext<NotificationDbContext>("notificationdb");

// Add RabbitMQ
builder.AddRabbitMQClient("messaging");

// NOTE: Firebase removed - push notifications use dummy sender
// To re-enable: Install FirebaseAdmin package and configure Firebase credentials

builder.Services.AddScoped<IFcmPushSender, FcmPushSender>();
builder.Services.AddScoped<NotificationService.ServiceLayer.Interface.INotificationService, NotificationService.ServiceLayer.Implementation.NotificationService>();
builder.Services.AddScoped<IUserNotificationSettingService, UserNotificationSettingService>();
builder.Services.AddScoped<OutboxService>();
builder.Services.AddHostedService<OutboxService>();
builder.Services.AddScoped<IDeviceTokenService, DeviceTokenService>();

// SignalR — real-time notification push
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationHubClient, NotificationHubClient>();

//message event
builder.Services.AddHostedService<MessageSentConsumer>();
builder.Services.AddHostedService<PostLikedConsumer>();
builder.Services.AddHostedService<PostCommentedConsumer>();
builder.Services.AddHostedService<UserFollowedConsumer>();
builder.Services.AddHostedService<PostMentionedConsumer>();
builder.Services.AddHostedService<CommentMentionedConsumer>();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var context = services.GetRequiredService<NotificationDbContext>();
        logger.LogInformation("Applying database migrations...");
        await context.Database.MigrateAsync();
        logger.LogInformation("Database migrations applied successfully.");
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

app.UseHttpsRedirection();

app.UseAuthorization();

// SignalR requires WebSockets
app.UseWebSockets();

app.MapControllers();

// Map SignalR hub for real-time notifications
app.MapHub<NotificationHub>("/hubs/notification");

app.Run();
