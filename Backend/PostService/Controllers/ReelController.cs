using Microsoft.AspNetCore.Mvc;
using PostService.DTOs;
using PostService.ServiceLayer.Interface;

namespace PostService.Controllers
{
    [ApiController]
    [Route("api/post/[controller]")]
    public class ReelController : ControllerBase
    {
        private readonly IReelService _reelService;
        private readonly ILogger<ReelController> _logger;

        public ReelController(IReelService reelService, ILogger<ReelController> logger)
        {
            _reelService = reelService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetReels(int skip = 0, int take = 10)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();

            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                var reels = await _reelService.GetReelsAsync(skip, take, userId);
                return Ok(reels);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching reels");
                return StatusCode(500, new { message = "An error occurred while fetching reels" });
            }
        }

        //GET api/reel/{reelId}
        [HttpGet("{reelId}")]
        public async Task<IActionResult> GetReelById(Guid reelId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                var reel = await _reelService.GetReelByIdAsync(reelId, userId);
                if (reel == null)
                {
                    return NotFound(new { message = "Reel not found" });
                }
                return Ok(reel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while fetching reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while fetching the reel" });
            }
        }

        //GET api/reel/{userId}
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetReelsByUserId(Guid userId, int skip = 0, int take = 10)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var currentUserId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                var reels = await _reelService.GetReelsByUserAsync(userId, skip, take, currentUserId);
                return Ok(reels);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while fetching reels for user ID: {userId}");
                return StatusCode(500, new { message = "An error occurred while fetching reels for the user" });
            }
        }


        //POST api/reel
        [HttpPost]
        public async Task<IActionResult> CreateReel([FromBody] CreateReelRequest request)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                var reel = await _reelService.CreateReelAsync(userId, request);
                return Ok(reel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while creating reel");
                return StatusCode(500, new { message = "An error occurred while creating the reel" });
            }
        }

        //POST api/reel/uploadvideo
        [HttpPost("uploadvideo")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadVideo([FromForm] UploadMediaRequest request)
        {
            if (request.File == null || request.File.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded" });
            }
            try
            {
                var response = await _reelService.UploadVideoAsync(request.File);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while uploading video");
                return StatusCode(500, new { message = "An error occurred while uploading the video" });
            }
        }

        //DELETE api/reel/{reelId}
        [HttpDelete("{reelId}")]
        public async Task<IActionResult> DeleteReel(Guid reelId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                await _reelService.DeleteReelAsync(reelId, userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while deleting reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while deleting the reel" });
            }
        }

        //POST api/reel/{reelId}/like
        [HttpPost("{reelId}/like")]
        public async Task<IActionResult> LikeReel(Guid reelId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                await _reelService.LikeReelAsync(reelId, userId);
                return Ok(new { message = "Reel liked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while liking reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while liking the reel" });
            }
        }

        //POST api/reel/{reelId}/unlike
        [HttpPost("{reelId}/unlike")]
        public async Task<IActionResult> UnlikeReel(Guid reelId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                await _reelService.UnlikeReelAsync(reelId, userId);
                return Ok(new { message = "Reel unliked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while unliking reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while liking the reel" });
            }
        }

        //POST api/reel/{reelId}/view
        [HttpPost("{reelId}/view")]
        public async Task<IActionResult> IncrementViewCount(Guid reelId)
        {
            try
            {
                await _reelService.IncrementViewCountAsync(reelId);
                return Ok(new { message = "View count incremented successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while incrementing view count for reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while incrementing the view count" });
            }
        }

        //POST api/reel/{reelId}/share
        [HttpPost("{reelId}/share")]
        public async Task<IActionResult> ShareReel(Guid reelId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                await _reelService.ShareReelAsync(reelId, userId);
                return Ok(new { message = "Reel shared successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while sharing reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while sharing the reel" });
            }
        }

        //POST api/reel/{reelId}/comment
        [HttpPost("{reelId}/comment")]
        public async Task<IActionResult> CreateComment(Guid reelId, [FromBody] CreateReelCommentRequest request)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                var comment = await _reelService.CreateCommentAsync(reelId, userId, request);
                return Ok(comment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while creating comment for reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while creating the comment" });
            }
        }

        //GET api/reel/{reelId}/comments
        [HttpGet("{reelId}/comments")]
        public async Task<IActionResult> GetComments(Guid reelId, int skip = 0, int take = 10)
        {
            try
            {
                var comments = await _reelService.GetCommentsAsync(reelId, skip, take);
                return Ok(comments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while fetching comments for reel with ID: {reelId}");
                return StatusCode(500, new { message = "An error occurred while fetching comments" });
            }
        }

        //GET api/reel/comment/{commentId}/replies
        [HttpGet("comment/{commentId}/replies")]
        public async Task<IActionResult> GetReplies(Guid commentId, int skip = 0, int take = 10)
        {
            try
            {
                var replies = await _reelService.GetRepliesAsync(commentId, skip, take);
                return Ok(replies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while fetching replies for comment with ID: {commentId}");
                return StatusCode(500, new { message = "An error occurred while fetching replies" });
            }
        }

        //DELETE api/reel/comment/{commentId}
        [HttpDelete("comment/{commentId}")]
        public async Task<IActionResult> DeleteComment(Guid commentId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                await _reelService.DeleteCommentAsync(commentId, userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while deleting comment with ID: {commentId}");
                return StatusCode(500, new { message = "An error occurred while deleting the comment" });
            }
        }

        //POST api/reel/comment/{commentId}/like
        [HttpPost("comment/{commentId}/like")]
        public async Task<IActionResult> LikeComment(Guid commentId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                await _reelService.LikeCommentAsync(commentId, userId);
                return Ok(new { message = "Comment liked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while liking comment with ID: {commentId}");
                return StatusCode(500, new { message = "An error occurred while liking the comment" });
            }
        }

        //POST api/reel/comment/{commentId}/unlike
        [HttpPost("comment/{commentId}/unlike")]
        public async Task<IActionResult> UnlikeComment(Guid commentId)
        {
            var userIdHeader = Request.Headers["X-User-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userIdHeader) || !Guid.TryParse(userIdHeader, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in request headers" });
            }
            try
            {
                await _reelService.UnlikeCommentAsync(commentId, userId);
                return Ok(new { message = "Comment unliked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error occurred while unliking comment with ID: {commentId}");
                return StatusCode(500, new { message = "An error occurred while unliking the comment" });
            }
        }
    }
}
