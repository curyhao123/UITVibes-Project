using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <summary>
    /// Đồng bộ index phục vụ đường đọc đã lọc theo trạng thái kiểm duyệt.
    ///
    /// Dùng raw SQL "IF NOT EXISTS" vì một số index đã được tạo bởi migration
    /// trước đó trên database cũ — migrationBuilder.CreateIndex sẽ ném lỗi
    /// Postgres 42701 ("relation already exists") và làm service không khởi động.
    /// </summary>
    public partial class SyncModerationSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_StoryItems_StoryGroupId_ModerationStatus""
                    ON ""StoryItems"" (""StoryGroupId"", ""ModerationStatus"");

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
                DROP INDEX IF EXISTS ""IX_StoryItems_StoryGroupId_ModerationStatus"";
            ");
        }
    }
}
