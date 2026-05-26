using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddHighlightTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HighlightGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CoverImage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HighlightGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HighlightItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HighlightGroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    StoryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HighlightItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HighlightItems_HighlightGroups_HighlightGroupId",
                        column: x => x.HighlightGroupId,
                        principalTable: "HighlightGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HighlightItems_StoryItems_StoryItemId",
                        column: x => x.StoryItemId,
                        principalTable: "StoryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HighlightGroups_UserId",
                table: "HighlightGroups",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_HighlightItems_HighlightGroupId",
                table: "HighlightItems",
                column: "HighlightGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_HighlightItems_StoryItemId",
                table: "HighlightItems",
                column: "StoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_HighlightItems_HighlightGroupId_StoryItemId",
                table: "HighlightItems",
                columns: new[] { "HighlightGroupId", "StoryItemId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HighlightItems");

            migrationBuilder.DropTable(
                name: "HighlightGroups");
        }
    }
}
