using System.ComponentModel.DataAnnotations;

namespace UserService.DTOs
{
    public class UpdateBioRequest
    {
        [MaxLength(500, ErrorMessage = "Bio cannot exceed 500 characters")]
        public string? Bio { get; set; }
    }
}
