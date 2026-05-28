-- Sample data seeder for UserDb (PostgreSQL) - UserProfiles table
-- These UserIds must match exactly with the "Id" column in the "Users" table of AuthDb

INSERT INTO "UserProfiles" (
    "Id",
    "UserId",
    "DisplayName",
    "FullName",
    "Bio",
    "Gender",
    "AvatarUrl",
    "DateOfBirth",
    "Location",
    "FollowersCount",
    "FollowingCount",
    "CreatedAt",
    "UpdatedAt",
    "IsBanned"
)
VALUES
(
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    'admin_uit',
    'Administrator',
    'Welcome to UITVibes system. I am the Admin.',
    'Other',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1768667412/avatars/aizkxaeqdqmhfnhoup6s.png',
    '2000-01-01 00:00:00',
    'Ho Chi Minh City, Vietnam',
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    false
),
(
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    'Ted',
    'Hoang Van Tai',
    'IT student passionate about coding.',
    'Male',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1778842884/uitvibes/avatars/d6gnotvwteqq3in5nblp.jpg',
    '2002-05-15 00:00:00',
    'Hanoi, Vietnam',
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    false
),
(
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    'cury_hao',
    'Tran Anh Hao',
    'Loves cats, enjoys reading books.',
    'Male',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1777887992/uitvibes/avatars/nwbmbviwwdxelfj8zkbd.jpg',
    '2003-08-20 00:00:00',
    'Da Nang, Vietnam',
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    false
),
(
    gen_random_uuid(),
    '44444444-4444-4444-4444-444444444444',
    'Muller25',
    'Thomas Muller',
    'Bayern Munich Legend',
    'Male',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779938081/muller_vagidy.jpg',
    '1989-09-13 00:00:00',
    'Munich, Germany',
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    false
),
(
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555555',
    'HaiQQ',
    'Nguyen Quoc Hai',
    'No bio yet.',
    'Male',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1778851092/uitvibes/avatars/q0g57j4vy3d8dhrkizji.jpg',
    '2004-03-25 00:00:00',
    'Ho Chi Minh City, Vietnam',
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    false
);


-- Sample data seeder for Follows (UserDb)

INSERT INTO "Follows" ("Id", "FollowerId", "FollowingId", "CreatedAt")
VALUES
-- Admin follows User1, User2, User3, User4
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP),

-- User1 (Ted) follows User2, User3, User4
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP),

-- User2 (cury_hao) follows User1, User3, User4
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP),

-- User3 (Muller25) follows User1, User2, User4
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP),

-- User4 (HaiQQ) follows User1, User2, User3
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP),
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP),
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP);


-- Update counters for 4 Users: (4 people are following, including Admin and 3 other Users, following 3 other Users)
UPDATE "UserProfiles"
SET "FollowersCount" = 4, "FollowingCount" = 3
WHERE "UserId" IN (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

-- Update counters for Admin: (No followers, following 4 people)
UPDATE "UserProfiles"
SET "FollowersCount" = 0, "FollowingCount" = 4
WHERE "UserId" = '11111111-1111-1111-1111-111111111111';

-- Sample data seeder for UserReports (UserDb)
-- Status: 0 = Pending, 1 = Resolved, 2 = Dismissed

INSERT INTO "UserReports" (
    "Id",
    "TargetUserId",
    "ReporterId",
    "Reason",
    "AdditionalDetails",
    "Status",
    "AdminNote",
    "CreatedAt",
    "ResolvedAt"
)
VALUES
-- Case 1: Ted (User1) reports HaiQQ (User4) for inappropriate language - Pending (Pending = 0)
(
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555555', -- Target: HaiQQ
    '22222222-2222-2222-2222-222222222222', -- Reporter: Ted
    'Hateful or harassing language',
    'This person frequently uses inappropriate language in my comments.',
    0,
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    NULL
),

-- Case 2: cury_hao (User2) reports Muller25 (User3) for suspected fake account - Dismissed (Dismissed = 2)
(
    gen_random_uuid(),
    '44444444-4444-4444-4444-444444444444', -- Target: Muller25
    '33333333-3333-3333-3333-333333333333', -- Reporter: cury_hao
    'Impersonation or fake account',
    'I believe this is not the real Thomas Muller, just a fan creating a clone account.',
    2,
    'Verified, no platform impersonation violation found.',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
),

-- Case 3: HaiQQ (User4) reports Ted (User1) for spam - Resolved (Resolved = 1)
(
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222', -- Target: Ted
    '55555555-5555-5555-5555-555555555555', -- Reporter: HaiQQ
    'Spam or fraud',
    'Continuously sending advertising links via messages.',
    1,
    'This account has been warned for message spamming behavior.',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days'
);
