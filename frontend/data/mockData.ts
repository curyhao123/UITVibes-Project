// ============================================================
// CORE INTERFACES
// ============================================================

export interface User {
  id: string;
  username: string;
  displayName: string;
  fullName: string;
  avatar: string;
  coverImage: string;
  bio: string;
  gender: string;
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
  commentsCount?: number;
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
  fullName: 'New User',
  avatar: 'https://i.pravatar.cc/150?img=47',
  coverImage: '',
  bio: '',
  gender: '',
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
    fullName: 'Phan Thị Linh',
    avatar: 'https://i.pravatar.cc/150?img=5',
    coverImage: 'https://picsum.photos/seed/cover-u1/800/200',
    bio: 'Travel lover ✈️ Chasing sunsets around Vietnam.',
    gender: 'female',
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
    fullName: 'Đường Minh',
    avatar: 'https://i.pravatar.cc/150?img=3',
    coverImage: 'https://picsum.photos/seed/cover-u2/800/200',
    bio: 'Foodie 🍕 Street food hunter in Ho Chi Minh City.',
    gender: 'male',
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
    fullName: 'Nguyễn Thanh Huyền',
    avatar: 'https://i.pravatar.cc/150?img=9',
    coverImage: 'https://picsum.photos/seed/cover-u3/800/200',
    bio: 'Fitness coach 💪 DM for training programs.',
    gender: 'female',
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
    fullName: 'Trần Đức',
    avatar: 'https://i.pravatar.cc/150?img=11',
    coverImage: 'https://picsum.photos/seed/cover-u4/800/200',
    bio: 'Music producer 🎵 New EP dropping soon!',
    gender: 'male',
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
    fullName: 'Lê Hương',
    avatar: 'https://i.pravatar.cc/150?img=16',
    coverImage: 'https://picsum.photos/seed/cover-u5/800/200',
    bio: 'Artist 🎨 Commission open! DM for inquiries.',
    gender: 'female',
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
    fullName: 'Nguyễn Khôi',
    avatar: 'https://i.pravatar.cc/150?img=12',
    coverImage: 'https://picsum.photos/seed/cover-u6/800/200',
    bio: 'Tech geek 💻 Building apps one commit at a time.',
    gender: 'male',
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
    fullName: 'Trần Hoa',
    avatar: 'https://i.pravatar.cc/150?img=20',
    coverImage: 'https://picsum.photos/seed/cover-u7/800/200',
    bio: 'Fashion blogger 👗 Daily outfit inspo. Collabs → DM',
    gender: 'female',
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
  fullName: 'Vũ Anh',
  avatar: 'https://i.pravatar.cc/150?img=33',
  coverImage: 'https://picsum.photos/seed/cover1/800/200',
  bio: 'Software engineer 💻 Coffee addict ☕ Photography 📸',
  gender: 'male',
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
    comments: [],
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
    comments: [],
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
    comments: [],
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
    comments: [],
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
    comments: [],
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
    comments: [],
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
    comments: [],
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
    comments: [],
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
    comments: [],
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
