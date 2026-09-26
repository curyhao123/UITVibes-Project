using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AiModer269 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModerationReason",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "ModerationRequestedAt",
                table: "Posts");

            migrationBuilder.AddColumn<Guid>(
                name: "ModerationResultId",
                table: "Comments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ModerationResults",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetType = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    LlmDecision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Severity = table.Column<int>(type: "integer", nullable: true),
                    Confidence = table.Column<double>(type: "double precision", nullable: true),
                    Categories = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AuthorReason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    InternalReasonCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AttemptCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModerationResults", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Comments_ModerationResultId",
                table: "Comments",
                column: "ModerationResultId");

            migrationBuilder.CreateIndex(
                name: "IX_ModerationResults_TargetId_TargetType",
                table: "ModerationResults",
                columns: new[] { "TargetId", "TargetType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ModerationResults_TargetType_Status_UpdatedAt",
                table: "ModerationResults",
                columns: new[] { "TargetType", "Status", "UpdatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_Comments_ModerationResults_ModerationResultId",
                table: "Comments",
                column: "ModerationResultId",
                principalTable: "ModerationResults",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Comments_ModerationResults_ModerationResultId",
                table: "Comments");

            migrationBuilder.DropTable(
                name: "ModerationResults");

            migrationBuilder.DropIndex(
                name: "IX_Comments_ModerationResultId",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ModerationResultId",
                table: "Comments");

            migrationBuilder.AddColumn<string>(
                name: "ModerationReason",
                table: "Posts",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ModerationRequestedAt",
                table: "Posts",
                type: "timestamp with time zone",
                nullable: true);
        }
    }
}
