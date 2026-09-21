namespace PostService.Enums;

public enum PostVisibility
{
    Public = 0,      // Everyone can see
    Followers = 1,   // Only followers
    Private = 2,      // Only mentioned users
    Hidden = 3      // Hidden from everyone (used for soft delete or content violation)
}