using Microsoft.AspNetCore.Mvc;
using SearchService.ServiceLayer.Interface;

namespace SearchService.Controllers;

[ApiController]
[Route("api/search/admin")]
public class SearchAdminController : ControllerBase
{
    private readonly IReindexJob _reindexJob;

    public SearchAdminController(IReindexJob reindexJob)
    {
        _reindexJob = reindexJob;
    }

    [HttpPost("reindex")]
    public IActionResult StartReindex()
    {
        var denied = CheckAdmin();
        if (denied != null) return denied;

        if (!_reindexJob.TryStart())
            return Conflict(new { message = "A reindex job is already running.", status = _reindexJob.GetStatus() });

        return Accepted(new { message = "Reindex started.", status = _reindexJob.GetStatus() });
    }

    [HttpGet("reindex")]
    public IActionResult GetReindexStatus()
    {
        var denied = CheckAdmin();
        if (denied != null) return denied;

        return Ok(_reindexJob.GetStatus());
    }

    private IActionResult? CheckAdmin()
    {
        if (!Guid.TryParse(Request.Headers["X-User-Id"].FirstOrDefault(), out _))
            return Unauthorized(new { message = "Missing or invalid X-User-Id header." });

        if (!string.Equals(Request.Headers["X-User-Role"].FirstOrDefault(), "Admin", StringComparison.OrdinalIgnoreCase))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Admin role required." });

        return null;
    }
}
