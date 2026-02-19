var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache");

// Add PostgreSQL for data persistence
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithDataVolume("postgres_data");
 
var authDb = postgres.AddDatabase("authdb");
var userDb = postgres.AddDatabase("userdb");
var postDb = postgres.AddDatabase("postdb");


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
    .WithReference(authDb)
    .WaitFor(authDb)
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(messaging)
    .WaitFor(messaging)
    .WithEnvironment("Jwt__Key", jwtKey)
    .WithHttpHealthCheck("/health"); 

var userService = builder.AddProject<Projects.UserService>("userservice")
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

// ===== API GATEWAY WITH JWT =====
var apiService = builder.AddProject<Projects.UITVibes_Microservices_ApiService>("apiservice")
    .WithHttpHealthCheck("/health")
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(authService)
    .WaitFor(authService)
    .WithReference(userService)
    .WaitFor(userService)
    .WithReference(postService)
    .WaitFor(postService)
    .WithEnvironment("Jwt__Key", jwtKey); // ✅ Add JWT Key to Gateway

builder.Build().Run();
