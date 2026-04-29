using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

using UserService.Models;

namespace UserService.Migrations
{
    [DbContext(typeof(UserDbContext))]
    [Migration("20260414000100_AddUserProfileSearchIndexes")]
    public partial class AddUserProfileSearchIndexes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Enable pg_trgm extension for trigram-based search, no-op if it already exists
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

            // Trigram GIN index for DisplayName to speed up ILIKE '%term%' searches
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS \"IX_UserProfiles_DisplayName_trgm\" " +
                "ON \"UserProfiles\" USING GIN (\"DisplayName\" gin_trgm_ops);");

            // Trigram GIN index for Bio to speed up ILIKE '%term%' searches
            migrationBuilder.Sql(
                "CREATE INDEX IF NOT EXISTS \"IX_UserProfiles_Bio_trgm\" " +
                "ON \"UserProfiles\" USING GIN (\"Bio\" gin_trgm_ops);");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_UserProfiles_DisplayName_trgm\";");
            migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_UserProfiles_Bio_trgm\";");
        }
    }
}
