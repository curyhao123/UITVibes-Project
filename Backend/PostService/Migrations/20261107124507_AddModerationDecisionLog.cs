using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddModerationDecisionLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ModerationDecisionLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ModerationResultId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetType = table.Column<int>(type: "integer", nullable: false),
                    Decision = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Stage = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    InternalReasonCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LlmDecision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Severity = table.Column<int>(type: "integer", nullable: true),
                    Confidence = table.Column<double>(type: "double precision", nullable: true),
                    Categories = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorRole = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    PromptVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ModelName = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModerationDecisionLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ModerationDecisionLogs_CreatedAt",
                table: "ModerationDecisionLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ModerationDecisionLogs_ModerationResultId_CreatedAt",
                table: "ModerationDecisionLogs",
                columns: new[] { "ModerationResultId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ModerationDecisionLogs_TargetType_CreatedAt",
                table: "ModerationDecisionLogs",
                columns: new[] { "TargetType", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ModerationDecisionLogs");
        }
    }
}
