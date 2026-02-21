using Microsoft.EntityFrameworkCore;
using PostService.DTOs;
using PostService.Models;
using PostService.ServiceLayer.Interface;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace PostService.ServiceLayer.Implementation
{
    public class BookmarkService : IBookmarkService
    {
        private readonly PostDbContext _context;
        private readonly ILogger<BookmarkService> _logger;
        public BookmarkService(PostDbContext context, ILogger<BookmarkService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<BookmarkDto> CreateBookmarkAsync(CreateBookmarkRequest request)
        {
            var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == request.PostId && !p.IsDeleted);
            if (post == null)
            {
                _logger.LogWarning("Post with ID {PostId} not found for bookmarking", request.PostId);
                throw new KeyNotFoundException("Post not found");
            }

            var existingBookmark = await _context.Bookmarks.FirstOrDefaultAsync(b => b.PostId == request.PostId && b.UserId == request.UserId);
            if (existingBookmark != null)
            {
                _logger.LogInformation("Bookmark already exists for Post ID {PostId} by User ID {UserId}", request.PostId, request.UserId);
                return await MapToDto(existingBookmark);
            }

            var bookmark = new Bookmark
            {
                Id = Guid.NewGuid(),
                PostId = request.PostId,
                UserId = request.UserId,
                Collection = request.Collection,
                CreatedAt = DateTime.UtcNow
            };
            _context.Bookmarks.Add(bookmark);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Bookmark created with ID {BookmarkId} for Post ID {PostId} by User ID {UserId}", bookmark.Id, bookmark.PostId, bookmark.UserId);
            return await MapToDto(bookmark);
        }

        public async Task<bool> DeleteBookmarkAsync(Guid postId, Guid userId)
        {
            var bookmark = await _context.Bookmarks.FirstOrDefaultAsync(b => b.Id == postId && b.UserId == userId);
            if (bookmark == null)
            {
                _logger.LogWarning("Bookmark with ID {BookmarkId} not found for deletion by User ID {UserId}", postId, userId);
                return false;
            }
            _context.Bookmarks.Remove(bookmark);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Bookmark with ID {BookmarkId} deleted by User ID {UserId}", postId, userId);
            return true;
        }

        public async Task<List<BookmarkDto>> GetBookmarksByUserAsync(Guid userId,string? collection, int skip = 0, int take = 20)
        {
            var query = _context.Bookmarks
                                    .Include(b => b.Post)
                                        .ThenInclude(p => p.Media)
                                    .Where(b => b.UserId == userId);
            
            if (!string.IsNullOrEmpty(collection))
            {
                query = query.Where(b => b.Collection == collection);
            }


            var bookmarks = await query.OrderByDescending(b => b.CreatedAt)
                                        .Skip(skip)
                                        .Take(take)
                                        .ToListAsync();

            _logger.LogInformation("Retrieved {Count} bookmarks for User ID {UserId}", bookmarks.Count, userId);

            var bookmarkDtos = new List<BookmarkDto>();
            foreach (var bookmark in bookmarks)
            {
                bookmarkDtos.Add(await MapToDto(bookmark));
            }

            return bookmarkDtos;
        }

        public async Task<BookmarkDto> MapToDto(Bookmark bookmark)
        {
            var post = await _context.Posts
            .Include(p => p.Media)
            .Include(p => p.Hashtags).ThenInclude(ph => ph.Hashtag)
            .FirstOrDefaultAsync(p => p.Id == bookmark.PostId);

            return new BookmarkDto
            {
                Id = bookmark.Id,
                PostId = bookmark.PostId,
                UserId = bookmark.UserId,
                Collection = bookmark.Collection,
                CreatedAt = bookmark.CreatedAt,
                Post = post != null ? new PostDto
                {
                    Id = post.Id,
                    UserId = post.UserId,
                    Content = post.Content,
                    Visibility = (PostVisibilityDto)post.Visibility,
                    Location = post.Location,
                    LikesCount = post.LikesCount,
                    CommentsCount = post.CommentsCount,
                    SharesCount = post.SharesCount,
                    CreatedAt = post.CreatedAt,
                    UpdatedAt = post.UpdatedAt,
                    Media = post.Media.OrderBy(m => m.DisplayOrder).Select(m => new PostMediaDto
                    {
                        Id = m.Id,
                        Type = (MediaTypeDto)m.Type,
                        Url = m.Url,
                        ThumbnailUrl = m.ThumbnailUrl,
                        DisplayOrder = m.DisplayOrder,
                        Width = m.Width,
                        Height = m.Height
                    }).ToList(),
                    Hashtags = post.Hashtags.Select(ph => ph.Hashtag.Name).ToList()
                } : null
            };
        }
    }
}
