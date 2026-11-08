using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddModerationReportPriorityAndOcr : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Dùng raw SQL "IF NOT EXISTS" thay vì migrationBuilder.AddColumn vì
            // migration này phải idempotent: cột có thể đã tồn tại sẵn trong DB
            // (migration bị apply một phần trước đó, hoặc DB được dựng tay).
            // migrationBuilder.AddColumn sẽ ném lỗi Postgres 42701
            // ("column already exists") và làm service không khởi động được.
            //
            // Default = 1 (Approved) cho cả hai bảng, đồng bộ với Posts / Comments /
            // Reels — nội dung tồn tại từ trước khi có kiểm duyệt không được mặc
            // định Pending, nếu không sẽ biến mất khỏi feed.
            migrationBuilder.Sql(@"
                ALTER TABLE ""StoryItems""
                    ADD COLUMN IF NOT EXISTS ""ModeratedAt"" timestamp with time zone;

                ALTER TABLE ""StoryItems""
                    ADD COLUMN IF NOT EXISTS ""ModerationStatus"" integer NOT NULL DEFAULT 1;

                ALTER TABLE ""ReelComments""
                    ADD COLUMN IF NOT EXISTS ""ModeratedAt"" timestamp with time zone;

                ALTER TABLE ""ReelComments""
                    ADD COLUMN IF NOT EXISTS ""ModerationStatus"" integer NOT NULL DEFAULT 1;

                ALTER TABLE ""ModerationResults""
                    ADD COLUMN IF NOT EXISTS ""OcrText"" text;

                ALTER TABLE ""ModerationResults""
                    ADD COLUMN IF NOT EXISTS ""Priority"" integer NOT NULL DEFAULT 0;

                ALTER TABLE ""ModerationResults""
                    ADD COLUMN IF NOT EXISTS ""ReportCount"" integer NOT NULL DEFAULT 0;
            ");

            // Backfill: nội dung đã tồn tại từ trước khi có kiểm duyệt phải được
            // đánh dấu Approved, nếu không mặc định Pending sẽ làm story /
            // bình luận reel cũ biến mất khỏi feed. UPDATE có điều kiện nên
            // chạy lại nhiều lần vẫn đúng.
            migrationBuilder.Sql(@"
                UPDATE ""StoryItems"" SET ""ModerationStatus"" = 1 WHERE ""ModerationStatus"" = 0;
                UPDATE ""ReelComments"" SET ""ModerationStatus"" = 1 WHERE ""ModerationStatus"" = 0;
            ");

            // Index phục vụ đường đọc đã lọc theo trạng thái kiểm duyệt.
            // "IF NOT EXISTS" vì index có thể đã tồn tại từ migration trước đó.
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

                ALTER TABLE ""ModerationResults"" DROP COLUMN IF EXISTS ""ReportCount"";
                ALTER TABLE ""ModerationResults"" DROP COLUMN IF EXISTS ""Priority"";
                ALTER TABLE ""ModerationResults"" DROP COLUMN IF EXISTS ""OcrText"";

                ALTER TABLE ""ReelComments"" DROP COLUMN IF EXISTS ""ModerationStatus"";
                ALTER TABLE ""ReelComments"" DROP COLUMN IF EXISTS ""ModeratedAt"";

                ALTER TABLE ""StoryItems"" DROP COLUMN IF EXISTS ""ModerationStatus"";
                ALTER TABLE ""StoryItems"" DROP COLUMN IF EXISTS ""ModeratedAt"";
            ");
        }
    }
}
