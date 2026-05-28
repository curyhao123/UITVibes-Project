-- Script thêm dữ liệu mẫu cho AuthDb (PostgreSQL)
-- Mật khẩu cho tất cả account bên dưới đều là: 123456

INSERT INTO "Users" (
    "Id", 
    "Email", 
    "Username", 
    "PasswordHash", 
    "CreatedAt", 
    "IsActive", 
    "IsBanned", 
    "IsVerified", 
    "Role", 
    "OtpResendCount"
) 
VALUES 
(
    '11111111-1111-1111-1111-111111111111', 
    'admin@uitvibes.com', 
    'admin_uit', 
    '$2a$11$uwzYPjXFIh4sAzh.O02MLuwccUgxgbJXvpxe/35IxlrimpZdl5hyC', 
    CURRENT_TIMESTAMP, 
    true, 
    false, 
    true, 
    1, -- Role 1 = Admin
    0
),
(
    '22222222-2222-2222-2222-222222222222', 
    'user1@uitvibes.com', 
    'user_one', 
    '$2a$11$uwzYPjXFIh4sAzh.O02MLuwccUgxgbJXvpxe/35IxlrimpZdl5hyC', 
    CURRENT_TIMESTAMP, 
    true, 
    false, 
    true, 
    0, -- Role 0 = User
    0
),
(
    '33333333-3333-3333-3333-333333333333', 
    'user2@uitvibes.com', 
    'user_two', 
    '$2a$11$uwzYPjXFIh4sAzh.O02MLuwccUgxgbJXvpxe/35IxlrimpZdl5hyC', 
    CURRENT_TIMESTAMP, 
    true, 
    false, 
    true, 
    0, 
    0
),
(
    '44444444-4444-4444-4444-444444444444', 
    'user3@uitvibes.com', 
    'user_three', 
    '$2a$11$uwzYPjXFIh4sAzh.O02MLuwccUgxgbJXvpxe/35IxlrimpZdl5hyC', 
    CURRENT_TIMESTAMP, 
    true, 
    false, 
    true, 
    0, 
    0
),
(
    '55555555-5555-5555-5555-555555555555', 
    'user4@uitvibes.com', 
    'user_four', 
    '$2a$11$uwzYPjXFIh4sAzh.O02MLuwccUgxgbJXvpxe/35IxlrimpZdl5hyC', 
    CURRENT_TIMESTAMP, 
    true, 
    false, 
    true, 
    0, 
    0
)
ON CONFLICT ("Id") DO NOTHING;