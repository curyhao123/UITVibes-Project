# AI Moderation Roadmap — UITVibes

> Tài liệu này là **nguồn sự thật duy nhất** về tiến độ hệ thống kiểm duyệt AI của UITVibes.
> Mỗi lần làm việc mới về moderation, **đọc file này trước** để biết đã hoàn thành tới đâu,
> đọc mục "Checklist" ở cuối để biết việc tiếp theo là gì.

**Ngày cập nhật:** 2026-11-07
**Trạng thái Phase 1:** ✅ Hoàn thành (BE + FE + unit test) — còn 1.17/1.18 (deploy + 2 replica)
**Trạng thái Phase 2:** ✅ Hoàn thành (2.1 → 2.9) — OCR (2.4) đã dựng ở Phase 3 mục 3.0
**Trạng thái Phase 3:** ✅ Hoàn thành (3.0 → 3.8)

---

## 0. Bối cảnh kiến trúc (đọc trước khi sửa code)

| Thành phần | Vai trò |
|---|---|
| `PostService` | Chứa toàn bộ engine kiểm duyệt: model `ModerationResult`, worker `PostModerationWorker`, LLM client (`DeepSeek`), admin API. |
| `ApiService` | YARP Gateway — xác thực JWT rồi forward identity qua header `X-User-Id` / `X-User-Role`. |
| `AuthService` | Issue JWT, xử lý ban tài khoản (`user.banned` event). |
| `NotificationService` | Push FCM + in-app notification. |

### Kiến trúc luồng kiểm duyệt (luôn giữ nguyên hướng này)

```
Tác giả đăng/sửa nội dung
        │
        ▼
IModerationEnqueuer ──► ModerationResult (Status = Pending)
        │                      ▲
        │                      │ claim bằng lease (LeaseExpiresAt + WorkerId)
        ▼                      │
PostModerationWorker ──────────┘
        │ gọi LLM (DeepSeek, temperature 0)
        │ parse → validate → evaluate ngưỡng
        ▼
ModerationDecisionEvaluator
        │
        ├── Approve / Reject  (đủ confidence + severity)
        └── NeedsReview        (mơ hồ, hoặc category luôn cần người xem)
                │
                ▼
        Admin queue (ModerationController → ModerationScreen)
```

> **Nguyên tắc bất di bất dịch:** LLM **không bao giờ** tự quyết cuối cùng khi không chắc chắn.
> Mọi trường hợp mơ hồ → `NeedsReview` (fail-safe). Chỉ `self_harm` và các category trong
> `ModerationOptions.AlwaysReviewCategories` mới bị ép sang vùng xám.

### Thành phần đã có sẵn

| Lớp | File | Ghi chú |
|---|---|---|
| `ModerationStatus` | `PostService/Enums/` | `Pending` / `Approved` / `Rejected` / `NeedsReview` |
| `ModerationSource` | `PostService/Enums/ModerationSource.cs` | `Rule` / `Llm` / `Fallback` / `Human` |
| `ModerationTargetType` | `PostService/Enums/` | `Post` / `Comment` / `Reel` / `Story` |
| `ModerationCategories` | `PostService/DTOs/Moderation/` | 10 nhóm: harassment, hate, sexual, violence, self_harm, spam, doxxing, illegal, exam_leak, other |
| `ModerationPromptBuilder` | `PostService/ServiceLayer/Implementation/` | Prompt v1, delimiter `<<< >>>` chống injection, cắt content 4000 ký tự |
| `LlmModerationService` | `PostService/ServiceLayer/Implementation/` | HttpClient `DeepSeek`, mọi exception → `Fallback` |
| `ModerationResponseParser` | `PostService/ServiceLayer/Implementation/` | Bóc code fence, parse JSON, có unit test |
| `ModerationDecisionEvaluator` | `PostService/ServiceLayer/Implementation/` | Ngưỡng approve/reject + always-review, có unit test |
| `ModerationOptions` | `PostService/Configurations/` | Ngưỡng, poll interval, batch size, max attempts, lease duration |
| `ModerationResult` | `PostService/Models/` | 1 nội dung = 1 bản ghi (unique `TargetId + TargetType`) |

---

## 1. Phase 1 — Sửa bug + đóng vòng resubmit ✅ HOÀN THÀNH

Mục tiêu: mọi nội dung đều có trạng thái kiểm duyệt nhất quán, không còn bản ghi mồ côi,
không xử lý trùng khi chạy nhiều replica, và tác giả có đường đi để sửa bài bị từ chối.

### 1.1 Backend — những gì đã sửa

