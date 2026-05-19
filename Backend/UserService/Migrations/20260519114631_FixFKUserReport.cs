using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UserService.Migrations
{
    /// <inheritdoc />
    public partial class FixFKUserReport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserReports_UserProfiles_ReporterId",
                table: "UserReports");

            migrationBuilder.DropForeignKey(
                name: "FK_UserReports_UserProfiles_TargetUserId",
                table: "UserReports");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_UserProfiles_UserId",
                table: "UserProfiles",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserReports_ReporterId_TargetUserId",
                table: "UserReports",
                columns: new[] { "ReporterId", "TargetUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_UserReports_Status",
                table: "UserReports",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserReports_ReporterId_TargetUserId",
                table: "UserReports");

            migrationBuilder.DropIndex(
                name: "IX_UserReports_Status",
                table: "UserReports");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_UserProfiles_UserId",
                table: "UserProfiles");

            migrationBuilder.AddForeignKey(
                name: "FK_UserReports_UserProfiles_ReporterId",
                table: "UserReports",
                column: "ReporterId",
                principalTable: "UserProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserReports_UserProfiles_TargetUserId",
                table: "UserReports",
                column: "TargetUserId",
                principalTable: "UserProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
