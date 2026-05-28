-- Sample data seeder for PostDb (PostgreSQL) - Posts table
-- UserIds reference from AuthDb/UserDb:
-- Ted: 22222222-2222-2222-2222-222222222222
-- cury_hao: 33333333-3333-3333-3333-333333333333
-- Muller25: 44444444-4444-4444-4444-444444444444
-- HaiQQ: 55555555-5555-5555-5555-555555555555

-- Posts data
INSERT INTO "Posts" (
    "Id",
    "UserId",
    "Content",
    "Visibility",
    "Location",
    "PostType",
    "LikesCount",
    "CommentsCount",
    "SharesCount",
    "ViewsCount",
    "IsDeleted",
    "RepostCount",
    "CreatedAt",
    "UpdatedAt"
)
VALUES
-- 1. Ted's post (Visibility = 0: Public, PostType = 0: Original)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '22222222-2222-2222-2222-222222222222', 'Beautiful day today! Lets go out and enjoy the weather @cury_hao #uitvibes #sunny', 0, 'Hanoi, Vietnam', 0, 0, 0, 0, 15, false, 0, CURRENT_TIMESTAMP - INTERVAL '5 hours', CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- 2. cury_hao's post about cute cat
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '33333333-3333-3333-3333-333333333333', 'My cat is sleeping at the desk again, so cute! #uitvibes #cats', 0, 'Da Nang, Vietnam', 0, 0, 0, 0, 30, false, 0, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- 3. Muller25's post about football
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '44444444-4444-4444-4444-444444444444', 'Ready for the weekend match with FC Bayern! @admin_uit Mia San Mia #bayern #football', 0, 'Allianz Arena, Munich', 0, 0, 0, 0, 1500, false, 0, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- 4. HaiQQ's post
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '55555555-5555-5555-5555-555555555555', 'Finished a tiring work week! Have a great weekend everyone #uitvibes #weekend', 0, 'Ho Chi Minh City', 0, 0, 0, 0, 12, false, 0, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),

-- 5. Ted's repost from Muller25's post (PostType = 1: Share)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '22222222-2222-2222-2222-222222222222', 'This match is going to be exciting!', 0, NULL, 1, 0, 0, 0, 5, false, 0, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- 6. Short post by cury_hao
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', '33333333-3333-3333-3333-333333333333', 'Anyone know a quiet cafe for reading in Cam Le area? @HaiQQ #coffee', 0, NULL, 0, 0, 0, 0, 45, false, 0, CURRENT_TIMESTAMP - INTERVAL '4 hours', CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- (Optional) Update OriginalPostId for post #5 (Share post) based on post #3
UPDATE "Posts" SET "OriginalPostId" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' WHERE "Id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
-- Increase RepostCount of the original post
UPDATE "Posts" SET "RepostCount" = 1, "SharesCount" = 1 WHERE "Id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';

-- Sample data seeder for PostMedia (PostDb)

INSERT INTO "PostMedia" (
    "Id",
    "PostId",
    "Url",
    "PublicId",
    "Type",
    "DisplayOrder",
    "ThumbnailUrl",
    "Width",
    "Height",
    "CreatedAt"
)
VALUES
-- Post 1 (Owned by Ted) has 2 images
(
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779892001/uitvibes/posts/vr8wmrgczcwxqm3i62ar.jpg',
    'uitvibes/posts/vr8wmrgczcwxqm3i62ar',
    0,
    0,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP
),
(
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779892001/uitvibes/posts/pm8xurk4ul8oxdnu0xvl.jpg',
    'uitvibes/posts/pm8xurk4ul8oxdnu0xvl',
    0,
    1,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP
),

-- Post 2 (Owned by cury_hao) has 1 image
(
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779941272/images_zsn4tg.jpg',
    'images_zsn4tg',
    0,
    0,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP
),

-- Post 3 (Owned by Muller25) has 1 image
(
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779941425/495737458_672963165486722_678386295520353197_n_z54c1y.jpg',
    '495737458_672963165486722_678386295520353197_n_z54c1y',
    0,
    0,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP
),

-- Post 4 (Owned by HaiQQ) has 2 images
(
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1778851532/uitvibes/posts/n6ytsdpk88ywqcbj6ks8.jpg',
    'uitvibes/posts/n6ytsdpk88ywqcbj6ks8',
    0,
    0,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP
),
(
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779692922/uitvibes/posts/iixv4x1pwvvqtk0fjymr.jpg',
    'uitvibes/posts/iixv4x1pwvvqtk0fjymr',
    0,
    1,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP
),