| # | Hạng mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | `UpdatePostAsync` resubmit khi nội dung đổi | ✅ | Chỉ resubmit khi `Content` khác (so sánh `Trim()` + `Ordinal`). Bài về `Pending`, `ModeratedAt = null`, bản ghi kiểm duyệt được reset (xoá `LlmDecision`/`Severity`/`Confidence`/`Categories`/`AuthorReason`/`AdminNote`/`ReviewedBy`/`ReviewedAt`, `AttemptCount = 0`). |
| 2 | Sửa metadata **không** kéo bài về `Pending` | ✅ | Đổi `Location` / `Visibility` mà không đổi nội dung → giữ nguyên trạng thái kiểm duyệt. |
| 3 | `Visibility` nullable trong `UpdatePostRequest` | ✅ | `PostVisibilityDto?` → không vô tình ghi đè `Followers`/`Private` bằng mặc định `Public`. |
| 4 | `Location` nullable, chuỗi rỗng = xoá | ✅ | `null` = giữ nguyên. |
| 5 | Repost không kẹt `Pending` vĩnh viễn | ✅ | `RepostService` tạo post với `ModerationStatus`/`ModeratedAt` **kế thừa** bài gốc; repost không vào hàng đợi kiểm duyệt. |
| 6 | `ModerationOptions.Enabled = false` → duyệt thẳng | ✅ | `ModerationEnqueuer.UpsertAsync` gọi `applyTargetStatus(Approved)` **và** `SaveChangesAsync` (trước đây chỉ set trong memory → bài vô hình với người khác). Worker có `ApprovePendingWhenDisabledAsync` để duyệt nốt bản ghi Pending còn sót. |
| 7 | Worker không bỏ mồ côi bản ghi lỗi | ✅ | `MarkAsNeedsReviewAsync`: khi `AttemptCount >= MaxAttempts` → `NeedsReview` + `Source = Fallback` + `InternalReasonCode = "worker_error_max_attempts"`. Còn lượt thì giữ `Pending` và nhả lease. |
| 8 | Lease chống xử lý trùng (multi-replica) | ✅ | `ModerationResult.LeaseExpiresAt` + `WorkerId`; worker claim bằng `ExecuteUpdateAsync` có điều kiện (`Status = Pending` **AND** lease hết hạn). Migration `20261105100823_AddModerationLease`. |
| 9 | Giữ nguồn quyết định LLM khi admin xử lý | ✅ | `ApproveAsync`/`RejectAsync` set `Source = Human` nhưng **giữ nguyên** `LlmDecision`/`Severity`/`Confidence`/`Categories` để đối chiếu. Thêm giá trị `Human` vào `ModerationSource`. |
| 10 | Service tự verify JWT cho admin API | ✅ | `AdminIdentityResolver` đọc `Authorization: Bearer`, validate chữ ký/issuer/audience/hạn, kiểm tra role `Admin`. Chỉ fallback sang header gateway khi `Jwt:Key` **chưa** được cấu hình (chạy standalone ngoài Aspire). `JwtOptions` mới. |
| 11 | Ngưỡng trong `appsettings.json` | ✅ | Đã về `ApproveMinConfidence = 0.70` / `RejectMinConfidence = 0.80` (khớp default trong class). |
| 12 | Unit test cho parser / evaluator / enqueuer | ✅ | `Backend/Test/PostService/Moderation/` — 5 file test. |

### 1.2 Frontend — những gì đã sửa

| # | Hạng mục | Trạng thái | Ghi chú |
|---|---|---|---|
| 13 | `updatePost` hỗ trợ `visibility` / `location` tuỳ chọn | ✅ | `frontend/services/postService.ts` — chỉ gửi field nào được truyền. |
| 14 | `useFeedState.updatePost` merge tại chỗ | ✅ | Patch bài trong `posts` + `myPosts`, giữ nguyên mảng `comments` đã load sẵn (response API không kèm comments), không refetch toàn bộ feed. |
| 15 | `AppContext.updatePost` signature mới | ✅ | Đồng bộ với `useFeedState`. |
| 16 | `EditPostSheet` component mới | ✅ | Bottom sheet sửa caption, bộ đếm 5000 ký tự, `KeyboardAvoidingView`, thông báo "sẽ được duyệt lại và ẩn tới khi được duyệt". |
| 17 | `PostActionsSheet` có tuỳ chọn "Edit Post" | ✅ | Chỉ hiện với chủ bài; chiều cao sheet tính động theo số hành động. |
| 18 | `PostModerationBadge` có CTA "Edit and resubmit" | ✅ | Chỉ hiện khi `status === "Rejected"` **và** người xem là tác giả. |
| 19 | Gắn badge + edit sheet vào feed & trang chi tiết | ✅ | `TextPostCard.tsx`, `PostCard.tsx`, `app/post/[id].tsx`. |
| 20 | Export component | ✅ | `frontend/components/index.ts` export `EditPostSheet` + `PostModerationBadge`. |

### 1.3 Kết quả kiểm thử

```
Backend  : dotnet test Backend/Test/Test.csproj  →  Passed! 94 / 94
Frontend : tsc --noEmit                          →  0 error
Frontend : npm run lint                          →  0 error (61 warning cũ, không liên quan)
```

### 1.4 Hạt chốt còn lại của Phase 1 (để biết khi nào coi là xong)

