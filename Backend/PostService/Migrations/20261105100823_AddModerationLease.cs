using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddModerationLease : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LeaseExpiresAt",
                table: "ModerationResults",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WorkerId",
                table: "ModerationResults",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ModerationResults_Status_LeaseExpiresAt",
                table: "ModerationResults",
                columns: new[] { "Status", "LeaseExpiresAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ModerationResults_Status_LeaseExpiresAt",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "LeaseExpiresAt",
                table: "ModerationResults");

            migrationBuilder.DropColumn(
                name: "WorkerId",
                table: "ModerationResults");
        }
    }
}
