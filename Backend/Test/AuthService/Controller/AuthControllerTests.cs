using AuthService.Controllers;
using AuthService.DTOs;
using AuthService.ServiceLayer.Interface;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace Test.AuthService.Controller;


public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly Mock<ILogger<AuthController>> _loggerMock;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        // Arrange shared dependencies
        _authServiceMock = new Mock<IAuthService>();
        _loggerMock = new Mock<ILogger<AuthController>>();
        _controller = new AuthController(_authServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task Login_WhenCredentialsAreValid_ReturnsOkWithAuthResponse()
    {
        // Arrange
        var request = new LoginRequest { Email = "test@example.com", Password = "Password123!" };
        var expectedResponse = new AuthResponse { AccessToken = "valid_token", RefreshToken = "valid_refresh" };

        _authServiceMock
            .Setup(s => s.LoginAsync(request))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.Login(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
        Assert.Equal(expectedResponse, okResult.Value);
    }

    [Fact]
    public async Task Login_WhenUserIsBanned_ReturnsBadRequestWithErrorCode()
    {
        // Arrange
        var request = new LoginRequest { Email = "banned@example.com", Password = "Password123!" };
        var banReason = "Account suspended due to policy violation.";

        _authServiceMock
            .Setup(s => s.LoginAsync(request))
            .ThrowsAsync(new Exception($"IS_BANNED|{banReason}"));

        // Act
        var result = await _controller.Login(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var errorResponse = Assert.IsType<ErrorResponse>(badRequestResult.Value);
        Assert.Equal("IS_BANNED", errorResponse.ErrorCode);
        Assert.Equal(banReason, errorResponse.Message);
    }

    [Fact]
    public async Task Login_WhenServiceThrowsGeneralException_ReturnsBadRequestWithMessage()
    {
        // Arrange
        var request = new LoginRequest { Email = "test@example.com", Password = "WrongPassword" };
        var errorMessage = "Invalid username or password.";

        _authServiceMock
            .Setup(s => s.LoginAsync(request))
            .ThrowsAsync(new Exception(errorMessage));

        // Act
        var result = await _controller.Login(request);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        var errorResponse = Assert.IsType<ErrorResponse>(badRequestResult.Value);
        Assert.Equal("LOGIN_ERROR", errorResponse.ErrorCode);
        Assert.Equal(errorMessage, errorResponse.Message);
    }
}