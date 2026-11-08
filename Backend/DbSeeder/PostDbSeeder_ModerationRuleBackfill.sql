-- Backfill: nội dung đã bị approve nhầm (có chửi thề) → áp lại quyết định của rule.
-- Idempotent: chạy lại nhiều lần vẫn cho cùng kết quả.
--
-- Ngữ cảnh: trước khi có ModerationRuleFilter, LLM (deepseek-flash) approve chửi thề
-- đứng riêng lẻ với confidence cao (0.8–0.9) → nội dung vi phạm bị hiển thị công khai.
--
-- Quy tắc (khớp với Backend/PostService/appsettings.json → Moderation:Rules):
--   - ProfanityTerms (chặn thẳng)  → Status = 2 (Rejected)
--   - ProfanityReviewTerms (vùng xám) → Status = 3 (NeedsReview)
--
-- ModerationStatus: 0=Pending, 1=Approved, 2=Rejected, 3=NeedsReview
-- ModerationSource : 0=Rule, 1=Llm, 2=Fallback, 3=Human

BEGIN;

-- ── 1. Posts ────────────────────────────────────────────────────────────────
UPDATE "Posts" p
SET "ModerationStatus" = 2,
    "ModeratedAt" = NOW()
WHERE p."IsDeleted" = false
  AND p."ModerationStatus" = 1
  AND p."Content" ~* '(?<![[:alpha:]])(fuck|shit|bitch|cunt|asshole|bastard|whore|slut|faggot|nigger|retard)(?![[:alpha:]])';

UPDATE "Posts" p
SET "ModerationStatus" = 3,
    "ModeratedAt" = NOW()
WHERE p."IsDeleted" = false
  AND p."ModerationStatus" = 1
  AND p."Content" ~* '(?<![[:alpha:]])(cac ma dien|cái mẹ|mẹ mày|thằng cha mày)(?![[:alpha:]])';

-- ── 2. Comments ────────────────────────────────────────────────────────────
UPDATE "Comments" c
SET "ModerationStatus" = 2,
    "ModeratedAt" = NOW()
WHERE c."ModerationStatus" = 1
  AND c."Content" ~* '(?<![[:alpha:]])(fuck|shit|bitch|cunt|asshole|bastard|whore|slut|faggot|nigger|retard)(?![[:alpha:]])';

UPDATE "Comments" c
SET "ModerationStatus" = 3,
    "ModeratedAt" = NOW()
WHERE c."ModerationStatus" = 1
  AND c."Content" ~* '(?<![[:alpha:]])(cac ma dien|cái mẹ|mẹ mày|thằng cha mày)(?![[:alpha:]])';

-- ── 3. Reels ───────────────────────────────────────────────────────────────
UPDATE "Reels" r
SET "ModerationStatus" = 2,
    "ModeratedAt" = NOW()
WHERE r."ModerationStatus" = 1
  AND r."Caption" ~* '(?<![[:alpha:]])(fuck|shit|bitch|cunt|asshole|bastard|whore|slut|faggot|nigger|retard)(?![[:alpha:]])';

UPDATE "Reels" r
SET "ModerationStatus" = 3,
    "ModeratedAt" = NOW()
WHERE r."ModerationStatus" = 1
  AND r."Caption" ~* '(?<![[:alpha:]])(cac ma dien|cái mẹ|mẹ mày|thằng cha mày)(?![[:alpha:]])';

-- ── 4. ModerationResults: đồng bộ lại quyết định ──────────────────────────
-- Bản ghi của nội dung vừa bị hạ trạng thái → đánh dấu Source = Rule (0).
-- Giữ nguyên LlmDecision/Severity/Confidence của lần chạy LLM để admin còn
-- đối chiếu được "AI đã nói gì" so với "rule đã chặn".
UPDATE "ModerationResults" m
SET "Status" = 2,
    "Source" = 0,
    "InternalReasonCode" = 'rule_profanity',
    "AuthorReason" = 'Your content contains abusive or profane language, which is not allowed on UITVibes.',
    "UpdatedAt" = NOW()
WHERE m."Status" = 1
  AND (
    (m."TargetType" = 0 AND EXISTS (
        SELECT 1 FROM "Posts" p
        WHERE p."Id" = m."TargetId"
          AND p."Content" ~* '(?<![[:alpha:]])(fuck|shit|bitch|cunt|asshole|bastard|whore|slut|faggot|nigger|retard)(?![[:alpha:]])'))
    OR (m."TargetType" = 1 AND EXISTS (
        SELECT 1 FROM "Comments" c
        WHERE c."Id" = m."TargetId"
          AND c."Content" ~* '(?<![[:alpha:]])(fuck|shit|bitch|cunt|asshole|bastard|whore|slut|faggot|nigger|retard)(?![[:alpha:]])'))
    OR (m."TargetType" = 2 AND EXISTS (
        SELECT 1 FROM "Reels" r
        WHERE r."Id" = m."TargetId"
          AND r."Caption" ~* '(?<![[:alpha:]])(fuck|shit|bitch|cunt|asshole|bastard|whore|slut|faggot|nigger|retard)(?![[:alpha:]])'))
  );

UPDATE "ModerationResults" m
SET "Status" = 3,
    "Source" = 0,
    "InternalReasonCode" = 'rule_profanity_review',
    "AuthorReason" = 'Your content contains abusive or profane language, which is not allowed on UITVibes.',
    "UpdatedAt" = NOW()
WHERE m."Status" = 1
  AND (
    (m."TargetType" = 0 AND EXISTS (
        SELECT 1 FROM "Posts" p
        WHERE p."Id" = m."TargetId"
          AND p."Content" ~* '(?<![[:alpha:]])(cac ma dien|cái mẹ|mẹ mày|thằng cha mày)(?![[:alpha:]])'))
    OR (m."TargetType" = 1 AND EXISTS (
        SELECT 1 FROM "Comments" c
        WHERE c."Id" = m."TargetId"
          AND c."Content" ~* '(?<![[:alpha:]])(cac ma dien|cái mẹ|mẹ mày|thằng cha mày)(?![[:alpha:]])'))
    OR (m."TargetType" = 2 AND EXISTS (
        SELECT 1 FROM "Reels" r
        WHERE r."Id" = m."TargetId"
          AND r."Caption" ~* '(?<![[:alpha:]])(cac ma dien|cái mẹ|mẹ mày|thằng cha mày)(?![[:alpha:]])'))
  );

COMMIT;

\echo '=== Sau backfill: Reels ==='
SELECT "Id", "Caption", "ModerationStatus" FROM "Reels" ORDER BY "CreatedAt" DESC LIMIT 10;
\echo '=== Sau backfill: Posts ==='
SELECT "Id", "Content", "ModerationStatus" FROM "Posts" WHERE "IsDeleted" = false ORDER BY "CreatedAt" DESC LIMIT 10;
\echo '=== Sau backfill: ModerationResults ==='
SELECT "TargetType", "Status", "Source", "InternalReasonCode", "CreatedAt" FROM "ModerationResults" ORDER BY "CreatedAt" DESC LIMIT 15;
