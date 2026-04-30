var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache");

// Add PostgreSQL for data persistence
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume("postgres_data");

var authDb = postgres.AddDatabase("authdb");
var userDb = postgres.AddDatabase("userdb");
var postDb = postgres.AddDatabase("postdb");
var messageDb = postgres.AddDatabase("messagedb");
var notificationDb = postgres.AddDatabase("notificationdb");

// Add RabbitMQ for inter-service messaging
var messaging = builder.AddRabbitMQ("messaging");

// ===== CENTRALIZED SECRETS =====
// Define secrets once, use everywhere
var jwtKey = builder.AddParameter("jwt-key", secret: true);
var cloudinaryCloudName = builder.AddParameter("cloudinary-cloudname");
var cloudinaryApiKey = builder.AddParameter("cloudinary-apikey", secret: true);
var cloudinaryApiSecret = builder.AddParameter("cloudinary-apisecret", secret: true);

// Auth Service - shares JWT key
var authService = builder.AddProject<Projects.AuthService>("authservice")
    .WithExternalHttpEndpoints()
    .WithReference(authDb)
    .WaitFor(authDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithEnvironment("Jwt__Key", jwtKey)
    .WithHttpHealthCheck("/health");

var userService = builder.AddProject<Projects.UserService>("userservice")
    .WithExternalHttpEndpoints()
    .WithReference(userDb)
    .WaitFor(userDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithEnvironment("Cloudinary__CloudName", cloudinaryCloudName)
    .WithEnvironment("Cloudinary__ApiKey", cloudinaryApiKey)
    .WithEnvironment("Cloudinary__ApiSecret", cloudinaryApiSecret)
    .WithHttpHealthCheck("/health");


var postService = builder.AddProject<Projects.PostService>("postservice")
    .WithExternalHttpEndpoints()
    .WithReference(postDb)
    .WaitFor(postDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithEnvironment("Cloudinary__CloudName", cloudinaryCloudName)
    .WithEnvironment("Cloudinary__ApiKey", cloudinaryApiKey)
    .WithEnvironment("Cloudinary__ApiSecret", cloudinaryApiSecret)
    .WithHttpHealthCheck("/health");



var messageService = builder.AddProject<Projects.MessageService>("messageservice")
    .WithExternalHttpEndpoints()
    .WithReference(messageDb)
    .WaitFor(messageDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithHttpHealthCheck("/health");




var notificationService = builder.AddProject<Projects.NotificationService>("notificationservice")
    .WithExternalHttpEndpoints()
    .WithReference(notificationDb)
    .WaitFor(notificationDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithHttpHealthCheck("/health");


// ===== API GATEWAY WITH JWT =====
var apiService = builder.AddProject<Projects.UITVibes_Microservices_ApiService>("apiservice")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(authService)
    .WaitFor(authService)
    .WithReference(userService)
    .WaitFor(userService)
    .WithReference(postService)
    .WaitFor(postService)
    .WithReference(messageService)
    .WaitFor(messageService)
    .WithEnvironment("Jwt__Key", jwtKey);






builder.Build().Run();