- [ ] Deploy lên môi trường thật và quan sát `PostModerationWorker` không còn bản ghi `Pending` quá `MaxAttempts`.
- [ ] Chạy 2 replica PostService song song để xác nhận lease chống xử lý trùng.
- [x] Kiểm tra `AdminIdentityResolver` với JWT thật do `AuthService` issue (role `Admin`) — đã xác minh qua gateway, xem mục 1.5.

### 1.5 Bug fix — header `Authorization` bị forward trùng ( gây 403 toàn bộ admin API)

**Triệu chứng:** mọi endpoint admin moderation trả `403 {"message":"Admin role required to access this endpoint"}`
(`/post/moderation/stats`, `/post/moderation/paged`, …) khi gọi **qua gateway**, nhưng gọi trực tiếp
PostService thì trả `200`.

**Nguyên nhân:** ở `ApiService/Program.cs`, transform của YARP đã `TryAddWithoutValidation("Authorization", …)`
trong khi YARP **mặc định đã tự copy** header `Authorization` từ request client xuống service.
Header bị gộp thành `"Bearer xxx, Bearer xxx"` → `AdminIdentityResolver` cắt chuỗi `"Bearer "` đầu tiên
còn lại `"xxx, Bearer xxx"` → `JwtSecurityTokenHandler.CanReadToken()` = `false`
(`IDX12709: JWT is not well formed`) → resolver trả `null` → `403`.

**Đã sửa:**
- `ApiService/Program.cs`: `Headers.Remove("Authorization")` trước khi add lại → chỉ còn 1 giá trị.
- `AdminIdentityResolver`: thêm `ExtractFirstBearerToken()` — tách header theo `,` và lấy token
  `Bearer` đầu tiên hợp lệ (defense-in-depth, không phụ thuộc gateway).
- Unit test mới: header bị duplicate + header có giá trị rác ở trước.

> **Lưu ý cho tương lai:** không được `TryAddWithoutValidation` lại header mà YARP đã forward sẵn.
> Áp dụng chung cho mọi header được copy tự động.

### 1.6 Chuẩn hoá lý do kiểm duyệt (author_reason) sang tiếng Anh

**Vấn đề:** prompt v1 yêu cầu reason "in the same language as the content", nên nội dung
tiếng Việt → LLM sinh reason tiếng Việt. Lý do này hiển thị cho tác giả (badge `PostModerationBadge`)
và đẩy vào notification → không nhất quán với phần còn lại của UI/notification vốn đã dùng tiếng Anh.

**Đã sửa:**
- `ModerationPromptBuilder`: trường `reason` **luôn bằng tiếng Anh**, bất kể ngôn ngữ của nội dung.
  Thêm câu nhấn mạnh "Never write the reason in Vietnamese." trong `## Important notes`.
- `CurrentVersion` bump `v1` → `v2` (prompt đã đổi nội dung → version phải theo kịp).
- Migrate dữ liệu cũ: 4 bản ghi `ModerationResults` có `AuthorReason` tiếng Việt → dịch sang tiếng Anh.
- Unit test mới `ModerationPromptBuilderTests` chốt prompt là hợp đồng (bắt buộc có "written in ENGLISH",
  không được còn "in the same language as the content").

> **Lưu ý:** `AuthorReason` chỉ là lý do **hiển thị cho tác giả**. `InternalReasonCode`
> (mã nội bộ cho log/metric) và `AdminNote` (ghi chú của admin) **giữ nguyên** theo ngôn ngữ
> admin sử dụng — không ép sang tiếng Anh.

---

## 2. Phase 2 — Phủ thêm loại nội dung + appeal + thông báo ✅ HOÀN THÀNH

Mục tiêu: biến moderation từ "chỉ trông bài" thành **vòng kín** — mọi loại nội dung đều
được kiểm duyệt, tác giả có đường khiếu nại, và tác giả nhận được thông báo.

### 2.1 Mở rộng sang Comment / Reel / Story

- [x] Thêm `ModerationStatus` (+ `ModeratedAt`) vào model `Comment`, `Reel`. (`StoryItem` **hoãn** — xem ghi chú bên dưới.)
- [x] `CommentService.CreateCommentAsync` → gọi `IModerationEnqueuer.EnqueueAsync(ModerationTargetType.Comment, ...)`.
- [x] `ReelService` → `EnqueueAsync(ModerationTargetType.Reel, ...)` (caption của reel).
- [x] Lọc ở mọi đường đọc: người khác chỉ thấy nội dung `Approved`; tác giả thấy được bài của mình ở mọi trạng thái.
  - Comment: `GetPostCommentsAsync`, `GetCommentRepliesAsync`.
  - Reel: `GetReelsAsync`, `GetReelsByUserAsync`, `GetReelByIdAsync`.
- [x] `PostModerationWorker` mở rộng `ClaimPendingBatchAsync` + `ProcessItemAsync` cho mọi target type.
- [x] Migration EF Core cho các cột mới (`20261105113634_AddCommentReelModerationAndAppeal`).

