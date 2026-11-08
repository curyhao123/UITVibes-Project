using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddCommentReelModerationAndAppeal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Comments_ModerationResults_ModerationResultId",
                table: "Comments");

            migrationBuilder.DropIndex(
                name: "IX_Comments_ModerationResultId",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ModerationResultId",
                table: "Comments");

            migrationBuilder.AddColumn<DateTime>(
                name: "ModeratedAt",
                table: "Reels",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModerationStatus",
                table: "Reels",
                type: "integer",
                nullable: false,
                // Approved cho dữ liệu cũ: reel đã tồn tại trước khi có kiểm duyệt
                // thì không được mặc định ẩn khỏi feed.
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "AppealReason",
                table: "ModerationResults",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AppealResolvedAt",
                table: "ModerationResults",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AppealStatus",
                table: "ModerationResults",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "AppealSubmittedAt",
                table: "ModerationResults",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModeratedAt",
                table: "Comments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModerationStatus",
                table: "Comments",
                type: "integer",
                nullable: false,
                // Approved cho dữ liệu cũ: bình luận đã tồn tại trước khi có kiểm duyệt
                // thì không được mặc định ẩn khỏi bài viết.
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Reels_ModerationStatus",
                table: "Reels",
                column: "ModerationStatus");

            migrationBuilder.CreateIndex(
                name: "IX_ModerationResults_AppealStatus",
                table: "ModerationResults",
                column: "AppealStatus");

            migrationBuilder.CreateIndex(
                name: "IX_Comments_PostId_ModerationStatus",
                table: "Comments",
                columns: new[] { "PostId", "ModerationStatus" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reels_ModerationStatus",
                table: "Reels");

            migrationBuilder.DropIndex(
                name: "IX_ModerationResults_AppealStatus",
                table: "ModerationResults");

            migrationBuilder.DropIndex(
                name: "IX_Comments_PostId_ModerationStatus",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ModeratedAt",
                table: "Reels");

            migrationBuilder.DropColumn(
                name: "ModerationStatus",
                table: "Reels");

            migrationBuilder.DropColumn(
                name: "AppealReason",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "AppealResolvedAt",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "AppealStatus",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "AppealSubmittedAt",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ModeratedAt",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ModerationStatus",
                table: "Comments");

            migrationBuilder.AddColumn<Guid>(
                name: "ModerationResultId",
                table: "Comments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comments_ModerationResultId",
                table: "Comments",
                column: "ModerationResultId");

            migrationBuilder.AddForeignKey(
                name: "FK_Comments_ModerationResults_ModerationResultId",
                table: "Comments",
                column: "ModerationResultId",
                principalTable: "ModerationResults",
                principalColumn: "Id");
        }
    }
}
