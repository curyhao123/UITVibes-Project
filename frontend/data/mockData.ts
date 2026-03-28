// ============================================================
// CORE INTERFACES
// ============================================================

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  website?: string;
  followers: number;
  following: number;
  posts: number;
  isVerified: boolean;
  isFollowing?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  text: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
  replies?: Comment[];
  parentId?: string;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  image: string;
  caption: string;
  likes: number;
  comments: Comment[];
  createdAt: string;
  isLiked: boolean;
  isBookmarked?: boolean;
  shareCount?: number;
  views?: number;
  location?: string;
  tags?: string[];
}

export interface Story {
  id: string;
  user: User;
  isViewed: boolean;
  images: string[];
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name?: string;
  avatar?: string;
  members: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isGroup?: boolean;
  adminIds?: string[];
  isMuted?: boolean;
  isPinned?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  text: string;
  image?: string;
  createdAt: string;
  isRead: boolean;
  isLiked?: boolean;
  editedAt?: string;
  deletedAt?: string;
}

export interface Reel {
  id: string;
  user: User;
  video: string;
  thumbnail?: string;
  caption: string;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  music?: string;
  musicArtist?: string;
  createdAt: string;
}

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'mention'
  | 'share'
  | 'follow_request'
  | 'live_started';

export interface Notification {
  id: string;
  type: NotificationType;
  user: User;
  post?: Post;
  comment?: Comment;
  message?: string;
  createdAt: string;
  isRead: boolean;
}

export interface FollowRelation {
  followerId: string;
  followingId: string;
  createdAt: string;
}

// ============================================================
// TRACK / ARTIST interfaces (Music tab)
// ============================================================

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  likes: number;
  plays: number;
  isLiked: boolean;
}

export interface MusicArtist {
  id: string;
  name: string;
  avatar: string;
  followers: string;
  isFollowing: boolean;
}

// ============================================================
// MOCK DATA — TWO ACCOUNTS
// ============================================================
//
//  ACC-1: new_user@uitvibes.com
//    Brand new account — zero followers, following, posts, stories, chats.
//    Email to log in: new@uitvibes.com
//
//  ACC-2: active@uitvibes.com
//    Full account — posts, stories, friends, conversations, notifications.
//    Email to log in: active@uitvibes.com
//
//  Internal userId for both: 'current'  (matches profile filter + context)
// ============================================================

export const mockNewUser: User = {
  id: 'current',
  username: 'newbie',
  displayName: 'New User',
  avatar: 'https://i.pravatar.cc/150?img=47',
  bio: '',
  followers: 0,
  following: 0,
  posts: 0,
  isVerified: false,
  createdAt: new Date().toISOString(),
};

// ─── Other people in the app (not the logged-in user) ────────