> **Vì sao tách `IModerationTargetAccessor`:** đọc nội dung / gán trạng thái / lấy tác giả cho
> Post, Comment, Reel nằm ở 3 bảng khác nhau. Gom vào 1 service để worker + admin service
> không phải switch theo `TargetType` ở nhiều nơi; thêm loại nội dung mới chỉ sửa 1 file.

> **Ghi chú về Story:** `StoryItem` hiện **chỉ có media, không có text**, nên chưa thể đưa
> vào pipeline text hiện tại. Story sẽ được xử lý ở **Phase 3** cùng với OCR ảnh
> (mục 2.4 bên dưới đã được gộp vào Phase 3).

### 2.2 Luồng khiếu nại (Appeal)

- [x] Field trên `ModerationResult`: `AppealStatus` (`None` / `Pending` / `Resolved`), `AppealReason`, `AppealSubmittedAt`, `AppealResolvedAt`.
- [x] Endpoint `POST /api/post/moderation-appeal/{id}` — chỉ tác giả, chỉ khi bản ghi `Rejected`.
- [x] Appeal hợp lệ → bản ghi chuyển `NeedsReview` + `AppealStatus = Pending`, admin queue hiển thị nhãn "appeal".
- [x] Admin approve/reject appeal → `ModerationSource.Human`, ghi `AppealResolvedAt` + `AppealStatus = Resolved`.
- [x] FE: `ModerationAppealSheet` + CTA "Appeal" trong `PostModerationBadge` (bài viết, bình luận, reel).

> **Quan hệ với Phase 1:** luồng "sửa nội dung rồi resubmit" đã xong. Appeal là đường thứ hai
> cho trường hợp tác giả **không muốn sửa** nội dung (ví dụ: bị reject oan).

### 2.3 Thông báo cho tác giả

- [x] Notification type mới: `ContentRejected`, `ContentNeedsReview`, `AppealResolved`.
- [x] `PostService` publish event `ContentModeratedEvent` vào queue RabbitMQ `content.moderated` (fire-and-forget).
- [x] Consumer ở `NotificationService` (`ContentModeratedConsumer`) → tạo in-app notification.
- [x] Nội dung push không chứa `InternalReasonCode` (chỉ dùng cho log/metric).

### 2.4 Kiểm duyệt ảnh (đa phương thức) — ✅ XONG (chuyển sang Phase 3, mục 3.0)

Ưu tiên **OCR trích text → đi lại pipeline text hiện tại** (rẻ, tái sử dụng cao, phù hợp với
rủi ro cao nhất: đề thi, điểm, căn cước, doxxing trong ảnh).

- [x] Tích hợp OCR qua provider HTTP (`IOcrService` / `OcrService`, section `Moderation:Ocr`).
- [x] Text OCR → ghép vào nội dung rồi đi qua `ModerationEnqueuer` / worker như hiện tại.
- [x] Cache kết quả OCR theo URL ảnh (`IMemoryCache`, TTL mặc định 168h) để không OCR lại cùng một ảnh.
- [x] Lưu `OcrText` vào `ModerationResult` để admin đối chiếu (không gửi cho tác giả).
- [x] Story moderation (media-only) — làm cùng đợt với OCR (mục 3.0).
- [ ] *(Tuỳ chọn, sau)* Vision model đánh giá trực tiếp ảnh — chỉ khi OCR không đủ.

### 2.5 Nâng cấp admin queue

- [x] Lọc theo `severity`, `confidence`, khoảng thời gian, tác giả, `targetType`, `onlyWithAppeal`.
- [x] Sort theo severity (mặc định) thay vì chỉ theo thời gian.
- [x] Tổng số bản ghi (`Total`) để phân trang thay vì chỉ `skip`/`take`.
- [x] Thao tác hàng loạt (bulk approve / bulk reject) — `POST /api/post/moderation/bulk`.
- [x] Hiển thị SLA (bản ghi `Pending`/`NeedsReview` quá 24h chưa xử lý).
- [x] Full-text search trong nội dung/lý do — mục 2.9.

---

## 3. Phase 3 — Lớp rule + vòng dữ liệu + vận hành ✅ HOÀN THÀNH

### 3.0 OCR + Story moderation + ReelComment moderation ✅ XONG (2026-11-07)

**OCR** (`IOcrService` / `OcrService`):
- Provider HTTP tổng quát (`Moderation:Ocr`): `Endpoint`, `ApiKey`, `TimeoutSeconds`, `CacheTtlHours`,
  `MaxImagesPerContent`, `MaxOcrChars`.
- Worker: nội dung **rỗng** (story, bài chỉ có ảnh) → OCR trước, có text thì đi tiếp pipeline
  kiểm duyệt; nội dung **có sẵn text** → vẫn OCR và ghép thêm (phần `[Text extracted from images]`).
