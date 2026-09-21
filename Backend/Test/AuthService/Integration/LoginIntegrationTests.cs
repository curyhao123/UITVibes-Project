using System.Net;
using System.Net.Http.Json;
using AuthService.DTOs;
using AuthService.Enums;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Test.AuthService.Integration;

public class LoginIntegrationTests : IClassFixture<AuthWebApplicationFactory>, IAsyncLifetime
{
    private readonly AuthWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public LoginIntegrationTests(AuthWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<User> SeedUserAsync(
        string email = "testuser@example.com",
        string username = "testuser",
        string password = "Password123!",
        bool isActive = true,
        bool isBanned = false,
        bool isVerified = true,
        Role role = Role.User)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CreatedAt = DateTime.UtcNow,
            IsActive = isActive,
            IsBanned = isBanned,
            IsVerified = isVerified,
            Role = role
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return user;
    }

    [Fact]
    public async Task Login_WithValidCredentials_Returns200Ok_AndPersistsRefreshToken()
    {
        // Arrange
        const string email = "validuser@example.com";
        const string password = "SecurePassword123!";
        const string username = "validuser";

        var seededUser = await SeedUserAsync(
            email: email,
            username: username,
            password: password,
            isActive: true,
            isBanned: false,
            isVerified: true,
            role: Role.User);

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authResponse);
        Assert.False(string.IsNullOrWhiteSpace(authResponse.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(authResponse.RefreshToken));
        Assert.True(authResponse.ExpiresAt > DateTime.UtcNow);

        Assert.NotNull(authResponse.User);
        Assert.Equal(seededUser.Id, authResponse.User.Id);
        Assert.Equal(email, authResponse.User.Email);
        Assert.Equal(username, authResponse.User.Username);
        Assert.Equal("True", authResponse.User.IsVerified);
        Assert.Equal(Role.User.ToString(), authResponse.User.Role);

        // Verify RefreshToken in Database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();

        var storedRefreshToken = await context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.UserId == seededUser.Id && rt.Token == authResponse.RefreshToken);

        Assert.NotNull(storedRefreshToken);
        Assert.False(storedRefreshToken.IsRevoked);
        Assert.True(storedRefreshToken.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns400BadRequest_WithLoginErrorCode()
    {
        // Arrange
        const string email = "wrongpass@example.com";
        await SeedUserAsync(email: email, password: "CorrectPassword123!");

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = "WrongPassword999!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Equal("LOGIN_ERROR", error.ErrorCode);
        Assert.Equal("Invalid email or password", error.Message);

        // Verify no refresh token was generated
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        var tokensCount = await context.RefreshTokens.CountAsync();
        Assert.Equal(0, tokensCount);
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_Returns400BadRequest_WithLoginErrorCode()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "doesnotexist@example.com",
            Password = "AnyPassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Equal("LOGIN_ERROR", error.ErrorCode);
        Assert.Equal("Invalid email or password", error.Message);
    }

    [Fact]
    public async Task Login_WhenUserIsInactive_Returns400BadRequest_WithInactiveMessage()
    {
        // Arrange
        const string email = "inactive@example.com";
        const string password = "Password123!";
        await SeedUserAsync(email: email, password: password, isActive: false);

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Equal("LOGIN_ERROR", error.ErrorCode);
        Assert.Equal("User account is inactive", error.Message);
    }

    [Fact]
    public async Task Login_WhenUserIsBanned_Returns400BadRequest_WithIsBannedErrorCode()
    {
        // Arrange
        const string email = "banned@example.com";
        const string password = "Password123!";
        await SeedUserAsync(email: email, password: password, isBanned: true);

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.Equal("IS_BANNED", error.ErrorCode);
        Assert.Equal("User account is banned", error.Message);
    }

    [Fact]
    public async Task Login_MultipleLogins_GeneratesDistinctRefreshTokensInDatabase()
    {
        // Arrange
        const string email = "multilogin@example.com";
        const string password = "Password123!";
        var seededUser = await SeedUserAsync(email: email, password: password);

        var loginRequest = new LoginRequest
        {
            Email = email,
            Password = password
        };

        // Act - First login
        var response1 = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, response1.StatusCode);
        var auth1 = await response1.Content.ReadFromJsonAsync<AuthResponse>();

        // Act - Second login
        var response2 = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);
        Assert.Equal(HttpStatusCode.OK, response2.StatusCode);
        var auth2 = await response2.Content.ReadFromJsonAsync<AuthResponse>();

        // Assert
        Assert.NotNull(auth1);
        Assert.NotNull(auth2);
        Assert.NotEqual(auth1.RefreshToken, auth2.RefreshToken);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AuthDbContext>();

        var userTokens = await context.RefreshTokens
            .Where(rt => rt.UserId == seededUser.Id)
            .ToListAsync();

        Assert.Equal(2, userTokens.Count);
        Assert.Contains(userTokens, rt => rt.Token == auth1.RefreshToken);
        Assert.Contains(userTokens, rt => rt.Token == auth2.RefreshToken);
    }
}
