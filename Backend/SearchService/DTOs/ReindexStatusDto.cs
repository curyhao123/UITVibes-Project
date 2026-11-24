namespace SearchService.DTOs;

public record ReindexStatusDto(
    bool Running,
    DateTime? StartedAt,
    DateTime? FinishedAt,
    int Indexed,
    int Removed,
    int Failed,
    int StaleRemoved,
    string? LastError);
