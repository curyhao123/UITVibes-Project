using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddUserStrike : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserStrikes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetId = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetType = table.Column<int>(type: "integer", nullable: false),
                    ModerationResultId = table.Column<Guid>(type: "uuid", nullable: true),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    Weight = table.Column<int>(type: "integer", nullable: false),
                    ReasonCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    IssuedBy = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IsRevoked = table.Column<bool>(type: "boolean", nullable: false),
                    RevokedReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserStrikes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserStrikes_CreatedAt",
                table: "UserStrikes",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UserStrikes_ModerationResultId",
                table: "UserStrikes",
                column: "ModerationResultId");

            migrationBuilder.CreateIndex(
                name: "IX_UserStrikes_UserId_IsRevoked",
                table: "UserStrikes",
                columns: new[] { "UserId", "IsRevoked" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserStrikes");
        }
    }
}
