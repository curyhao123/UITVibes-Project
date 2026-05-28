-- Sample data seeder for MessageDb (PostgreSQL)
-- UserIds reference from AuthDb/UserDb:
-- Admin: 11111111-1111-1111-1111-111111111111
-- Ted: 22222222-2222-2222-2222-222222222222
-- cury_hao: 33333333-3333-3333-3333-333333333333
-- Muller25: 44444444-4444-4444-4444-444444444444
-- HaiQQ: 55555555-5555-5555-5555-555555555555

-- ================================
-- Seed Conversations
-- ================================
INSERT INTO "Conversations" (
    "Id",
    "Name",
    "Type",
    "AvatarUrl",
    "CreatedByUserId",
    "CreatedAt",
    "LastUpdatedAt",
    "LastMessageContent",
    "LastMessageAt",
    "LastMessageSenderId",
    "IsDeleted"
)
VALUES
-- Private conversations (Type = 0)
-- 1. Ted and cury_hao private chat
(
    'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    0,
    NULL,
    '22222222-2222-2222-2222-222222222222',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    'See you tomorrow!',
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    '33333333-3333-3333-3333-333333333333',
    false
),

-- 2. Ted and HaiQQ private chat
(
    'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    0,
    NULL,
    '22222222-2222-2222-2222-222222222222',
    CURRENT_TIMESTAMP - INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    'Thanks for the info!',
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    '55555555-5555-5555-5555-555555555555',
    false
),

-- 3. cury_hao and Muller25 private chat
(
    'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    0,
    NULL,
    '33333333-3333-3333-3333-333333333333',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'Bayern won the match!',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    '44444444-4444-4444-4444-444444444444',
    false
),

-- 4. HaiQQ and cury_hao private chat
(
    'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    0,
    NULL,
    '55555555-5555-5555-5555-555555555555',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    'That sounds great!',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    '33333333-3333-3333-3333-333333333333',
    false
),

-- 5. Admin and Ted private chat
(
    'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    0,
    NULL,
    '11111111-1111-1111-1111-111111111111',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '5 hours',
    'Welcome to UITVibes!',
    CURRENT_TIMESTAMP - INTERVAL '5 hours',
    '11111111-1111-1111-1111-111111111111',
    false
),

-- Group conversations (Type = 1)
-- 6. Bayern Fans group
(
    'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Bayern Fans',
    1,
    'https://res.cloudinary.com/dexpreywg/image/upload/v1779000001/uitvibes/groups/bayern_fans.jpg',
    '44444444-4444-4444-4444-444444444444',
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'Mia San Mia!',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    '44444444-4444-4444-4444-444444444444',
    false
),

-- 7. UITVibes Dev Team group
(
    'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'UITVibes Team',
    1,
    'https://res.cloudinary.com/dexpreywg/image/upload/v1768667412/avatars/aizkxaeqdqmhfnhoup6s.png',
    '11111111-1111-1111-1111-111111111111',
    CURRENT_TIMESTAMP - INTERVAL '60 days',
    CURRENT_TIMESTAMP - INTERVAL '4 hours',
    'New features coming soon!',
    CURRENT_TIMESTAMP - INTERVAL '4 hours',
    '22222222-2222-2222-2222-222222222222',
    false
);

-- ================================
-- Seed ConversationMembers
-- ================================
INSERT INTO "ConversationMembers" (
    "Id",
    "ConversationId",
    "UserId",
    "Role",
    "Nickname",
    "LastReadMessageId",
    "LastReadAt",
    "JoinedAt",
    "LeftAt"
)
VALUES
-- Private: Ted & cury_hao
(gen_random_uuid(), 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '10 days', NULL),
(gen_random_uuid(), 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '10 days', NULL),

-- Private: Ted & HaiQQ
(gen_random_uuid(), 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '7 days', NULL),
(gen_random_uuid(), 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '7 days', NULL),

