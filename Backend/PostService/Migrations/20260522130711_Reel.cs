using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PostService.Migrations
{
    /// <inheritdoc />
    public partial class Reel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Reels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    VideoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    VideoPublicId = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ThumbnailUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ThumbnailPublicId = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Caption = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Duration = table.Column<int>(type: "integer", nullable: false),
                    ViewCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReelComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReelId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    LikeCount = table.Column<int>(type: "integer", nullable: false),
                    ReplyCount = table.Column<int>(type: "integer", nullable: false),
                    ParentCommentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReelComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReelComments_ReelComments_ParentCommentId",
                        column: x => x.ParentCommentId,
                        principalTable: "ReelComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ReelComments_Reels_ReelId",
                        column: x => x.ReelId,
                        principalTable: "Reels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReelLikes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReelId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReelLikes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReelLikes_Reels_ReelId",
                        column: x => x.ReelId,
                        principalTable: "Reels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReelShares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReelId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReelShares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReelShares_Reels_ReelId",
                        column: x => x.ReelId,
                        principalTable: "Reels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReelCommentLikes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReelCommentId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReelCommentLikes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReelCommentLikes_ReelComments_ReelCommentId",
                        column: x => x.ReelCommentId,
                        principalTable: "ReelComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HighlightGroups_CreatedAt",
                table: "HighlightGroups",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ReelCommentLikes_ReelCommentId_UserId",
                table: "ReelCommentLikes",
                columns: new[] { "ReelCommentId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReelCommentLikes_UserId",
                table: "ReelCommentLikes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReelComments_CreatedAt",
                table: "ReelComments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ReelComments_ParentCommentId",
                table: "ReelComments",
                column: "ParentCommentId");

            migrationBuilder.CreateIndex(
                name: "IX_ReelComments_ReelId",
                table: "ReelComments",
                column: "ReelId");

            migrationBuilder.CreateIndex(
                name: "IX_ReelComments_UserId",
                table: "ReelComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReelLikes_CreatedAt",
                table: "ReelLikes",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ReelLikes_ReelId_UserId",
                table: "ReelLikes",
                columns: new[] { "ReelId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReelLikes_UserId",
                table: "ReelLikes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Reels_CreatedAt",
                table: "Reels",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Reels_UserId",
                table: "Reels",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Reels_UserId_CreatedAt",
                table: "Reels",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ReelShares_CreatedAt",
                table: "ReelShares",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ReelShares_ReelId_UserId",
                table: "ReelShares",
                columns: new[] { "ReelId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReelShares_UserId",
                table: "ReelShares",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReelCommentLikes");

            migrationBuilder.DropTable(
                name: "ReelLikes");

            migrationBuilder.DropTable(
                name: "ReelShares");

            migrationBuilder.DropTable(
                name: "ReelComments");

            migrationBuilder.DropTable(
                name: "Reels");

            migrationBuilder.DropIndex(
                name: "IX_HighlightGroups_CreatedAt",
                table: "HighlightGroups");
        }
    }
}
