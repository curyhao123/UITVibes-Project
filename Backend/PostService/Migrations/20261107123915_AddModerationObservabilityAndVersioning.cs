using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddModerationObservabilityAndVersioning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompletionTokens",
                table: "ModerationResults",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "EstimatedCostUsd",
                table: "ModerationResults",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LlmLatencyMs",
                table: "ModerationResults",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModelName",
                table: "ModerationResults",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PromptTokens",
                table: "ModerationResults",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PromptVersion",
                table: "ModerationResults",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RawLlmResponse",
                table: "ModerationResults",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShadowAgreesWithPrimary",
                table: "ModerationResults",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "ShadowConfidence",
                table: "ModerationResults",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShadowDecision",
                table: "ModerationResults",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShadowModel",
                table: "ModerationResults",
                type: "character varying(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShadowPromptVersion",
                table: "ModerationResults",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ShadowSeverity",
                table: "ModerationResults",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ShadowStatus",
                table: "ModerationResults",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetMediaUrlsSnapshot",
                table: "ModerationResults",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalTokens",
                table: "ModerationResults",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletionTokens",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "EstimatedCostUsd",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "LlmLatencyMs",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ModelName",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "PromptTokens",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "PromptVersion",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "RawLlmResponse",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ShadowAgreesWithPrimary",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ShadowConfidence",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ShadowDecision",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ShadowModel",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ShadowPromptVersion",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ShadowSeverity",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "ShadowStatus",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "TargetMediaUrlsSnapshot",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "TotalTokens",
                table: "ModerationResults");
        }
    }
}
