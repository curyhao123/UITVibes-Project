namespace PostService.DTOs
{
    /// <summary>
    /// Sửa caption của reel (tác giả). Khi caption thay đổi, reel được resubmit
    /// để AI kiểm duyệt lại.
    /// </summary>
    public class UpdateReelRequest
    {
        /// Caption mới. Chuỗi rỗng = xoá caption (reel không có text để kiểm duyệt).
        public string? Caption { get; set; }
    }
}