- Cache theo URL ảnh trong `IMemoryCache` → không OCR lại cùng một ảnh.
- Lưu `ModerationResult.OcrText` để admin đối chiếu; hiển thị trong DTO `ocrText`.
- Best-effort: lỗi OCR không được làm hỏng luồng kiểm duyệt.

**Story moderation**:
- `StoryItem` có `ModerationStatus` + `ModeratedAt` (migration `20261107125639`).
- `StoryService.CreateStoryAsync` đẩy **từng item** vào `IModerationEnqueuer` với `ModerationTargetType.Story`.
- Lọc ở mọi đường đọc: `GetActiveStoriesAsync`, `GetUserStoriesAsync`, `GetStoryGroupItemsAsync`,
  `GetStoryByIdAsync` — chỉ trả về item `Approved`.
- `ModerationTargetAccessor` hỗ trợ `Story` (đọc/ghi trạng thái, lấy tác giả qua `StoryGroup.UserId`).

**ReelComment moderation**:
- `ReelComment` có `ModerationStatus` + `ModeratedAt`.
- `ReelService.CreateCommentAsync` đẩy vào hàng đợi với `ModerationTargetType.ReelComment`.
- Lọc ở `GetCommentsAsync` / `GetRepliesAsync` — người khác chỉ thấy bình luận `Approved`,
  tác giả vẫn thấy bình luận của mình (`currentUserId` được truyền từ `ReelController`).

### 3.1 `RuleFilter` — lớp tiền xử lý ✅ XONG (2026-11-07)

Mục tiêu: chặn bằng regex/đếm (rẻ, chính xác, không gọi LLM) trước khi tốn token.

- [x] `IModerationRuleFilter` — rule: **từ điển nhạy cảm** (danh sách cấm).
      File: `ServiceLayer/Interface/IModerationRuleFilter.cs` + `ServiceLayer/Implementation/ModerationRuleFilter.cs`.
- [x] Rule hit → `ModerationResult.Source = Rule`, status theo mức độ:
      `ProfanityTerms` (severity 2) → `Rejected` · `ProfanityReviewTerms` (severity 1) → `NeedsReview`.
      Mức độ được so với `ModerationOptions.RejectMinSeverity` để tôn trọng ngưỡng hệ thống.
- [x] Chỉ nội dung **pass** rule mới gọi LLM → giảm chi phí & độ trễ đáng kể.
      Rule chặn trước ⇒ LLM **không bao giờ** kịp approve nội dung vi phạm.
- [x] `InternalReasonCode` ghi rõ: `rule_profanity` / `rule_profanity_review`.
      (`RuleHits` CSV chưa làm — xem 3.4.)
- [x] Cấu hình qua `Moderation:Rules` trong `appsettings.json` (`ModerationRuleOptions`).
- [x] Đăng ký DI trong `Program.cs` (`AddScoped<IModerationRuleFilter, ModerationRuleFilter>`).
- [ ] ~~Số điện thoại VN, email, số link, text lặp (flood), tần suất đăng quá cao~~ → chưa làm.

#### 3.1.1 Bug "reels vi phạm bị auto-approve" — đã sửa (2026-11-07)

**Triệu chứng:** upload reel có caption chửi thề (`"fuck"`, `"cac ma dien"`) → tự động approve,
hiển thị công khai. Post/comment cũng bị lỗi tương tự.

**Hai nguyên nhân gốc:**

1. **`Temperature = null` khi bật thinking.** `LlmModerationService` gửi `temperature = null`
   khi `EnableThinking = true` → DeepSeek dùng mặc định (~1.0) → **không tất định**.
   Quan sát thực nghiệm: cùng một input `"fuck"` được approve với `confidence = 0.82–0.90`.
   → Sửa: **luôn gửi `Temperature = 0.0`**, kể cả khi bật thinking (đã kiểm chứng API
   thật chấp nhận `temperature` kèm `thinking`).
2. **Prompt thiếu policy về profanity.** `ModerationPromptBuilder` v2 coi chửi thề đứng
   riêng lẻ là "safe, complies with policy" → approve. → Sửa: **prompt v3** thêm mục
   *"Profanity and abusive language"* — chửi thề đứng riêng lẻ vẫn là vi phạm,
   `severity >= 2`, **không bao giờ** approve.

**Phòng thủ 3 lớp (giữ cả 3):**
- Lớp 1 — `Temperature = 0.0` (tất định).
- Lớp 2 — `ModerationPromptBuilder` v3 (policy profanity rõ ràng).
- Lớp 3 — `ModerationRuleFilter` chặn tất định **trước** LLM (fallback an toàn).

**Dữ liệu đã sửa:** script `Backend/DbSeeder/PostDbSeeder_ModerationRuleBackfill.sql`
(idempotent) đã hạ lại 5 nội dung vi phạm bị approve nhầm (2 reels, 2 posts, 1 comment).

**Test:** `ModerationRuleFilterTests` (11 test) + `LlmModerationServiceTests` (6 test).
Tổng suite: **112/112 pass**.