-- Post 6 (Owned by cury_hao) has 1 image (Post 5 is a Share post so no original Media)
(
    gen_random_uuid(),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1778845619/uitvibes/posts/rf3kmdhjcg8imwbyjci9.jpg',
    'uitvibes/posts/rf3kmdhjcg8imwbyjci9',
    0,
    0,
    NULL, NULL, NULL,
    CURRENT_TIMESTAMP
);

-- ================================
-- Seed Comments
-- ================================
INSERT INTO "Comments" (
    "Id",
    "PostId",
    "UserId",
    "Content",
    "ParentCommentId",
    "LikesCount",
    "RepliesCount",
    "IsDeleted",
    "CreatedAt",
    "UpdatedAt"
)
VALUES
-- Post 1
(
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '33333333-3333-3333-3333-333333333333',
    'Beautiful photos!',
    NULL,
    2,
    1,
    false,
    CURRENT_TIMESTAMP - INTERVAL '4 hours',
    CURRENT_TIMESTAMP - INTERVAL '4 hours'
),
(
    'cccccccc-cccc-cccc-cccc-ccccccccccc2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '44444444-4444-4444-4444-444444444444',
    'Amazing!',
    NULL,
    1,
    0,
    false,
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
),
-- Reply (ParentCommentId always points to root)
(
    'cccccccc-cccc-cccc-cccc-ccccccccccc3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '22222222-2222-2222-2222-222222222222',
    'Thanks!',
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    1,
    0,
    false,
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),

-- Post 2
(
    'cccccccc-cccc-cccc-cccc-ccccccccccc4',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '55555555-5555-5555-5555-555555555555',
    'So cute!',
    NULL,
    0,
    0,
    false,
    CURRENT_TIMESTAMP - INTERVAL '22 hours',
    CURRENT_TIMESTAMP - INTERVAL '22 hours'
),

-- Post 3
(
    'cccccccc-cccc-cccc-cccc-ccccccccccc5',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '22222222-2222-2222-2222-222222222222',
    'Mia San Mia',
    NULL,
    2,
    0,
    false,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),

-- Post 4
(
    'cccccccc-cccc-cccc-cccc-ccccccccccc6',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '11111111-1111-1111-1111-111111111111',
    'Have a chill weekend!',
    NULL,
    0,
    0,
    false,
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- ================================
-- Seed Likes (Post Likes)
-- ================================
INSERT INTO "Likes" (
    "Id",
    "PostId",
    "UserId",
    "CreatedAt"
)
VALUES
-- Post 1
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', CURRENT_TIMESTAMP - INTERVAL '3 hours'),

-- Post 2
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '20 hours'),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '20 hours'),

-- Post 3
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111', CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- Post 4
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '3 days'),

-- Post 5 (share)
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '20 hours'),

-- Post 6
(gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '2 hours');

-- ================================
-- Seed CommentLikes
-- ================================
INSERT INTO "CommentLikes" (
    "Id",
    "CommentId",
    "UserId",
    "CreatedAt"
)
VALUES
-- Likes for Comment 1
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-ccccccccccc1', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-ccccccccccc1', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '3 hours'),

-- Likes for Comment 2
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-ccccccccccc2', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '3 hours'),

-- Likes for Comment 3
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-ccccccccccc3', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '2 hours'),

-- Likes for Comment 5
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-ccccccccccc5', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-ccccccccccc5', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- ================================
-- Update Counts (Posts + Comments)
-- ================================
UPDATE "Posts"
SET "CommentsCount" = 3
WHERE "Id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

UPDATE "Posts"
SET "CommentsCount" = 1
WHERE "Id" IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'
);

UPDATE "Posts"
SET "LikesCount" = 4
WHERE "Id" IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3');

UPDATE "Posts"
SET "LikesCount" = 2
WHERE "Id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';

UPDATE "Posts"
SET "LikesCount" = 1
WHERE "Id" IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6'
);

UPDATE "Comments"
SET "RepliesCount" = 1
WHERE "Id" = 'cccccccc-cccc-cccc-cccc-ccccccccccc1';

UPDATE "Comments"
SET "LikesCount" = 2
WHERE "Id" = 'cccccccc-cccc-cccc-cccc-ccccccccccc1';

UPDATE "Comments"
SET "LikesCount" = 1
WHERE "Id" IN (
    'cccccccc-cccc-cccc-cccc-ccccccccccc2',
    'cccccccc-cccc-cccc-cccc-ccccccccccc3'
);

UPDATE "Comments"
SET "LikesCount" = 2
WHERE "Id" = 'cccccccc-cccc-cccc-cccc-ccccccccccc5';