export const mockUsers: User[] = [
  {
    id: 'u1',
    username: 'linhphan',
    displayName: 'Linh Phan',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: 'Travel lover ✈️ Chasing sunsets around Vietnam.',
    website: 'https://linhphan.travel',
    followers: 3400,
    following: 412,
    posts: 78,
    isVerified: true,
    isFollowing: true,
    createdAt: '2023-05-01T08:00:00Z',
  },
  {
    id: 'u2',
    username: 'minhduong',
    displayName: 'Minh Duong',
    avatar: 'https://i.pravatar.cc/150?img=3',
    bio: 'Foodie 🍕 Street food hunter in Ho Chi Minh City.',
    followers: 890,
    following: 250,
    posts: 32,
    isVerified: false,
    isFollowing: false,
    createdAt: '2023-07-15T12:00:00Z',
  },
  {
    id: 'u3',
    username: 'thanhhuyen',
    displayName: 'Thanh Huyen',
    avatar: 'https://i.pravatar.cc/150?img=9',
    bio: 'Fitness coach 💪 DM for training programs.',
    website: 'https://thanhhuyen.fit',
    followers: 5200,
    following: 180,
    posts: 156,
    isVerified: true,
    isFollowing: true,
    createdAt: '2023-04-20T06:00:00Z',
  },
  {
    id: 'u4',
    username: 'ductran',
    displayName: 'Duc Tran',
    avatar: 'https://i.pravatar.cc/150?img=11',
    bio: 'Music producer 🎵 New EP dropping soon!',
    followers: 2100,
    following: 310,
    posts: 67,
    isVerified: false,
    isFollowing: false,
    createdAt: '2023-08-01T14:00:00Z',
  },
  {
    id: 'u5',
    username: 'huongle',
    displayName: 'Huong Le',
    avatar: 'https://i.pravatar.cc/150?img=16',
    bio: 'Artist 🎨 Commission open! DM for inquiries.',
    website: 'https://huongle.art',
    followers: 7800,
    following: 450,
    posts: 234,
    isVerified: true,
    isFollowing: false,
    createdAt: '2023-03-12T09:00:00Z',
  },
  {
    id: 'u6',
    username: 'khoinguyen',
    displayName: 'Khoi Nguyen',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Tech geek 💻 Building apps one commit at a time.',
    followers: 1560,
    following: 290,
    posts: 89,
    isVerified: false,
    isFollowing: false,
    createdAt: '2023-09-05T11:00:00Z',
  },
  {
    id: 'u7',
    username: 'tranhoa',
    displayName: 'Tran Hoa',
    avatar: 'https://i.pravatar.cc/150?img=20',
    bio: 'Fashion blogger 👗 Daily outfit inspo. Collabs → DM',
    website: 'https://tranhoa.fashion',
    followers: 9800,
    following: 520,
    posts: 312,
    isVerified: true,
    isFollowing: true,
    createdAt: '2023-02-28T07:00:00Z',
  },
];

// ─── ACTIVE USER ──────────────────────────────────────────────
// Internal id: 'current'  (matches context/profile filter)
export const mockActiveUser: User = {
  id: 'current',
  username: 'anhvu',
  displayName: 'Anh Vu',
  avatar: 'https://i.pravatar.cc/150?img=33',
  bio: 'Software engineer 💻 Coffee addict ☕ Photography 📸',
  website: 'https://anhvu.dev',
  followers: 1240,
  following: 380,
  posts: 45,
  isVerified: false,
  createdAt: '2023-01-15T00:00:00Z',
};

// ─── Helpers ──────────────────────────────────────────────────

const u1 = mockUsers[0];
const u2 = mockUsers[1];
const u3 = mockUsers[2];
const u4 = mockUsers[3];
const u5 = mockUsers[4];
const u6 = mockUsers[5];
const u7 = mockUsers[6];
const me = mockActiveUser;

// ============================================================
// FOLLOW RELATIONS
// (active_user follows: linhphan, thanhhuyen, ductran, tranhoa)
// ============================================================

export const activeUserFollowingIds: Set<string> = new Set(['u1', 'u3', 'u4', 'u7']);

// ============================================================
// POSTS (by other users — NOT the logged-in user)
// ============================================================

