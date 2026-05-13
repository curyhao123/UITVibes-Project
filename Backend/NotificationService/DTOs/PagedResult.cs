namespace NotificationService.DTOs
{
    public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize)
    {
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasNext => Page < TotalPages;
    }
}