-- Private: cury_hao & Muller25
(gen_random_uuid(), 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', NULL),
(gen_random_uuid(), 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', NULL),

-- Private: HaiQQ & cury_hao
(gen_random_uuid(), 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
(gen_random_uuid(), 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),

-- Private: Admin & Ted
(gen_random_uuid(), 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
(gen_random_uuid(), 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),

-- Group: Bayern Fans (Ted, cury_hao, Muller25, HaiQQ)
(gen_random_uuid(), 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '30 days', NULL),
(gen_random_uuid(), 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '30 days', NULL),
(gen_random_uuid(), 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 1, 'Group Admin', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '30 days', NULL),
(gen_random_uuid(), 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '20 days', NULL),

-- Group: UITVibes Team (all users)
(gen_random_uuid(), 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1, 'Admin', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL),
(gen_random_uuid(), 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 0, 'Ted', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL),
(gen_random_uuid(), 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL),
(gen_random_uuid(), 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL),
(gen_random_uuid(), 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 0, NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL);

-- ================================
-- Seed Messages
-- ================================
INSERT INTO "Messages" (
    "Id",
    "ConversationId",
    "SenderId",
    "Content",
    "Type",
    "MediaUrl",
    "MediaPublicId",
    "FileName",
    "FileSize",
    "ReplyToMessageId",
    "IsEdited",
    "IsDeleted",
    "CreatedAt",
    "EditedAt"
)
VALUES
-- Conversation 1: Ted & cury_hao
('b1111111-1111-1111-1111-111111110001', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Hey! How are you doing?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
('b1111111-1111-1111-1111-111111110002', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Hi Ted! Im doing great, thanks!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
('b1111111-1111-1111-1111-111111110003', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Are you coming to the football match this weekend?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b1111111-1111-1111-1111-111111110004', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Yes! I already bought the tickets. Bayern is playing!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b1111111-1111-1111-1111-111111110005', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Awesome! See you there!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b1111111-1111-1111-1111-111111110006', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'By the way, can you send me the match highlights later?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '20 hours', NULL),
('b1111111-1111-1111-1111-111111110007', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Sure thing!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL),
('b1111111-1111-1111-1111-111111110008', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Here is the photo from the stadium', 1, 'https://res.cloudinary.com/dexpreywg/image/upload/v1779892001/uitvibes/posts/vr8wmrgczcwxqm3i62ar.jpg', 'uitvibes/posts/vr8wmrgczcwxqm3i62ar', NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '4 hours', NULL),
('b1111111-1111-1111-1111-111111110009', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Wow amazing photo!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL),
('b1111111-1111-1111-1111-111111110010', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'See you tomorrow!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 hour', NULL),

-- Conversation 2: Ted & HaiQQ
('b2222222-2222-2222-2222-222222220001', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Hi Hai, do you have the project documentation?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
('b2222222-2222-2222-2222-222222220002', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Yes, I sent it to your email yesterday!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
('b2222222-2222-2222-2222-222222220003', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Got it, thanks!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
('b2222222-2222-2222-2222-222222220004', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'No problem! Let me know if you need anything else.', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b2222222-2222-2222-2222-222222220005', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Will do!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL),
('b2222222-2222-2222-2222-222222220006', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Thanks for the info!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL),

-- Conversation 3: cury_hao & Muller25
('b3333333-3333-3333-3333-333333330001', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Hey Muller! Did you watch the Bayern match yesterday?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
('b3333333-3333-3333-3333-333333330002', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Of course! What a match that was!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
('b3333333-3333-3333-3333-333333330003', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'The goal in the 90th minute was incredible!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b3333333-3333-3333-3333-333333330004', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Yes! Mia San Mia! We are champions!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b3333333-3333-3333-3333-333333330005', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Bayern won the match!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),

-- Conversation 4: HaiQQ & cury_hao
('b4444444-4444-4444-4444-444444440001', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Hi! Are you free this weekend?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b4444444-4444-4444-4444-444444440002', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Hey! Yes I think so, why?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b4444444-4444-4444-4444-444444440003', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Want to grab some coffee and study together?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '12 hours', NULL),
('b4444444-4444-4444-4444-444444440004', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Sure! That sounds great!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL),

-- Conversation 5: Admin & Ted
('b5555555-5555-5555-5555-555555550001', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Welcome to UITVibes!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
('b5555555-5555-5555-5555-555555550002', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Thank you! Nice to be here!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '2 days', NULL),
('b5555555-5555-5555-5555-555555550003', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'If you have any questions, feel free to ask!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('b5555555-5555-5555-5555-555555550004', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Will do, thanks!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '5 hours', NULL),

-- Conversation 6: Bayern Fans Group
('b6666666-6666-6666-6666-666666660001', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Welcome everyone to Bayern Fans group!', 4, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '30 days', NULL),
('b6666666-6666-6666-6666-666666660002', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Thanks for creating this group!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '30 days', NULL),
('b6666666-6666-6666-6666-666666660003', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Great to be here! FCB forever!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '30 days', NULL),
('b6666666-6666-6666-6666-666666660004', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Who is watching the match this weekend?', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
('b6666666-6666-6666-6666-666666660005', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Count me in!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
('b6666666-6666-6666-6666-666666660006', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Me too!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '3 days', NULL),
('b6666666-6666-6666-6666-666666660007', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Mia San Mia!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),

-- Conversation 7: UITVibes Team Group
('b7777777-7777-7777-7777-777777770001', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Welcome to UITVibes Team!', 4, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL),
('b7777777-7777-7777-7777-777777770002', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Thanks! Excited to be part of the team!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL),
('b7777777-7777-7777-7777-777777770003', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Looking forward to working with everyone!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '60 days', NULL),
('b7777777-7777-7777-7777-777777770004', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Team, we have a sprint planning meeting tomorrow at 10 AM.', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 week', NULL),
('b7777777-7777-7777-7777-777777770005', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Got it, will be there!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 week', NULL),
('b7777777-7777-7777-7777-777777770006', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'See you all tomorrow!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '1 week', NULL),
('b7777777-7777-7777-7777-777777770007', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'New features coming soon!', 0, NULL, NULL, NULL, NULL, NULL, false, false, CURRENT_TIMESTAMP - INTERVAL '4 hours', NULL);

-- ================================
-- Seed MessageReadReceipts
-- ================================
INSERT INTO "MessageReadReceipts" (
    "Id",
    "MessageId",
    "UserId",
    "ReadAt"
)
VALUES
-- Ted read messages from cury_hao
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110002', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110004', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110006', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '20 hours'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110009', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110010', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '1 hour'),

-- cury_hao read messages from Ted
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110003', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110005', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110007', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110008', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111110010', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '1 hour'),

-- HaiQQ read messages from Ted
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222220001', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222220003', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222220004', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222220005', '55555555-5555-5555-5555-555555555555', CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- Ted read messages from HaiQQ
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222220002', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '3 days'),
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222220004', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222220006', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '3 hours'),

-- Muller25 read messages from cury_hao
(gen_random_uuid(), 'b3333333-3333-3333-3333-333333330001', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'b3333333-3333-3333-3333-333333330003', '44444444-4444-4444-4444-444444444444', CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- cury_hao read messages from Muller25
(gen_random_uuid(), 'b3333333-3333-3333-3333-333333330002', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'b3333333-3333-3333-3333-333333330004', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(gen_random_uuid(), 'b3333333-3333-3333-3333-333333330005', '33333333-3333-3333-3333-333333333333', CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- Admin read messages from Ted
(gen_random_uuid(), 'b5555555-5555-5555-5555-555555550002', '11111111-1111-1111-1111-111111111111', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'b5555555-5555-5555-5555-555555550004', '11111111-1111-1111-1111-111111111111', CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- Ted read messages from Admin
(gen_random_uuid(), 'b5555555-5555-5555-5555-555555550001', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(gen_random_uuid(), 'b5555555-5555-5555-5555-555555550003', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP - INTERVAL '1 day');