-- ================================
-- Seed Hashtags
-- ================================
INSERT INTO "Hashtags" (
    "Id",
    "Name",
    "NormalizedName",
    "UsageCount",
    "CreatedAt",
    "LastUsedAt"
)
VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'uitvibes', 'uitvibes', 3, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'sunny', 'sunny', 1, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'cats', 'cats', 1, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'bayern', 'bayern', 1, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', 'football', 'football', 1, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6', 'weekend', 'weekend', 1, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7', 'coffee', 'coffee', 1, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP)
ON CONFLICT ("Id") DO NOTHING;

-- ================================
-- Seed PostHashtags
-- ================================
INSERT INTO "PostHashtags" (
    "PostId",
    "HashtagId",
    "CreatedAt"
)
VALUES
-- Post 1
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- Post 2
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- Post 3
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- Post 4
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6', CURRENT_TIMESTAMP - INTERVAL '3 days'),

-- Post 6
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7', CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT ("PostId", "HashtagId") DO NOTHING;

-- ================================
-- Seed PostMentions
-- ================================
INSERT INTO "PostMentions" (
    "Id",
    "PostId",
    "MentionedUserId",
    "StartPosition",
    "Length",
    "CreatedAt"
)
VALUES
-- Post 1 (Ted mentions cury_hao)
('dddddddd-dddd-dddd-dddd-dddddddddd01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '33333333-3333-3333-3333-333333333333', 0, 8, CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- Post 3 (Muller25 mentions admin_uit)
('dddddddd-dddd-dddd-dddd-dddddddddd02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111', 0, 9, CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- Post 6 (cury_hao mentions HaiQQ)
('dddddddd-dddd-dddd-dddd-dddddddddd03', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', '55555555-5555-5555-5555-555555555555', 0, 5, CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT ("Id") DO NOTHING;

-- ================================
-- Seed Reels (3 items)
-- ================================
INSERT INTO "Reels" (
    "Id",
    "UserId",
    "VideoUrl",
    "VideoPublicId",
    "ThumbnailUrl",
    "ThumbnailPublicId",
    "Caption",
    "Duration",
    "ViewCount",
    "CreatedAt",
    "UpdatedAt"
)
VALUES
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    '22222222-2222-2222-2222-222222222222', -- Ted
    'https://res.cloudinary.com/dexpreywg/video/upload/v1779700169/reels/rzcewekhw8tek3htqjie.mp4',
    'reels/rzcewekhw8tek3htqjie',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779000001/uitvibes/reels/ted_day.jpg',
    'uitvibes/reels/ted_day',
    'A beautiful day in Hanoi',
    18,
    120,
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    NULL
),
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    '33333333-3333-3333-3333-333333333333', -- cury_hao
    'https://res.cloudinary.com/dexpreywg/video/upload/v1779697762/reels/fsiv9ak2fdiq7vf39smw.mov',
    'reels/rzcewekhw8tek3htqjie',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779000002/uitvibes/reels/cat_sleep.jpg',
    'uitvibes/reels/cat_sleep',
    'Cat sleeping again',
    12,
    340,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    NULL
),
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3',
    '44444444-4444-4444-4444-444444444444', -- Muller25
    'https://res.cloudinary.com/dexpreywg/video/upload/v1779456581/reels/zshv75zjjauksnqkxxwm.mp4',
    'reels/zshv75zjjauksnqkxxwm',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779000003/uitvibes/reels/bayern.jpg',
    'uitvibes/reels/bayern',
    'Mia San Mia',
    20,
    980,
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    NULL
);

-- ================================
-- Seed ReelComments
-- ================================
INSERT INTO "ReelComments" (
    "Id",
    "ReelId",
    "UserId",
    "Content",
    "LikeCount",
    "ReplyCount",
    "ParentCommentId",
    "CreatedAt",
    "UpdatedAt"
)
VALUES
-- Reel 1 (Ted)
(
    'f1111111-1111-1111-1111-111111111111',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    '33333333-3333-3333-3333-333333333333',
    'Beautiful scenery!',
    0,
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '20 hours',
    NULL
),
(
    'f1111111-1111-1111-1111-111111111112',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    '55555555-5555-5555-5555-555555555555',
    'This reel is so chill',
    0,
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '18 hours',
    NULL
),

-- Reel 2 (cury_hao)
(
    'f2222222-2222-2222-2222-222222222221',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    '22222222-2222-2222-2222-222222222222',
    'So cute!',
    0,
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    NULL
),