export const mockPosts: Post[] = [
  {
    id: 'p1',
    userId: 'u1',
    user: u1,
    image: 'https://picsum.photos/seed/post1/800/800',
    caption: 'Sunset in Da Nang! 🌅 Best views in Vietnam.',
    likes: 1234,
    comments: [
      {
        id: 'c1',
        userId: 'u3',
        user: u3,
        text: 'Stunning! 😍',
        createdAt: '2024-01-15T10:30:00Z',
        likes: 45,
        isLiked: false,
      },
      {
        id: 'c2',
        userId: 'u7',
        user: u7,
        text: 'I need to visit!',
        createdAt: '2024-01-15T11:00:00Z',
        likes: 12,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-15T09:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 89,
    views: 5600,
    location: 'Da Nang, Vietnam',
    tags: ['vietnam', 'travel', 'sunset'],
  },
  {
    id: 'p2',
    userId: 'u2',
    user: u2,
    image: 'https://picsum.photos/seed/post2/800/800',
    caption: 'Banh xeo for lunch! 🍜 Worth every calorie.',
    likes: 567,
    comments: [
      {
        id: 'c3',
        userId: 'u4',
        user: u4,
        text: 'Where is this place?',
        createdAt: '2024-01-14T18:30:00Z',
        likes: 8,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-14T17:00:00Z',
    isLiked: true,
    isBookmarked: true,
    shareCount: 34,
    views: 2100,
    location: 'Ho Chi Minh City',
    tags: ['food', 'vietnam', 'banhxep'],
  },
  {
    id: 'p3',
    userId: 'u3',
    user: u3,
    image: 'https://picsum.photos/seed/post3/800/800',
    caption: 'Morning run done! 💪 5km in 25 minutes. New PR!',
    likes: 2100,
    comments: [
      {
        id: 'c4',
        userId: 'u5',
        user: u5,
        text: 'Keep it up!',
        createdAt: '2024-01-14T08:00:00Z',
        likes: 88,
        isLiked: true,
      },
      {
        id: 'c5',
        userId: 'u6',
        user: u6,
        text: 'What time do you run?',
        createdAt: '2024-01-14T09:15:00Z',
        likes: 3,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-14T07:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 56,
    views: 8900,
    tags: ['fitness', 'running', 'morning'],
  },
  {
    id: 'p4',
    userId: 'u4',
    user: u4,
    image: 'https://picsum.photos/seed/post4/800/800',
    caption: 'New track dropping this Friday! 🎵🎧 #producer #beats',
    likes: 4500,
    comments: [],
    createdAt: '2024-01-13T20:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 234,
    views: 18000,
    tags: ['music', 'producer'],
  },
  {
    id: 'p5',
    userId: 'u5',
    user: u5,
    image: 'https://picsum.photos/seed/post5/800/800',
    caption: 'New commission piece done! 🎨 Oil on canvas, 60x80cm.',
    likes: 6780,
    comments: [
      {
        id: 'c6',
        userId: 'u7',
        user: u7,
        text: 'Absolutely breathtaking!',
        createdAt: '2024-01-13T15:00:00Z',
        likes: 234,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-13T14:00:00Z',
    isLiked: true,
    isBookmarked: false,
    shareCount: 412,
    views: 32000,
    tags: ['art', 'painting', 'commission'],
  },
  {
    id: 'p6',
    userId: 'u6',
    user: u6,
    image: 'https://picsum.photos/seed/post6/800/800',
    caption: 'New dev setup! 3 monitors + standing desk 💻 #workspace',
    likes: 3400,
    comments: [
      {
        id: 'c7',
        userId: 'u1',
        user: u1,
        text: 'Clean setup!',
        createdAt: '2024-01-12T16:00:00Z',
        likes: 90,
        isLiked: false,
      },
      {
        id: 'c8',
        userId: 'u2',
        user: u2,
        text: 'What monitor is that?',
        createdAt: '2024-01-12T17:30:00Z',
        likes: 15,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-12T15:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 178,
    views: 14000,
    tags: ['tech', 'setup', 'workspace'],
  },
  {
    id: 'p7',
    userId: 'u7',
    user: u7,
    image: 'https://picsum.photos/seed/post7/800/800',
    caption: "Today's fit 👗 Neutral tones for a Sunday stroll.",
    likes: 8900,
    comments: [
      {
        id: 'c9',
        userId: 'u3',
        user: u3,
        text: 'Love this look!',
        createdAt: '2024-01-11T12:00:00Z',
        likes: 156,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-11T10:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 678,
    views: 45000,
    tags: ['fashion', 'outfit', 'ootd'],
  },
  {
    id: 'p8',
    userId: 'u1',
    user: u1,
    image: 'https://picsum.photos/seed/post8/800/800',
    caption: 'Ha Long Bay at dawn 🌊⛵ Pure magic.',
    likes: 5600,
    comments: [],
    createdAt: '2024-01-10T19:00:00Z',
    isLiked: true,
    isBookmarked: true,
    shareCount: 320,
    views: 23000,
    location: 'Ha Long Bay, Vietnam',
    tags: ['travel', 'halongbay', 'vietnam'],
  },
];

// Posts belonging to the active_user (shown on their own profile grid)
export const mockActiveUserPosts: Post[] = [
  {
    id: 'mp1',
    userId: 'current',
    user: me,
    image: 'https://picsum.photos/seed/my_post1/800/800',
    caption: 'Coffee and code ☕💻 Perfect morning.',
    likes: 234,
    comments: [
      {
        id: 'mc1',
        userId: 'u1',
        user: u1,
        text: 'Great vibes!',
        createdAt: '2024-01-14T09:00:00Z',
        likes: 12,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-14T08:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 5,
    views: 890,
    tags: ['developer', 'coffee'],
  },
  {
    id: 'mp2',
    userId: 'current',
    user: me,
    image: 'https://picsum.photos/seed/my_post2/800/800',
    caption: 'Golden hour in District 1 📸',
    likes: 456,
    comments: [],
    createdAt: '2024-01-10T18:00:00Z',
    isLiked: true,
    isBookmarked: false,
    shareCount: 18,
    views: 2100,
    location: 'Ho Chi Minh City',
    tags: ['photography', 'vietnam'],
  },
  {
    id: 'mp3',
    userId: 'current',
    user: me,
    image: 'https://picsum.photos/seed/my_post3/800/800',
    caption: 'Weekend hike at Ba Den Mountain! 🥾',
    likes: 678,
    comments: [
      {
        id: 'mc2',
        userId: 'u3',
        user: u3,
        text: 'Epic view!',
        createdAt: '2024-01-08T15:00:00Z',
        likes: 34,
        isLiked: true,
      },
    ],
    createdAt: '2024-01-08T14:00:00Z',
    isLiked: false,
    isBookmarked: true,
    shareCount: 23,
    views: 3200,
    location: 'Ba Den Mountain, Tay Ninh',
    tags: ['hiking', 'nature', 'adventure'],
  },
  {
    id: 'mp4',
    userId: 'current',
    user: me,
    image: 'https://picsum.photos/seed/my_post4/800/800',
    caption: 'New mechanical keyboard setup! ⌨️ Gateron switches are 🔥',
    likes: 345,
    comments: [
      {
        id: 'mc3',
        userId: 'u6',
        user: u6,
        text: 'Which keycaps are those?',
        createdAt: '2024-01-05T20:00:00Z',
        likes: 8,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-05T19:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 12,
    views: 1700,
    tags: ['keyboard', 'tech', 'mechanical'],
  },
  {
    id: 'mp5',
    userId: 'current',
    user: me,
    image: 'https://picsum.photos/seed/my_post5/800/800',
    caption: "Street food tour in District 4 🌮 Best banh canh I've ever had!",
    likes: 520,
    comments: [],
    createdAt: '2024-01-02T12:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 45,
    views: 2800,
    location: 'District 4, HCMC',
    tags: ['food', 'streetfood', 'vietnam'],
  },
];

// ============================================================
// STORIES (by other users — shown on the For You feed)
// ============================================================

export const mockStories: Story[] = [
  {
    id: 's1',
    user: u1,
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story1a/400/700',
      'https://picsum.photos/seed/story1b/400/700',
    ],
  },
  {
    id: 's2',
    user: u2,
    isViewed: true,
    images: ['https://picsum.photos/seed/story2/400/700'],
  },
  {
    id: 's3',
    user: u3,
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story3a/400/700',
      'https://picsum.photos/seed/story3b/400/700',
      'https://picsum.photos/seed/story3c/400/700',
    ],
  },
  {
    id: 's4',
    user: u4,
    isViewed: true,
    images: ['https://picsum.photos/seed/story4/400/700'],
  },
  {
    id: 's5',
    user: u5,
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story5a/400/700',
      'https://picsum.photos/seed/story5b/400/700',
    ],
  },
  {
    id: 's6',
    user: u6,
    isViewed: true,
    images: ['https://picsum.photos/seed/story6/400/700'],
  },
  {
    id: 's7',
    user: u7,
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story7a/400/700',
      'https://picsum.photos/seed/story7b/400/700',
    ],
  },
];

// ============================================================
// REELS (content from other users)
// ============================================================

export const mockReels: Reel[] = [
  {
    id: 'r1',
    user: u1,
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://picsum.photos/seed/reel1/400/700',
    caption: 'Sunset in Nha Trang 🌅 #travel #vietnam',
    likes: 12400,
    comments: 567,
    views: 78000,
    shares: 2300,
    isLiked: false,
    isBookmarked: false,
    music: 'Golden Hour',
    musicArtist: 'JVKE',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'r2',
    user: u3,
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://picsum.photos/seed/reel2/400/700',
    caption: '30-day squat challenge results! 💪 #fitness',
    likes: 8900,
    comments: 432,
    views: 56000,
    shares: 1200,
    isLiked: true,
    isBookmarked: false,
    music: 'Lose Yourself',
    musicArtist: 'Eminem',
    createdAt: '2024-01-14T06:00:00Z',
  },
  {
    id: 'r3',
    user: u5,
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://picsum.photos/seed/reel3/400/700',
    caption: 'Time-lapse of my latest commission 🎨 #artist #process',
    likes: 23000,
    comments: 890,
    views: 120000,
    shares: 3400,
    isLiked: false,
    isBookmarked: true,
    music: 'Blinding Lights',
    musicArtist: 'The Weeknd',
    createdAt: '2024-01-13T14:00:00Z',
  },
  {
    id: 'r4',
    user: u7,
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://picsum.photos/seed/reel4/400/700',
    caption: "Style check! Today's outfit 👗 #fashion #ootd",
    likes: 34000,
    comments: 1200,
    views: 180000,
    shares: 5600,
    isLiked: false,
    isBookmarked: false,
    music: 'Levitating',
    musicArtist: 'Dua Lipa',
    createdAt: '2024-01-12T10:00:00Z',
  },
  {
    id: 'r5',
    user: u4,
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnail: 'https://picsum.photos/seed/reel5/400/700',
    caption: 'Beat preview! 🔥 New track dropping Friday 🎵',
    likes: 15600,
    comments: 678,
    views: 89000,
    shares: 2100,
    isLiked: true,
    isBookmarked: false,
    music: 'Circles',
    musicArtist: 'Post Malone',
    createdAt: '2024-01-11T20:00:00Z',
  },
];

// ============================================================
// CONVERSATIONS & MESSAGES (for active_user / mockActiveUser)
// ============================================================

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    type: 'private',
    members: [me, u1],
    lastMessage: {
      id: 'm1',
      conversationId: 'conv1',
      senderId: u1.id,
      sender: u1,
      text: 'That photo looks amazing! Where was it taken?',
      createdAt: '2024-01-15T12:30:00Z',
      isRead: false,
    },
    unreadCount: 2,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T12:30:00Z',
  },
  {
    id: 'conv2',
    type: 'private',
    members: [me, u3],
    lastMessage: {
      id: 'm2',
      conversationId: 'conv2',
      senderId: 'current',
      sender: me,
      text: 'Thanks for the workout tips! 🙌',
      createdAt: '2024-01-14T20:00:00Z',
      isRead: true,
    },
    unreadCount: 0,
    createdAt: '2024-01-08T15:00:00Z',
    updatedAt: '2024-01-14T20:00:00Z',
  },
  {
    id: 'conv3',
    type: 'private',
    members: [me, u5],
    lastMessage: {
      id: 'm3',
      conversationId: 'conv3',
      senderId: u5.id,
      sender: u5,
      text: 'I would love to collaborate! Let me know when you are free.',
      createdAt: '2024-01-13T18:00:00Z',
      isRead: false,
    },
    unreadCount: 1,
    createdAt: '2024-01-05T09:00:00Z',
    updatedAt: '2024-01-13T18:00:00Z',
  },
  {
    id: 'conv4',
    type: 'group',
    name: 'HCMC Foodies 🍜',
    members: [me, u1, u2, u6],
    adminIds: [u1.id],
    lastMessage: {
      id: 'm4',
      conversationId: 'conv4',
      senderId: u2.id,
      sender: u2,
      text: 'Guys, check out this new pho spot!',
      createdAt: '2024-01-15T11:00:00Z',
      isRead: true,
    },
    unreadCount: 0,
    isGroup: true,
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
  },
  {
    id: 'conv5',
    type: 'private',
    members: [me, u7],
    lastMessage: {
      id: 'm5',
      conversationId: 'conv5',
      senderId: 'current',
      sender: me,
      text: 'Love your latest post! 😍',
      createdAt: '2024-01-12T14:00:00Z',
      isRead: true,
    },
    unreadCount: 0,
    createdAt: '2024-01-03T16:00:00Z',
    updatedAt: '2024-01-12T14:00:00Z',
  },
  {
    id: 'conv6',
    type: 'group',
    name: 'Weekend Hikers 🥾',
    members: [me, u1, u2, u4],
    adminIds: [u1.id, 'current'],
    lastMessage: {
      id: 'm6',
      conversationId: 'conv6',
      senderId: u2.id,
      sender: u2,
      text: 'Can we push the trip to next weekend?',
      createdAt: '2024-01-15T09:30:00Z',
      isRead: false,
    },
    unreadCount: 3,
    isGroup: true,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T09:30:00Z',
  },
];

export const mockMessages_conv1: Message[] = [
  {
    id: 'msg1',
    conversationId: 'conv1',
    senderId: 'current',
    sender: me,
    text: 'Hey Linh! Loved your latest travel post! 🌅',
    createdAt: '2024-01-15T10:00:00Z',
    isRead: true,
  },
  {
    id: 'msg2',
    conversationId: 'conv1',
    senderId: u1.id,
    sender: u1,
    text: 'Oh thank you! It was taken in Da Nang 🌴',
    createdAt: '2024-01-15T10:15:00Z',
    isRead: true,
  },
  {
    id: 'msg3',
    conversationId: 'conv1',
    senderId: 'current',
    sender: me,
    text: 'Da Nang is on my list! Any recommendations?',
    createdAt: '2024-01-15T10:30:00Z',
    isRead: true,
  },
  {
    id: 'msg4',
    conversationId: 'conv1',
    senderId: u1.id,
    sender: u1,
    text: 'You have to visit the Marble Mountains! And the beaches in My Khe are incredible.',
    createdAt: '2024-01-15T11:00:00Z',
    isRead: true,
  },
  {
    id: 'msg5',
    conversationId: 'conv1',
    senderId: 'current',
    sender: me,
    text: 'Adding those to my list!',
    createdAt: '2024-01-15T11:45:00Z',
    isRead: true,
  },
  {
    id: 'msg6',
    conversationId: 'conv1',
    senderId: u1.id,
    sender: u1,
    text: 'Also check out Ba Na Hills for a day trip. The Golden Bridge is unreal!',
    createdAt: '2024-01-15T12:10:00Z',
    isRead: true,
  },
  {
    id: 'msg7',
    conversationId: 'conv1',
    senderId: u1.id,
    sender: u1,
    text: 'That photo looks amazing! Where was it taken?',
    createdAt: '2024-01-15T12:30:00Z',
    isRead: false,
  },
];

export const mockMessages_conv2: Message[] = [
  {
    id: 'msg8',
    conversationId: 'conv2',
    senderId: u3.id,
    sender: u3,
    text: 'Hey! Saw you checked out my workout post 💪',
    createdAt: '2024-01-14T19:00:00Z',
    isRead: true,
  },
  {
    id: 'msg9',
    conversationId: 'conv2',
    senderId: 'current',
    sender: me,
    text: 'Yes! Your morning routine is so inspiring.',
    createdAt: '2024-01-14T19:30:00Z',
    isRead: true,
  },
  {
    id: 'msg10',
    conversationId: 'conv2',
    senderId: u3.id,
    sender: u3,
    text: 'Thank you! Here is a quick routine if you want to try: 20 burpees, 30 squats, 40 lunges. Repeat 3x',
    createdAt: '2024-01-14T19:45:00Z',
    isRead: true,
  },
  {
    id: 'msg11',
    conversationId: 'conv2',
    senderId: 'current',
    sender: me,
    text: 'Thanks for the workout tips! 🙌',
    createdAt: '2024-01-14T20:00:00Z',
    isRead: true,
  },
];

export const mockMessages_conv3: Message[] = [
  {
    id: 'msg12',
    conversationId: 'conv3',
    senderId: u5.id,
    sender: u5,
    text: 'Hi! I love your profile aesthetic!',
    createdAt: '2024-01-13T17:00:00Z',
    isRead: true,
  },
  {
    id: 'msg13',
    conversationId: 'conv3',
    senderId: 'current',
    sender: me,
    text: 'Thank you Huong! Your artwork is absolutely stunning 🎨',
    createdAt: '2024-01-13T17:15:00Z',
    isRead: true,
  },
  {
    id: 'msg14',
    conversationId: 'conv3',
    senderId: u5.id,
    sender: u5,
    text: 'I would love to collaborate! Let me know when you are free.',
    createdAt: '2024-01-13T18:00:00Z',
    isRead: false,
  },
];

export const mockMessages_conv4: Message[] = [
  {
    id: 'msg15',
    conversationId: 'conv4',
    senderId: u1.id,
    sender: u1,
    text: 'Hey everyone! When is our next food tour?',
    createdAt: '2024-01-15T09:00:00Z',
    isRead: true,
  },
  {
    id: 'msg16',
    conversationId: 'conv4',
    senderId: u2.id,
    sender: u2,
    text: 'How about this Saturday afternoon?',
    createdAt: '2024-01-15T09:30:00Z',
    isRead: true,
  },
  {
    id: 'msg17',
    conversationId: 'conv4',
    senderId: u1.id,
    sender: u1,
    text: "Perfect! Let's meet at Nguyen Hue walking street at 4 PM.",
    createdAt: '2024-01-15T10:00:00Z',
    isRead: true,
  },
  {
    id: 'msg18',
    conversationId: 'conv4',
    senderId: u2.id,
    sender: u2,
    text: "I'll be there! Can't wait to try everything!",
    createdAt: '2024-01-15T10:30:00Z',
    isRead: true,
  },
  {
    id: 'msg19',
    conversationId: 'conv4',
    senderId: u2.id,
    sender: u2,
    text: 'Guys, check out this new pho spot!',
    createdAt: '2024-01-15T11:00:00Z',
    isRead: true,
  },
];

export const mockMessages_conv6: Message[] = [
  {
    id: 'msg20',
    conversationId: 'conv6',
    senderId: u1.id,
    sender: u1,
    text: 'Guys, I am so excited for our next hike! 🎉',
    createdAt: '2024-01-15T08:00:00Z',
    isRead: true,
  },
  {
    id: 'msg21',
    conversationId: 'conv6',
    senderId: u2.id,
    sender: u2,
    text: 'Same here! Already packed my bags!',
    createdAt: '2024-01-15T08:30:00Z',
    isRead: false,
  },
  {
    id: 'msg22',
    conversationId: 'conv6',
    senderId: u4.id,
    sender: u4,
    text: 'I am bringing my camera for sure.',
    createdAt: '2024-01-15T09:00:00Z',
    isRead: false,
  },
  {
    id: 'msg23',
    conversationId: 'conv6',
    senderId: u2.id,
    sender: u2,
    text: 'Can we push the trip to next weekend?',
    createdAt: '2024-01-15T09:30:00Z',
    isRead: false,
  },
];

export const mockMessagesMap: Record<string, Message[]> = {
  conv1: mockMessages_conv1,
  conv2: mockMessages_conv2,
  conv3: mockMessages_conv3,
  conv4: mockMessages_conv4,
  conv6: mockMessages_conv6,
};

// ============================================================
// NOTIFICATIONS (for active_user / mockActiveUser)
// ============================================================

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'like',
    user: u7,
    post: mockPosts[6],
    message: 'liked your post',
    createdAt: '2024-01-15T13:00:00Z',
    isRead: false,
  },
  {
    id: 'n2',
    type: 'follow',
    user: u5,
    message: 'started following you',
    createdAt: '2024-01-15T12:30:00Z',
    isRead: false,
  },
  {
    id: 'n3',
    type: 'comment',
    user: u3,
    post: mockPosts[0],
    comment: {
      id: 'nc1',
      userId: u3.id,
      user: u3,
      text: 'This is amazing! Great shot!',
      createdAt: '2024-01-15T11:30:00Z',
      likes: 0,
    },
    message: 'commented: "This is amazing! Great shot!"',
    createdAt: '2024-01-15T11:30:00Z',
    isRead: false,
  },
  {
    id: 'n4',
    type: 'like',
    user: u4,
    post: mockPosts[3],
    message: 'liked your post',
    createdAt: '2024-01-15T10:00:00Z',
    isRead: true,
  },
  {
    id: 'n5',
    type: 'follow',
    user: u1,
    message: 'started following you',
    createdAt: '2024-01-14T20:00:00Z',
    isRead: true,
  },
  {
    id: 'n6',
    type: 'mention',
    user: u2,
    post: mockPosts[1],
    message: 'mentioned you in a post',
    createdAt: '2024-01-14T18:00:00Z',
    isRead: true,
  },
  {
    id: 'n7',
    type: 'follow',
    user: u6,
    message: 'started following you',
    createdAt: '2024-01-14T15:00:00Z',
    isRead: true,
  },
  {
    id: 'n8',
    type: 'like',
    user: u3,
    post: mockPosts[2],
    message: 'liked your post',
    createdAt: '2024-01-14T12:00:00Z',
    isRead: true,
  },
  {
    id: 'n9',
    type: 'comment',
    user: u7,
    post: mockPosts[4],
    comment: {
      id: 'nc2',
      userId: u7.id,
      user: u7,
      text: 'Incredible work! 🔥',
      createdAt: '2024-01-13T16:00:00Z',
      likes: 0,
    },
    message: 'commented: "Incredible work! 🔥"',
    createdAt: '2024-01-13T16:00:00Z',
    isRead: true,
  },
  {
    id: 'n10',
    type: 'share',
    user: u1,
    post: mockPosts[0],
    message: 'shared your post with their followers',
    createdAt: '2024-01-13T14:00:00Z',
    isRead: true,
  },
];

// ============================================================
// MUSIC
// ============================================================

export const mockTracks: Track[] = [
  {
    id: 't1',
    title: 'Midnight Dreams',
    artist: 'Luna Wave',
    album: 'Neon Nights',
    cover: 'https://picsum.photos/seed/track1/200/200',
    duration: '3:45',
    likes: 12400,
    plays: 156000,
    isLiked: false,
  },
  {
    id: 't2',
    title: 'Summer Vibes',
    artist: 'The Coastals',
    album: 'Beach Days',
    cover: 'https://picsum.photos/seed/track2/200/200',
    duration: '4:12',
    likes: 9800,
    plays: 89000,
    isLiked: true,
  },
  {
    id: 't3',
    title: 'Electric Pulse',
    artist: 'Neon Rider',
    album: 'Synth City',
    cover: 'https://picsum.photos/seed/track3/200/200',
    duration: '3:28',
    likes: 15600,
    plays: 234000,
    isLiked: false,
  },
  {
    id: 't4',
    title: 'Acoustic Heart',
    artist: 'Willow',
    album: 'Quiet Moments',
    cover: 'https://picsum.photos/seed/track4/200/200',
    duration: '4:55',
    likes: 8700,
    plays: 67000,
    isLiked: false,
  },
  {
    id: 't5',
    title: 'Urban Groove',
    artist: 'City Beats',
    album: 'Street Sounds',
    cover: 'https://picsum.photos/seed/track5/200/200',
    duration: '3:15',
    likes: 11200,
    plays: 123000,
    isLiked: true,
  },
  {
    id: 't6',
    title: 'Ocean Waves',
    artist: 'Luna Wave',
    album: 'Coastal EP',
    cover: 'https://picsum.photos/seed/track6/200/200',
    duration: '5:02',
    likes: 18900,
    plays: 289000,
    isLiked: false,
  },
];

export const mockMusicArtists: MusicArtist[] = [
  { id: 'ma1', name: 'Luna Wave', avatar: 'https://picsum.photos/seed/martist1/200/200', followers: '1.2M', isFollowing: false },
  { id: 'ma2', name: 'The Coastals', avatar: 'https://picsum.photos/seed/martist2/200/200', followers: '890K', isFollowing: true },
  { id: 'ma3', name: 'Neon Rider', avatar: 'https://picsum.photos/seed/martist3/200/200', followers: '2.1M', isFollowing: false },
  { id: 'ma4', name: 'Willow', avatar: 'https://picsum.photos/seed/martist4/200/200', followers: '650K', isFollowing: false },
  { id: 'ma5', name: 'City Beats', avatar: 'https://picsum.photos/seed/martist5/200/200', followers: '1.5M', isFollowing: true },
];