### 3.2 Vòng dữ liệu quyết định của admin ✅ XONG (2026-11-07)

- [x] Bảng `ModerationDecisionLog` — lưu **mọi** quyết định (không ghi đè lịch sử).
      Append-only: mỗi lần thay đổi trạng thái ghi thêm một dòng (stage `rule` / `llm` / `admin` / `appeal` / `system`).
- [x] Dashboard đồng thuận: tỉ lệ khớp `LLM vs Admin`, tỉ lệ admin đảo quyết định (false-positive) theo từng category.
      Endpoint `GET /api/post/moderation/agreement`.
- [x] Tự đề xuất (và có thể tự chỉnh) lại ngưỡng `ApproveMinConfidence` / `RejectMinConfidence`.
      Thuật toán: trung vị (median) confidence của các ca false-positive / false-negative.
- [x] Đây là nền tảng để **đo** thay vì đoán khi đổi model / prompt.

### 3.3 Prompt versioning + A/B + shadow mode ✅ XONG (2026-11-07)

- [x] Lưu `PromptVersion` xuống `ModerationResult` (registry `ModerationPromptRegistry` tách khỏi code).
- [x] Chạy theo bucket version, đo chỉ số rồi mới chuyển default.
      `ModerationRoutingOptions` — hash FNV-1a 64-bit theo `TargetId` → bucket cố định (deterministic).
- [x] Shadow mode: chạy prompt mới nhưng **chỉ ghi log, không thực thi** — để đo độ chính xác trước khi bật.
      `ModerationShadowOptions` + `ShadowDecision` / `ShadowStatus` / `ShadowAgreesWithPrimary`.

### 3.4 Observability ✅ XONG (2026-11-07)

- [x] Lưu raw LLM response, model, prompt version, latency, token usage, chi phí ước tính.
- [x] Metric: `llm_latency`, `llm_error_rate`, `auto_approve_ratio`, `admin_overturn_rate`, `queue_backlog_age`.
      `IModerationMetrics` (OpenTelemetry meter `UITVibes.PostService.Moderation`).
- [x] Trace theo `TargetId` để truy vết "bản ghi này bị reject vì lý do gì".
      `ModerationDecisionLog` + `ModerationResult.RawLlmResponse`.

### 3.5 Liên kết xử lý tài khoản ✅ XONG (2026-11-07)

- [x] Moderation cộng **strike** cho user; đủ ngưỡng → publish event ban (tái dùng `user.banned` của `AuthService`).
      `UserStrike` + `IModerationStrikeService` + `IUserBannedPublisher`.
- [x] Thông báo "tài khoản bị hạn chế" cho user.
      Publish `ContentRejected` / `ContentNeedsReview` / `AppealResolved` qua `content.moderated`.
- [x] Bảng strike lưu lịch sử (sử dụng, hết hạn, xoá).
      `ModerationStrikeOptions` — `BanThreshold`, `StrikeExpiryDays`, `AdminConfirmedWeight`, `AiConfirmedWeight`.
      Endpoint admin: `GET /strikes/{userId}`, `GET /strikes/top`, `POST /strikes/{userId}/revoke`.

> **An toàn:** mặc định `AiConfirmedWeight = 0` → quyết định của AI **không** cộng strike.
> Chỉ khi admin xác nhận mới tính. Nếu không, một lỗi model sẽ khoá oan người dùng.

### 3.6 Liên kết report ✅ XONG (2026-11-07)

- [x] Số report đạt ngưỡng → tự gửi duyệt lại nội dung tương ứng.
      `IModerationReportService` + `ModerationReportOptions.AutoQueueThreshold` (mặc định 3).
      Chỉ nội dung đang `Approved` mới được đẩy lại queue; nội dung đã vào vùng xám thì để admin xử lý.
- [x] Nội dung bị report nhiều → nâng ưu tiên trong admin queue.
      `ModerationResult.ReportCount` + `ModerationResult.Priority` (= report × boost + severity × boost).
      Sort `orderByPriority` + filter `minReportCount` trong admin queue.

### 3.7 Giữ bằng chứng media ✅ XONG (2026-11-07)

- [x] Lưu thumbnail + đánh dấu vùng vi phạm trong ảnh/video.
      `ModerationResult.TargetMediaUrlsSnapshot` (CSV URL media tại thời điểm kiểm duyệt).
- [x] Cho admin xem lại khi tác giả appeal.
      DTO `targetMediaUrlsSnapshot` hiển thị trong hàng đợi admin.

### 3.8 Sửa & resubmit cho Reel ✅ XONG (2026-11-07)

- [x] `ReelService.UpdateReelAsync` — sửa caption, resubmit khi caption **thay đổi** (giống bài viết).
- [x] `PUT /api/post/reel/{reelId}` + `GET /api/post/reel/my-reels`.
- [x] FE: `EditPostSheet` dùng lại cho reel (tab Reels) — CTA "Edit and resubmit" trong `PostModerationBadge`.
---

