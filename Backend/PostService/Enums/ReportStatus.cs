namespace PostService.Enums;

public enum ReportStatus
{
    Pending = 0,    // Chờ xử lý
    Resolved = 1,   // Đã xử lý (ẩn bài)
    Dismissed = 2   // Bỏ qua
}