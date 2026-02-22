using Microsoft.AspNetCore.Mvc;
using PostService.DTOs;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers;

[ApiController]
[Route("api/post/hashtag")]
public class HashtagController : ControllerBase
{
    private readonly IHashtagService _hashtagService;
    private readonly ILogger<HashtagController> _logger;

    public HashtagController(IHashtagService hashtagService, ILogger<HashtagController> logger)
    {
        _hashtagService = hashtagService;
        _logger = logger;
    }

    /// <summary>
    /// Get trending hashtags
    /// </summary>
    [HttpGet("trending")]
    public async Task<ActionResult<List<HashtagDto>>> GetTrendingHashtags(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        if (take > 50) take = 50;

        try
        {
            var hashtags = await _hashtagService.GetTrendingHashtagsAsync(skip, take);
            return Ok(hashtags);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending hashtags");
            return StatusCode(500, new { message = "An error occurred while getting trending hashtags" });
        }
    }

    /// <summary>
    /// Search hashtags by name (autocomplete)
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<List<HashtagDto>>> SearchHashtags(
        [FromQuery] string q,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest(new { message = "Search query is required" });
        }

        if (take > 50) take = 50;

        try
        {
            var hashtags = await _hashtagService.SearchHashtagsAsync(q, skip, take);
            return Ok(hashtags);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching hashtags with query {Query}", q);
            return StatusCode(500, new { message = "An error occurred while searching hashtags" });
        }
    }

    /// <summary>
    /// Get posts by hashtag name
    /// </summary>
    [HttpGet("{hashtagName}/posts")]
    public async Task<ActionResult<List<PostDto>>> GetPostsByHashtag(
        string hashtagName,
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20)
    {
        if (take > 50) take = 50;

        var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
        Guid? currentUserId = null;
        if (!string.IsNullOrEmpty(userIdHeader) && Guid.TryParse(userIdHeader, out var userId))
        {
            currentUserId = userId;
        }

        try
        {
            var posts = await _hashtagService.GetPostsByHashtagAsync(hashtagName, currentUserId, skip, take);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting posts for hashtag {Hashtag}", hashtagName);
            return StatusCode(500, new { message = "An error occurred while getting posts by hashtag" });
        }
    }
}