-- Reel 3 (Muller25)
(
    'f3333333-3333-3333-3333-333333333331',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3',
    '11111111-1111-1111-1111-111111111111',
    'Bayern forever!',
    0,
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    NULL
);

-- ================================
-- Seed ReelLikes
-- ================================
INSERT INTO "ReelLikes" (
    "Id",
    "ReelId",
    "UserId",
    "CreatedAt"
)
VALUES
-- Reel 1
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '22 hours'),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '21 hours'),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '20 hours'),

-- Reel 2
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- Reel 3
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', '11111111-1111-1111-1111-111111111111', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- ================================
-- Seed ReelShares
-- ================================
INSERT INTO "ReelShares" (
    "Id",
    "ReelId",
    "UserId",
    "CreatedAt"
)
VALUES
-- Reel 1
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '19 hours'),

-- Reel 2
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- Reel 3
(gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '3 days');


-- ================================
-- Seed StoryGroups + StoryItems + HighlightGroups + HighlightItems
-- ================================
INSERT INTO "StoryGroups" (
    "Id",
    "UserId",
    "OwnerDisplayName",
    "OwnerAvatarUrl",
    "ExpiresAt",
    "TotalViews",
    "CreatedAt"
)
VALUES
(
    '99999999-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222', -- Ted
    'Ted',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1778842884/uitvibes/avatars/d6gnotvwteqq3in5nblp.jpg',
    CURRENT_TIMESTAMP + INTERVAL '12 hours',
    0,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    '99999999-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444', -- Muller25
    'Muller25',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779938081/muller_vagidy.jpg',
    CURRENT_TIMESTAMP + INTERVAL '12 hours',
    0,
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
);

INSERT INTO "StoryItems" (
    "Id",
    "StoryGroupId",
    "Type",
    "Url",
    "PublicId",
    "ThumbnailUrl",
    "DisplayOrder",
    "Duration",
    "CreatedAt"
)
VALUES
(
    '88888888-1111-1111-1111-111111111111',
    '99999999-1111-1111-1111-111111111111',
    0,
    'https://res.cloudinary.com/dexpreywg/image/upload/v1777187586/uitvibes/stories/jxxa2yem9xmzuyr1wddg.jpg',
    'uitvibes/stories/jxxa2yem9xmzuyr1wddg',
    NULL,
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    '88888888-2222-2222-2222-222222222222',
    '99999999-2222-2222-2222-222222222222',
    0,
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779896256/uitvibes/stories/d6jmncvmr1pcozjxml9u.jpg',
    'uitvibes/stories/d6jmncvmr1pcozjxml9u',
    NULL,
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
);

INSERT INTO "HighlightGroups" (
    "Id",
    "UserId",
    "Title",
    "CoverImage",
    "CreatedAt"
)
VALUES
(
    '77777777-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'Daily',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1777187586/uitvibes/stories/jxxa2yem9xmzuyr1wddg.jpg',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    '77777777-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'Bayern',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779896256/uitvibes/stories/d6jmncvmr1pcozjxml9u.jpg',
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
);

INSERT INTO "HighlightItems" (
    "Id",
    "HighlightGroupId",
    "StoryItemId",
    "CreatedAt"
)
VALUES
(
    '66666666-1111-1111-1111-111111111111',
    '77777777-1111-1111-1111-111111111111',
    '88888888-1111-1111-1111-111111111111',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    '66666666-2222-2222-2222-222222222222',
    '77777777-2222-2222-2222-222222222222',
    '88888888-2222-2222-2222-222222222222',
    CURRENT_TIMESTAMP - INTERVAL '3 hours'
);

-- ================================
-- Seed PostReports
-- Status: 0 = Pending, 1 = Resolved, 2 = Dismissed
-- ================================
INSERT INTO "PostReports" (
    "Id",
    "PostId",
    "ReporterId",
    "Reason",
    "AdditionalDetails",
    "Status",
    "AdminNote",
    "CreatedAt",
    "ResolvedAt"
)
VALUES
(
    'eeeeeeee-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '22222222-2222-2222-2222-222222222222',
    'Inappropriate content',
    'Caption may be misleading.',
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    NULL
),
(
    'eeeeeeee-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '33333333-3333-3333-3333-333333333333',
    'Spam or fraud',
    'Repeated posting.',
    1,
    'User has been notified.',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
),
(
    'eeeeeeee-3333-3333-3333-333333333333',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '55555555-5555-5555-5555-555555555555',
    'Hateful or harassing language',
    'Language in the post is offensive.',
    2,
    'Insufficient evidence of violation.',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
);
