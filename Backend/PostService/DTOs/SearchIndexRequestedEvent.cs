namespace PostService.DTOs;

public record SearchIndexRequestedEvent(Guid TargetId, string TargetType, DateTime OccurredAt);
