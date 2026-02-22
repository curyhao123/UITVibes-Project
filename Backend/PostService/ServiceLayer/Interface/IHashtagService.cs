using PostService.DTOs;

namespace PostService.ServiceLayer.Interface;

public interface IHashtagService
{
    Task<List<HashtagDto>> GetTrendingHashtagsAsync(int skip = 0, int take = 20);
    Task<List<HashtagDto>> SearchHashtagsAsync(string query, int skip = 0, int take = 20);
    Task<List<PostDto>> GetPostsByHashtagAsync(string hashtagName, Guid? currentUserId = null, int skip = 0, int take = 20);
                   
}
