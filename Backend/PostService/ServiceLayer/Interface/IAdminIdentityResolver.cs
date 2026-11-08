using Microsoft.Extensions.Options;
using PostService.Configurations;

namespace PostService.ServiceLayer.Interface;

/// <summary>
/// Xác thực danh tính admin từ JWT do gateway chuyển tiếp.
///
/// Backend CONVENTIONS quy định gateway là nơi xác thực và các service đọc
/// identity từ header <c>X-User-Id</c> / <c>X-User-Role</c>. Tuy nhiên header là
/// dữ liệu do client kiểm soát nếu service bị truy cập trực tiếp (bỏ qua gateway).
///
/// Vì vậy các endpoint quản trị (moderation) xác thực bằng chính JWT trong header
/// <c>Authorization</c>: gateway luôn forward header này xuống service, nên không
/// ảnh hưởng luồng hiện tại nhưng chặn được việc giả mạo header.
///
/// Nếu chưa cấu hình <c>Jwt:Key</c> (ví dụ chạy PostService độc lập ngoài Aspire),
/// service fallback về header <c>X-User-Role</c> và ghi log cảnh báo — để môi trường
/// local vẫn dùng được nhưng không xảy ra trong production.
/// </summary>
public interface IAdminIdentityResolver
{
    /// <summary>
    /// Trả về Id của admin nếu request mang JWT hợp lệ có role Admin;
    /// ngược lại trả về null.
    /// </summary>
    Guid? GetAdminId(HttpContext httpContext);
}
