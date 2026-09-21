namespace MessageService.Enums;

public enum MessageType
{
    Text = 0,
    Image = 1,
    Video = 2,
    File = 3,
    System = 4  // "User joined", "User left", etc.
}