using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <summary>
    /// Dọn 3 cột "mồ côi" do một migration cũ (đã không còn trong repo) tạo ra:
    /// "ContentHash", "LockedBy", "LockedUntil" trên bảng "ModerationResults".
    ///
    /// Cơ chế lease hiện tại dùng "LeaseExpiresAt" + "WorkerId" (thêm ở migration
    /// AddModerationLease), và cả 3 cột này đều không có trong model C# hiện tại
    /// — không có code nào đọc/ghi chúng, và toàn bộ 13 dòng dữ liệu đều NULL.
    ///
    /// Giữ lại sẽ gây "schema drift" giữa DB và model: lần `dotnet ef migrations add`
    /// sau này sẽ sinh ra migration drop cột — nhưng nếu DB được dựng lại từ đầu
    /// thì các cột này không tồn tại, khiến script migration không nhất quán.
    /// Dọn đi để DB khớp 100% với model.
    /// </summary>
    public partial class RemoveLegacyModerationLockColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP INDEX IF EXISTS ""IX_ModerationResults_Status_LockedUntil"";
                DROP INDEX IF EXISTS ""IX_ModerationResults_ContentHash_TargetType_CreatedAt"";

                ALTER TABLE ""ModerationResults"" DROP COLUMN IF EXISTS ""ContentHash"";
                ALTER TABLE ""ModerationResults"" DROP COLUMN IF EXISTS ""LockedBy"";
                ALTER TABLE ""ModerationResults"" DROP COLUMN IF EXISTS ""LockedUntil"";
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""ModerationResults"" ADD COLUMN IF NOT EXISTS ""ContentHash"" character varying(64);
                ALTER TABLE ""ModerationResults"" ADD COLUMN IF NOT EXISTS ""LockedBy"" character varying(60);
                ALTER TABLE ""ModerationResults"" ADD COLUMN IF NOT EXISTS ""LockedUntil"" timestamp with time zone;

                CREATE INDEX IF NOT EXISTS ""IX_ModerationResults_ContentHash_TargetType_CreatedAt""
                    ON ""ModerationResults"" (""ContentHash"", ""TargetType"", ""CreatedAt"");

                CREATE INDEX IF NOT EXISTS ""IX_ModerationResults_Status_LockedUntil""
                    ON ""ModerationResults"" (""Status"", ""LockedUntil"");
            ");
        }
    }
}