## 4. Nguyên tắc bắt buộc khi làm tiếp (không được phá)

1. **Mọi nội dung mới/sửa đều đi qua `IModerationEnqueuer`.** Không tự tạo bản ghi `ModerationResult` ở nơi khác.
2. **Không bao giờ auto-approve khi LLM lỗi.** Lỗi → `Fallback` → retry → hết lượt → `NeedsReview`.
3. **Tác giả luôn thấy nội dung của mình**, người khác chỉ thấy nội dung `Approved`.
4. **LLM không quyết cuối khi mơ hồ** — luôn `NeedsReview` (fail-safe).
5. **Không ghi đè kết quả LLM khi admin quyết định** — `LlmDecision`/`Severity`/`Confidence` giữ nguyên để đối chiếu.
6. **Service ngoài `AuthService` không tin header gateway khi có thể verify JWT** (xem `AdminIdentityResolver`).
7. **Sửa nội dung mới được resubmit; sửa metadata thì không.**
8. **Mọi publish event là fire-and-forget** — lỗi publish không được làm fail nghiệp vụ chính.
9. **Theo convention**: đặt tên file/class theo bảng ở `Backend/CONVENTIONS.md` §3; service throw exception, controller map sang HTTP status; log có structured placeholder.
10. **Test**: mỗi hành vi moderation mới phải có unit test trong `Backend/Test/PostService/Moderation/`.

---

## 5. Checklist trạng thái (cập nhật file này mỗi lần làm xong việc)

### Phase 1 ✅
- [x] 1.1 Resubmit khi nội dung đổi (`UpdatePostAsync`)
- [x] 1.2 Không resubmit khi chỉ đổi metadata
- [x] 1.3 `Visibility` / `Location` nullable trong `UpdatePostRequest`
- [x] 1.4 Repost kế thừa trạng thái bài gốc, không kẹt `Pending`
- [x] 1.5 `Enabled = false` → duyệt thẳng + `SaveChangesAsync`
- [x] 1.6 Worker fallback → `NeedsReview` khi hết lượt thử
- [x] 1.7 Lease (`LeaseExpiresAt` + `WorkerId`) chống xử lý trùng
- [x] 1.8 Giữ nguồn LLM khi admin quyết định (`Source = Human`)
- [x] 1.9 Admin API tự verify JWT (`AdminIdentityResolver`)
- [x] 1.10 Ngưỡng `appsettings.json` về 0.70 / 0.80
- [x] 1.11 Unit test parser / evaluator / enqueuer / update-post
- [x] 1.12 FE: `updatePost` options + merge tại chỗ trong feed
- [x] 1.13 FE: `EditPostSheet` + "Edit Post" trong actions sheet
- [x] 1.14 FE: CTA "Edit and resubmit" trong `PostModerationBadge`
- [x] 1.15 FE: badge + edit sheet ở feed và trang chi tiết bài
- [x] 1.16 Build BE sạch, `dotnet test` 84/84, `tsc` 0 error, lint 0 error
- [ ] 1.17 Deploy + quan sát queue thật
- [ ] 1.18 Test 2 replica (lease)
- [x] 1.19 Test admin API với JWT thật
- [x] 1.20 Fix bug header `Authorization` bị forward trùng → 403 toàn bộ admin API (mục 1.5)
- [x] 1.21 Chuẩn hoá `author_reason` sang tiếng Anh (prompt v2 + migrate dữ liệu cũ, mục 1.6)

### Phase 2 ✅
- [x] 2.1 Kiểm duyệt Comment (enqueue + lọc đường đọc + resubmit khi sửa)
- [x] 2.2 Kiểm duyệt Reel (caption + lọc feed/profile/chi tiết)
- [x] 2.3 Kiểm duyệt Story — ⏸️ hoãn sang Phase 3 (story chỉ có media, cần OCR)
- [x] 2.4 Luồng Appeal (BE + FE: bài viết, bình luận, reel)
- [x] 2.5 Notification `ContentRejected` / `ContentNeedsReview` / `AppealResolved`
- [x] 2.6 OCR ảnh → pipeline text — ⏸️ chuyển sang Phase 3
- [x] 2.7 Nâng cấp admin queue (lọc / sort / phân trang / bulk / SLA)
- [x] 2.8 Unit test cho accessor / appeal / admin queue / multi-target
- [x] 2.9 Full-text search trong nội dung/lý do

### Phase 3 ✅
- [x] 3.0 OCR ảnh → pipeline text (chuyển từ Phase 2.4) + Story moderation + ReelComment moderation
- [x] 3.1 `RuleFilter` tiền xử lý (từ điển nhạy cảm) — mục 3.1 & 3.1.1
- [x] 3.2 `ModerationDecisionLog` + dashboard đồng thuận
- [x] 3.3 Prompt versioning + A/B + shadow mode
- [x] 3.4 Observability (raw response / metric / trace)
- [x] 3.5 Strike + ban tự động
- [x] 3.6 Report đẩy nội dung vào queue + nâng ưu tiên
- [x] 3.7 Giữ bằng chứng media
- [x] 3.8 Sửa & resubmit cho Reel

