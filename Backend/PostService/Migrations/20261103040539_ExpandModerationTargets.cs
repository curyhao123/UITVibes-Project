using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <summary>
    /// Migration bị thiếu trong repo nhưng đã được apply vào database (thấy trong
    /// "__EFMigrationsHistory" với id 20261103040539_ExpandModerationTargets).
    ///
    /// Vì sao cần khôi phục: EF Core xác định migration đã apply bằng cách so
    /// id trong "__EFMigrationsHistory" với danh sách migration trong assembly.
    /// Nếu một id có trong DB nhưng không có trong assembly, chuỗi migration bị
    /// "đứt" và các migration mới sẽ được apply sai thứ tự.
    ///
    /// Nội dung Up() ở đây là bản idempotent (IF NOT EXISTS) của phần schema mà
    /// migration gốc đã tạo: cột kiểm duyệt cho bình luận reel + index phục vụ
    /// đường đọc đã lọc theo trạng thái.
    ///
    /// Lưu ý: database cũ đã chạy migration này rồi nên Up() sẽ không được
    /// gọi lần nữa — file này chỉ để chuỗi migration liền mạch và để database
    /// mới dựng lại được đúng.
    /// </summary>
    public partial class ExpandModerationTargets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""ReelComments""
                    ADD COLUMN IF NOT EXISTS ""ModeratedAt"" timestamp with time zone;

                ALTER TABLE ""ReelComments""
                    ADD COLUMN IF NOT EXISTS ""ModerationStatus"" integer NOT NULL DEFAULT 1;

                CREATE INDEX IF NOT EXISTS ""IX_ReelComments_ReelId_ModerationStatus""
                    ON ""ReelComments"" (""ReelId"", ""ModerationStatus"");

                CREATE INDEX IF NOT EXISTS ""IX_ReelComments_ModerationStatus_CreatedAt""
                    ON ""ReelComments"" (""ModerationStatus"", ""CreatedAt"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP INDEX IF EXISTS ""IX_ReelComments_ModerationStatus_CreatedAt"";
                DROP INDEX IF EXISTS ""IX_ReelComments_ReelId_ModerationStatus"";

                ALTER TABLE ""ReelComments"" DROP COLUMN IF EXISTS ""ModerationStatus"";
                ALTER TABLE ""ReelComments"" DROP COLUMN IF EXISTS ""ModeratedAt"";
            ");
        }
    }
}
