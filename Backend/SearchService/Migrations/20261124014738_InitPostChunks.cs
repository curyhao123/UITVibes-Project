using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;
using Pgvector;

#nullable disable

namespace SearchService.Migrations
{
    /// <inheritdoc />
    public partial class InitPostChunks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .Annotation("Npgsql:PostgresExtension:unaccent", ",,")
                .Annotation("Npgsql:PostgresExtension:vector", ",,");

            // unaccent() không IMMUTABLE nên generated column không gọi trực tiếp được.
            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
                LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
                AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
                """);

            migrationBuilder.CreateTable(
                name: "post_chunks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_type = table.Column<short>(type: "smallint", nullable: false),
                    chunk_index = table.Column<int>(type: "integer", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    embedding = table.Column<Vector>(type: "vector(1024)", nullable: true),
                    search_tsv = table.Column<NpgsqlTsVector>(type: "tsvector", nullable: true, computedColumnSql: "to_tsvector('simple', f_unaccent(coalesce(content, '')))", stored: true),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    visibility = table.Column<short>(type: "smallint", nullable: false),
                    hashtags = table.Column<List<string>>(type: "text[]", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    indexed_at = table.Column<DateTime>(type: "timestamptz", nullable: false),
                    embedding_model = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_chunks", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_post_chunks_author_id",
                table: "post_chunks",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "ix_post_chunks_content_trgm",
                table: "post_chunks",
                column: "content")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "ix_post_chunks_embedding_hnsw",
                table: "post_chunks",
                column: "embedding")
                .Annotation("Npgsql:IndexMethod", "hnsw")
                .Annotation("Npgsql:IndexOperators", new[] { "vector_cosine_ops" })
                .Annotation("Npgsql:StorageParameter:ef_construction", 64)
                .Annotation("Npgsql:StorageParameter:m", 16);

            migrationBuilder.CreateIndex(
                name: "ix_post_chunks_search_tsv",
                table: "post_chunks",
                column: "search_tsv")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.CreateIndex(
                name: "ux_post_chunks_target_chunk",
                table: "post_chunks",
                columns: new[] { "target_id", "target_type", "chunk_index" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "post_chunks");

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS f_unaccent(text);");
        }
    }
}
