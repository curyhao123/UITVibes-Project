using Microsoft.EntityFrameworkCore;
using SearchService.Configurations;

namespace SearchService.Models;

public class SearchDbContext(DbContextOptions<SearchDbContext> options) : DbContext(options)
{
    public DbSet<PostChunk> PostChunks => Set<PostChunk>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("vector");
        modelBuilder.HasPostgresExtension("pg_trgm");
        modelBuilder.HasPostgresExtension("unaccent");

        modelBuilder.Entity<PostChunk>(e =>
        {
            e.ToTable("post_chunks");
            e.HasKey(x => x.Id);

            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TargetId).HasColumnName("target_id");
            e.Property(x => x.TargetType).HasColumnName("target_type").HasColumnType("smallint");
            e.Property(x => x.ChunkIndex).HasColumnName("chunk_index");
            e.Property(x => x.Content).HasColumnName("content").HasColumnType("text").IsRequired();
            e.Property(x => x.Embedding).HasColumnName("embedding")
                .HasColumnType($"vector({EmbeddingOptions.DefaultDimensions})");
            // Generated column: f_unaccent là wrapper IMMUTABLE tạo trong migration.
            e.Property(x => x.SearchTsv).HasColumnName("search_tsv")
                .HasComputedColumnSql("to_tsvector('simple', f_unaccent(coalesce(content, '')))", stored: true);
            e.Property(x => x.AuthorId).HasColumnName("author_id");
            e.Property(x => x.Visibility).HasColumnName("visibility").HasColumnType("smallint");
            e.Property(x => x.Hashtags).HasColumnName("hashtags").HasColumnType("text[]");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamptz");
            e.Property(x => x.IndexedAt).HasColumnName("indexed_at").HasColumnType("timestamptz");
            e.Property(x => x.EmbeddingModel).HasColumnName("embedding_model").HasColumnType("text");

            e.HasIndex(x => new { x.TargetId, x.TargetType, x.ChunkIndex })
                .IsUnique()
                .HasDatabaseName("ux_post_chunks_target_chunk");
            e.HasIndex(x => x.AuthorId).HasDatabaseName("ix_post_chunks_author_id");
            e.HasIndex(x => x.Embedding)
                .HasDatabaseName("ix_post_chunks_embedding_hnsw")
                .HasMethod("hnsw")
                .HasOperators("vector_cosine_ops")
                .HasStorageParameter("m", 16)
                .HasStorageParameter("ef_construction", 64);
            e.HasIndex(x => x.SearchTsv).HasDatabaseName("ix_post_chunks_search_tsv").HasMethod("gin");
            e.HasIndex(x => x.Content)
                .HasDatabaseName("ix_post_chunks_content_trgm")
                .HasMethod("gin")
                .HasOperators("gin_trgm_ops");
        });
    }
}
