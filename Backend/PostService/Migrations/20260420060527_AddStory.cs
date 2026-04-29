using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class AddStory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StoryGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerDisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    OwnerAvatarUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TotalViews = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoryGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "StoryItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StoryGroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PublicId = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ThumbnailUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    Duration = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoryItems_StoryGroups_StoryGroupId",
                        column: x => x.StoryGroupId,
                        principalTable: "StoryGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StoryViews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StoryItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoryViews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoryViews_StoryItems_StoryItemId",
                        column: x => x.StoryItemId,
                        principalTable: "StoryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoryGroups_ExpiresAt",
                table: "StoryGroups",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_StoryGroups_UserId",
                table: "StoryGroups",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StoryGroups_UserId_ExpiresAt",
                table: "StoryGroups",
                columns: new[] { "UserId", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StoryItems_StoryGroupId",
                table: "StoryItems",
                column: "StoryGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_StoryItems_StoryGroupId_DisplayOrder",
                table: "StoryItems",
                columns: new[] { "StoryGroupId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_StoryViews_StoryItemId_UserId",
                table: "StoryViews",
                columns: new[] { "StoryItemId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoryViews_UserId",
                table: "StoryViews",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoryViews");

            migrationBuilder.DropTable(
                name: "StoryItems");

            migrationBuilder.DropTable(
                name: "StoryGroups");
        }
    }
}