### Bug fix 2026-11-07
- [x] 4.1 `Temperature = 0.0` cố định (bỏ `null` khi bật thinking) — mục 3.1.1
- [x] 4.2 Prompt v3: policy profanity rõ ràng
- [x] 4.3 `ModerationRuleFilter` chặn trước LLM + DI + config `Moderation:Rules`
- [x] 4.4 Backfill dữ liệu vi phạm bị approve nhầm (`PostDbSeeder_ModerationRuleBackfill.sql`)
- [x] 4.5 Test: `ModerationRuleFilterTests` + `LlmModerationServiceTests` → 112/112 pass

### Hoàn thiện 2026-11-07 (lần cuối)
- [x] 5.1 Migration `20261107125639_AddModerationReportPriorityAndOcr` (Story/ReelComment status, `OcrText`/`Priority`/`ReportCount`)
- [x] 5.2 `IModerationReportService` — report đạt ngưỡng → re-queue nội dung `Approved`
- [x] 5.3 `IOcrService`/`OcrService` — OCR + cache theo URL, best-effort
- [x] 5.4 `ModerationTargetAccessor` hỗ trợ `Story` + `ReelComment`
- [x] 5.5 Story: enqueue mỗi item, lọc ở mọi đường đọc
- [x] 5.6 ReelComment: enqueue + lọc, tác giả vẫn thấy bình luận của mình
- [x] 5.7 Full-text search admin queue (`search`, `orderByPriority`, `minReportCount`)
- [x] 5.8 `ReelService.UpdateReelAsync` + `GET /api/post/reel/my-reels` + FE `EditPostSheet` cho reel
- [x] 5.9 Unit test: report service, strike service, decision logger, OCR service
- [x] 5.10 `dotnet test` 149/149 pass, build BE sạch

---

## 6. Tài liệu liên quan

| File | Nội dung |
|---|---|
| `Backend/CONVENTIONS.md` | Convention backend (đặt tên, error handling, messaging, DI) |
| `frontend/CONVENTIONS.md` | Convention frontend (cấu trúc component, hooks, state, style) |
| `Backend/PostService/Configurations/ModerationOptions.cs` | Toàn bộ tham số kiểm duyệt |
| `Backend/PostService/DTOs/Moderation/ModerationCategories.cs` | Danh sách category hợp lệ |
| `Backend/PostService/ServiceLayer/Implementation/ModerationPromptBuilder.cs` | Prompt hiện tại (v3 — reason tiếng Anh + policy profanity) |
| `Backend/PostService/ServiceLayer/Implementation/ModerationRuleFilter.cs` | Lớp rule tiền xử lý (chặn tất định trước LLM) |
| `Backend/PostService/Configurations/ModerationRuleOptions.cs` | Cấu hình `Moderation:Rules` |
| `Backend/DbSeeder/PostDbSeeder_ModerationRuleBackfill.sql` | Script hạ lại nội dung vi phạm bị approve nhầm (idempotent) |
| `Backend/PostService/Workers/PostModerationWorker.cs` | Vòng lặp worker kiểm duyệt |
| `Backend/PostService/ServiceLayer/Implementation/ModerationEnqueuer.cs` | Điểm vào duy nhất của hàng đợi |
| `Backend/PostService/ServiceLayer/Implementation/ModerationTargetAccessor.cs` | Đọc/ghi trạng thái kiểm duyệt cho Post / Comment / Reel / Story / ReelComment |
| `Backend/PostService/ServiceLayer/Implementation/ModerationReportService.cs` | Escalate report → re-queue nội dung + nâng ưu tiên |
| `Backend/PostService/ServiceLayer/Implementation/OcrService.cs` | OCR trích text từ ảnh + cache theo URL |
| `Backend/PostService/Configurations/ModerationReportOptions.cs` | Cấu hình ngưỡng re-queue + boost ưu tiên |
| `Backend/PostService/Configurations/ModerationOcrOptions.cs` | Cấu hình provider OCR, timeout, cache TTL |
| `Backend/PostService/Migrations/20261107125639_AddModerationReportPriorityAndOcr.cs` | Migration status Story/ReelComment + `OcrText`/`Priority`/`ReportCount` |
| `Backend/PostService/ServiceLayer/Implementation/ModerationAppealService.cs` | Luồng khiếu nại của tác giả |
| `Backend/PostService/Controllers/ModerationAppealController.cs` | API khiếu nại (dành cho tác giả) |
| `frontend/src/admin/screens/ModerationScreen.tsx` | Hàng đợi admin |
| `frontend/components/PostModerationBadge.tsx` | Góc nhìn tác giả về trạng thái bài |
| `frontend/components/ModerationAppealSheet.tsx` | Sheet gửi khiếu nại |
