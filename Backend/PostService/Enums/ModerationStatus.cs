namespace PostService.Enums;

public enum ModerationStatus
{
    Pending = 0,  // Đang chờ kiểm duyệt (chỉ tác giả thấy)
    Approved = 1,  // Đã duyệt, hiển thị công khai
    Rejected = 2,  // Bị từ chối (chỉ tác giả thấy)
    NeedsReview = 3   // Vùng xám, chờ admin xem xét
}