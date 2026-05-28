-- Script thêm dữ liệu mẫu cho UserDb (PostgreSQL) - Bảng UserProfiles
-- Các UserId này phải khớp y hệt với cột "Id" trong bảng "Users" của AuthDb

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
    'Quản trị viên', 
    'Chào mừng đến với hệ thống UITVibes. Tôi là Admin.', 
    'Other',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1768667412/avatars/aizkxaeqdqmhfnhoup6s.png',
    '2000-01-01 00:00:00', 
    'Hồ Chí Minh, Việt Nam', 
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
    'Hoàng Văn Tài', 
    'Sinh viên CNTT đam mê coding.', 
    'Male',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1778842884/uitvibes/avatars/d6gnotvwteqq3in5nblp.jpg',
    '2002-05-15 00:00:00', 
    'Hà Nội, Việt Nam', 
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
    'Trần Anh Hào', 
    'Yêu mèo, thích đọc sách.', 
    'Male',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1777887992/uitvibes/avatars/nwbmbviwwdxelfj8zkbd.jpg',
    '2003-08-20 00:00:00', 
    'Đà Nẵng, Việt Nam', 
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
    'Huyền thoại Bayern Munich', 
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
    'Nguyễn Quốc Hải', 
    'Chưa có tiểu sử.', 
    'Male',
    'https://res.cloudinary.com/dexpreywg/image/upload/v1778851092/uitvibes/avatars/q0g57j4vy3d8dhrkizji.jpg',
    '2004-03-25 00:00:00', 
    'Hồ Chí Minh, Việt Nam', 
    0, 
    0, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP, 
    false
);


-- Script thêm dữ liệu mẫu Follows (UserDb)
-- Đã cập nhật gen_random_uuid() cho cột Id bị thiếu

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


-- Cập nhật bộ đếm cho 4 User: (Có 4 người Follow gồm Admin và 3 User kia, đang Follow 3 User kia)
UPDATE "UserProfiles" 
SET "FollowersCount" = 4, "FollowingCount" = 3
WHERE "UserId" IN (
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
);

-- Cập nhật bộ đếm cho Admin (Không ai Follow, đi Follow 4 người)
UPDATE "UserProfiles" 
SET "FollowersCount" = 0, "FollowingCount" = 4
WHERE "UserId" = '11111111-1111-1111-1111-111111111111';

-- Script thêm dữ liệu mẫu UserReports (UserDb)
-- Status: 0 = Pending (Chờ xử lý), 1 = Resolved (Đã ghi nhận), 2 = Dismissed (Bỏ qua)

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
-- Trường hợp 1: Ted (User1) report HaiQQ (User4) vì dùng từ ngữ không phù hợp - Đang chờ xử lý (Pending = 0)
(
    gen_random_uuid(), 
    '55555555-5555-5555-5555-555555555555', -- Target: HaiQQ
    '22222222-2222-2222-2222-222222222222', -- Reporter: Ted
    'Ngôn từ gây hấn hoặc thù ghét', 
    'Người này thường xuyên dùng từ ngữ không hay ho trong phần bình luận của tôi.', 
    0, 
    NULL, 
    CURRENT_TIMESTAMP - INTERVAL '2 days', 
    NULL
),

-- Trường hợp 2: cury_hao (User2) report Muller25 (User3) vì nghi ngờ tài khoản giả mạo - Đã xử lý / Bỏ qua (Dismissed = 2)
(
    gen_random_uuid(), 
    '44444444-4444-4444-4444-444444444444', -- Target: Muller25
    '33333333-3333-3333-3333-333333333333', -- Reporter: cury_hao
    'Tài khoản giả mạo', 
    'Tôi nghĩ đây không phải là Thomas Muller thật, chỉ là fan lập clone.', 
    2, 
    'Đã kiểm tra, không vi phạm quy định mạo danh của platform.', 
    CURRENT_TIMESTAMP - INTERVAL '5 days', 
    CURRENT_TIMESTAMP - INTERVAL '4 days'
),

-- Trường hợp 3: HaiQQ (User4) report Ted (User1) vì spam - Đã ghi nhận (Resolved = 1)
(
    gen_random_uuid(), 
    '22222222-2222-2222-2222-222222222222', -- Target: Ted
    '55555555-5555-5555-5555-555555555555', -- Reporter: HaiQQ
    'Spam hoặc lừa đảo', 
    'Nhắn tin gửi link quảng cáo liên tục.', 
    1, 
    'Đã cảnh cáo tài khoản này vì hành vi spam tin nhắn.', 
    CURRENT_TIMESTAMP - INTERVAL '10 days', 
    CURRENT_TIMESTAMP - INTERVAL '8 days'
);