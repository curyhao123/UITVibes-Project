// ============================================================
// Core Interfaces
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

// ============================================================
// Conversation & Message Interfaces
// ============================================================

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

// ============================================================
// Reels Interface
// ============================================================

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

// ============================================================
// Notification Interface
// ============================================================

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

// ============================================================
// Follow Relation Interface
// ============================================================

export interface FollowRelation {
  followerId: string;
  followingId: string;
  createdAt: string;
}

// ============================================================
// ============================================================
// MOCK DATA
// ============================================================
// ============================================================

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'johndoe',
    displayName: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Photography enthusiast 📸 Capturing moments one click at a time.',
    website: 'https://johndoe.com',
    followers: 1250,
    following: 380,
    posts: 45,
    isVerified: false,
    isFollowing: true,
    createdAt: '2023-06-10T10:00:00Z',
  },
  {
    id: '2',
    username: 'janedoe',
    displayName: 'Jane Doe',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: 'Travel lover ✈️ Adventure awaits! Currently exploring Bali 🌴',
    website: 'https://janedoe.com',
    followers: 3500,
    following: 420,
    posts: 78,
    isVerified: true,
    isFollowing: false,
    createdAt: '2023-05-01T08:00:00Z',
  },
  {
    id: '3',
    username: 'alex_smith',
    displayName: 'Alex Smith',
    avatar: 'https://i.pravatar.cc/150?img=3',
    bio: 'Foodie 🍕 Trying every pizza in town. Recipe creator.',
    followers: 890,
    following: 250,
    posts: 32,
    isVerified: false,
    isFollowing: true,
    createdAt: '2023-07-15T12:00:00Z',
  },
  {
    id: '4',
    username: 'sarah_jones',
    displayName: 'Sarah Jones',
    avatar: 'https://i.pravatar.cc/150?img=9',
    bio: 'Fitness coach 💪 Certified trainer. DM for programs.',
    website: 'https://sarahjones.fit',
    followers: 5200,
    following: 180,
    posts: 156,
    isVerified: true,
    isFollowing: false,
    createdAt: '2023-04-20T06:00:00Z',
  },
  {
    id: '5',
    username: 'mikebrown',
    displayName: 'Mike Brown',
    avatar: 'https://i.pravatar.cc/150?img=11',
    bio: 'Music producer 🎵 Beats that hit different. Stream my new EP!',
    followers: 2100,
    following: 310,
    posts: 67,
    isVerified: false,
    isFollowing: true,
    createdAt: '2023-08-01T14:00:00Z',
  },
  {
    id: '6',
    username: 'emily_white',
    displayName: 'Emily White',
    avatar: 'https://i.pravatar.cc/150?img=16',
    bio: 'Artist 🎨 Commission open! DM for inquiries.',
    website: 'https://emilywhite.art',
    followers: 7800,
    following: 450,
    posts: 234,
    isVerified: true,
    isFollowing: false,
    createdAt: '2023-03-12T09:00:00Z',
  },
  {
    id: '7',
    username: 'david_lee',
    displayName: 'David Lee',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Tech geek 💻 Building the future, one line of code at a time.',
    followers: 1560,
    following: 290,
    posts: 89,
    isVerified: false,
    isFollowing: false,
    createdAt: '2023-09-05T11:00:00Z',
  },
  {
    id: '8',
    username: 'lisa_chen',
    displayName: 'Lisa Chen',
    avatar: 'https://i.pravatar.cc/150?img=20',
    bio: 'Fashion blogger 👗 Style tips & outfit inspo. Collabs → DM',
    website: 'https://lisachen.fashion',
    followers: 9800,
    following: 520,
    posts: 312,
    isVerified: true,
    isFollowing: false,
    createdAt: '2023-02-28T07:00:00Z',
  },
];

export const currentUser: User = {
  id: 'current',
  username: 'myusername',
  displayName: 'My Username',
  avatar: 'https://i.pravatar.cc/150?img=33',
  bio: 'Welcome to my profile! 👋 Sharing my journey.',
  website: 'https://myusername.com',
  followers: 500,
  following: 200,
  posts: 25,
  isVerified: false,
  createdAt: '2023-01-01T00:00:00Z',
};

// ============================================================
// FOLLOW RELATIONS (who does currentUser follow?)
// ============================================================

// currentUser follows: 1, 3, 5 (johndoe, alex_smith, mikebrown)
export const currentUserFollowingIds: Set<string> = new Set(['1', '3', '5']);

// ============================================================
// POSTS
// ============================================================

export const mockPosts: Post[] = [
  {
    id: '1',
    userId: '2',
    user: mockUsers[1],
    image: 'https://picsum.photos/seed/post1/800/800',
    caption: 'Amazing sunset in Bali! 🌅 #travel #bali',
    likes: 234,
    comments: [
      {
        id: 'c1',
        userId: '3',
        user: mockUsers[2],
        text: 'Beautiful! 😍',
        createdAt: '2024-01-15T10:30:00Z',
        likes: 12,
        isLiked: false,
      },
      {
        id: 'c2',
        userId: '4',
        user: mockUsers[3],
        text: 'Wish I was there!',
        createdAt: '2024-01-15T11:00:00Z',
        likes: 5,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-15T09:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 18,
    views: 1250,
    location: 'Bali, Indonesia',
    tags: ['travel', 'bali', 'sunset'],
  },
  {
    id: '2',
    userId: '3',
    user: mockUsers[2],
    image: 'https://picsum.photos/seed/post2/800/800',
    caption: 'Delicious pizza night! 🍕',
    likes: 156,
    comments: [
      {
        id: 'c3',
        userId: '5',
        user: mockUsers[4],
        text: 'Looks amazing!',
        createdAt: '2024-01-14T18:30:00Z',
        likes: 8,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-14T17:00:00Z',
    isLiked: true,
    isBookmarked: true,
    shareCount: 5,
    views: 890,
    tags: ['food', 'pizza'],
  },
  {
    id: '3',
    userId: '4',
    user: mockUsers[3],
    image: 'https://picsum.photos/seed/post3/800/800',
    caption: 'Morning workout complete! 💪 #fitness',
    likes: 445,
    comments: [
      {
        id: 'c4',
        userId: '6',
        user: mockUsers[5],
        text: 'Keep it up!',
        createdAt: '2024-01-14T08:00:00Z',
        likes: 23,
        isLiked: true,
      },
      {
        id: 'c5',
        userId: '7',
        user: mockUsers[6],
        text: 'What time do you workout?',
        createdAt: '2024-01-14T09:15:00Z',
        likes: 3,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-14T07:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 12,
    views: 2100,
    tags: ['fitness', 'workout'],
  },
  {
    id: '4',
    userId: '5',
    user: mockUsers[4],
    image: 'https://picsum.photos/seed/post4/800/800',
    caption: 'New track dropping soon! 🎵 #music',
    likes: 892,
    comments: [],
    createdAt: '2024-01-13T20:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 67,
    views: 4500,
    tags: ['music'],
  },
  {
    id: '5',
    userId: '6',
    user: mockUsers[5],
    image: 'https://picsum.photos/seed/post5/800/800',
    caption: 'New artwork just finished! 🎨 #art',
    likes: 1205,
    comments: [
      {
        id: 'c6',
        userId: '8',
        user: mockUsers[7],
        text: 'Absolutely stunning!',
        createdAt: '2024-01-13T15:00:00Z',
        likes: 45,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-13T14:00:00Z',
    isLiked: true,
    isBookmarked: false,
    shareCount: 89,
    views: 7800,
    tags: ['art', 'painting'],
  },
  {
    id: '6',
    userId: '7',
    user: mockUsers[6],
    image: 'https://picsum.photos/seed/post6/800/800',
    caption: 'Latest tech setup! 💻 #tech',
    likes: 678,
    comments: [
      {
        id: 'c7',
        userId: '1',
        user: mockUsers[0],
        text: 'Nice setup!',
        createdAt: '2024-01-12T16:00:00Z',
        likes: 20,
        isLiked: false,
      },
      {
        id: 'c8',
        userId: '2',
        user: mockUsers[1],
        text: 'What monitor is that?',
        createdAt: '2024-01-12T17:30:00Z',
        likes: 8,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-12T15:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 34,
    views: 3200,
    tags: ['tech', 'setup'],
  },
  {
    id: '7',
    userId: '8',
    user: mockUsers[7],
    image: 'https://picsum.photos/seed/post7/800/800',
    caption: 'Fashion inspo for today! 👗 #fashion',
    likes: 2345,
    comments: [
      {
        id: 'c9',
        userId: '3',
        user: mockUsers[2],
        text: 'Love this outfit!',
        createdAt: '2024-01-11T12:00:00Z',
        likes: 56,
        isLiked: false,
      },
    ],
    createdAt: '2024-01-11T10:00:00Z',
    isLiked: false,
    isBookmarked: false,
    shareCount: 156,
    views: 12000,
    tags: ['fashion', 'outfit'],
  },
  {
    id: '8',
    userId: '1',
    user: mockUsers[0],
    image: 'https://picsum.photos/seed/post8/800/800',
    caption: 'Street photography 📸',
    likes: 423,
    comments: [],
    createdAt: '2024-01-10T19:00:00Z',
    isLiked: true,
    isBookmarked: true,
    shareCount: 22,
    views: 1890,
    tags: ['photography', 'street'],
  },
];

// ============================================================
// STORIES
// ============================================================

export const mockStories: Story[] = [
  {
    id: 's1',
    user: mockUsers[1],
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story1a/400/700',
      'https://picsum.photos/seed/story1b/400/700',
    ],
  },
  {
    id: 's2',
    user: mockUsers[2],
    isViewed: true,
    images: ['https://picsum.photos/seed/story2/400/700'],
  },
  {
    id: 's3',
    user: mockUsers[3],
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story3a/400/700',
      'https://picsum.photos/seed/story3b/400/700',
      'https://picsum.photos/seed/story3c/400/700',
    ],
  },
  {
    id: 's4',
    user: mockUsers[4],
    isViewed: true,
    images: ['https://picsum.photos/seed/story4/400/700'],
  },
  {
    id: 's5',
    user: mockUsers[5],
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story5a/400/700',
      'https://picsum.photos/seed/story5b/400/700',
    ],
  },
  {
    id: 's6',
    user: mockUsers[6],
    isViewed: true,
    images: ['https://picsum.photos/seed/story6/400/700'],
  },
  {
    id: 's7',
    user: mockUsers[7],
    isViewed: false,
    images: [
      'https://picsum.photos/seed/story7a/400/700',
      'https://picsum.photos/seed/story7b/400/700',
    ],
  },
];

// ============================================================
// REELS
// ============================================================

export const mockReels: Reel[] = [
  {
    id: 'r1',
    user: mockUsers[1],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://picsum.photos/seed/reel1/400/700',
    caption: 'Sunset vibes 🌅 #bali #travel',
    likes: 4500,
    comments: 234,
    views: 45000,
    shares: 890,
    isLiked: false,
    isBookmarked: false,
    music: 'Golden Hour',
    musicArtist: 'JVKE',
    createdAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'r2',
    user: mockUsers[3],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://picsum.photos/seed/reel2/400/700',
    caption: 'Workout tips 💪 #fitness #gym',
    likes: 3200,
    comments: 156,
    views: 28000,
    shares: 456,
    isLiked: true,
    isBookmarked: false,
    music: 'Lose Yourself',
    musicArtist: 'Eminem',
    createdAt: '2024-01-14T06:00:00Z',
  },
  {
    id: 'r3',
    user: mockUsers[5],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://picsum.photos/seed/reel3/400/700',
    caption: 'Art process 🎨 #artist #creative',
    likes: 8900,
    comments: 456,
    views: 78000,
    shares: 1200,
    isLiked: false,
    isBookmarked: true,
    music: 'Blinding Lights',
    musicArtist: 'The Weeknd',
    createdAt: '2024-01-13T14:00:00Z',
  },
  {
    id: 'r4',
    user: mockUsers[7],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://picsum.photos/seed/reel4/400/700',
    caption: 'Style check! 👗 #fashion #ootd',
    likes: 15600,
    comments: 892,
    views: 120000,
    shares: 3400,
    isLiked: false,
    isBookmarked: false,
    music: 'Levitating',
    musicArtist: 'Dua Lipa',
    createdAt: '2024-01-12T10:00:00Z',
  },
  {
    id: 'r5',
    user: mockUsers[4],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnail: 'https://picsum.photos/seed/reel5/400/700',
    caption: 'Beat preview! 🎵 #producer #beats',
    likes: 5600,
    comments: 234,
    views: 45000,
    shares: 789,
    isLiked: true,
    isBookmarked: false,
    music: 'Circles',
    musicArtist: 'Post Malone',
    createdAt: '2024-01-11T20:00:00Z',
  },
];

// ============================================================
// CONVERSATIONS & MESSAGES
// ============================================================

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    type: 'private',
    members: [currentUser, mockUsers[1]],
    lastMessage: {
      id: 'm1',
      conversationId: 'conv1',
      senderId: mockUsers[1].id,
      sender: mockUsers[1],
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
    members: [currentUser, mockUsers[3]],
    lastMessage: {
      id: 'm2',
      conversationId: 'conv2',
      senderId: 'current',
      sender: currentUser,
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
    members: [currentUser, mockUsers[5]],
    lastMessage: {
      id: 'm3',
      conversationId: 'conv3',
      senderId: mockUsers[5].id,
      sender: mockUsers[5],
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
    name: 'Photography Crew 📸',
    avatar: undefined,
    members: [currentUser, mockUsers[0], mockUsers[1], mockUsers[6]],
    adminIds: [mockUsers[0].id],
    lastMessage: {
      id: 'm4',
      conversationId: 'conv4',
      senderId: mockUsers[0].id,
      sender: mockUsers[0],
      text: 'Here are the photos from our last shoot!',
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
    members: [currentUser, mockUsers[7]],
    lastMessage: {
      id: 'm5',
      conversationId: 'conv5',
      senderId: 'current',
      sender: currentUser,
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
    name: 'Weekend Adventure 🌍',
    avatar: undefined,
    members: [currentUser, mockUsers[1], mockUsers[2], mockUsers[4]],
    adminIds: [mockUsers[1].id, 'current'],
    lastMessage: {
      id: 'm6',
      conversationId: 'conv6',
      senderId: mockUsers[2].id,
      sender: mockUsers[2],
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

// Messages for conv1 (Jane Doe chat)
export const mockMessages_conv1: Message[] = [
  {
    id: 'msg1',
    conversationId: 'conv1',
    senderId: 'current',
    sender: currentUser,
    text: 'Hey Jane! Loved your latest post! 🌅',
    createdAt: '2024-01-15T10:00:00Z',
    isRead: true,
  },
  {
    id: 'msg2',
    conversationId: 'conv1',
    senderId: mockUsers[1].id,
    sender: mockUsers[1],
    text: 'Oh thank you so much! It was taken in Bali 🌴',
    createdAt: '2024-01-15T10:15:00Z',
    isRead: true,
  },
  {
    id: 'msg3',
    conversationId: 'conv1',
    senderId: 'current',
    sender: currentUser,
    text: 'Bali looks incredible! Planning a trip there soon.',
    createdAt: '2024-01-15T10:30:00Z',
    isRead: true,
  },
  {
    id: 'msg4',
    conversationId: 'conv1',
    senderId: mockUsers[1].id,
    sender: mockUsers[1],
    text: "That's awesome! You should definitely visit Ubud. The rice terraces are breathtaking!",
    createdAt: '2024-01-15T11:00:00Z',
    isRead: true,
  },
  {
    id: 'msg5',
    conversationId: 'conv1',
    senderId: 'current',
    sender: currentUser,
    text: 'Adding that to my list! Any other recommendations?',
    createdAt: '2024-01-15T11:45:00Z',
    isRead: true,
  },
  {
    id: 'msg6',
    conversationId: 'conv1',
    senderId: mockUsers[1].id,
    sender: mockUsers[1],
    text: 'Of course! Also check out the Uluwatu temple for sunset. And the beaches in Seminyak are amazing!',
    createdAt: '2024-01-15T12:10:00Z',
    isRead: true,
  },
  {
    id: 'msg7',
    conversationId: 'conv1',
    senderId: mockUsers[1].id,
    sender: mockUsers[1],
    text: 'That photo looks amazing! Where was it taken?',
    createdAt: '2024-01-15T12:30:00Z',
    isRead: false,
  },
];

// Messages for conv2 (Sarah Jones chat)
export const mockMessages_conv2: Message[] = [
  {
    id: 'msg8',
    conversationId: 'conv2',
    senderId: mockUsers[3].id,
    sender: mockUsers[3],
    text: 'Hey! Saw you checked out my workout post 💪',
    createdAt: '2024-01-14T19:00:00Z',
    isRead: true,
  },
  {
    id: 'msg9',
    conversationId: 'conv2',
    senderId: 'current',
    sender: currentUser,
    text: 'Yes! Your morning routine is so inspiring.',
    createdAt: '2024-01-14T19:30:00Z',
    isRead: true,
  },
  {
    id: 'msg10',
    conversationId: 'conv2',
    senderId: mockUsers[3].id,
    sender: mockUsers[3],
    text: 'Thank you! Here is a quick routine if you want to try: 20 burpees, 30 squats, 40 lunges. Repeat 3x',
    createdAt: '2024-01-14T19:45:00Z',
    isRead: true,
  },
  {
    id: 'msg11',
    conversationId: 'conv2',
    senderId: 'current',
    sender: currentUser,
    text: 'Thanks for the workout tips! 🙌',
    createdAt: '2024-01-14T20:00:00Z',
    isRead: true,
  },
];

// Messages for conv3 (Emily White chat)
export const mockMessages_conv3: Message[] = [
  {
    id: 'msg12',
    conversationId: 'conv3',
    senderId: mockUsers[5].id,
    sender: mockUsers[5],
    text: 'Hi! I love your profile aesthetic!',
    createdAt: '2024-01-13T17:00:00Z',
    isRead: true,
  },
  {
    id: 'msg13',
    conversationId: 'conv3',
    senderId: 'current',
    sender: currentUser,
    text: 'Thank you Emily! Your artwork is absolutely stunning 🎨',
    createdAt: '2024-01-13T17:15:00Z',
    isRead: true,
  },
  {
    id: 'msg14',
    conversationId: 'conv3',
    senderId: mockUsers[5].id,
    sender: mockUsers[5],
    text: 'I would love to collaborate! Let me know when you are free.',
    createdAt: '2024-01-13T18:00:00Z',
    isRead: false,
  },
];

// Messages for conv4 (Photography Crew group chat)
export const mockMessages_conv4: Message[] = [
  {
    id: 'msg15',
    conversationId: 'conv4',
    senderId: mockUsers[0].id,
    sender: mockUsers[0],
    text: 'Hey everyone! When are we doing our next photo walk?',
    createdAt: '2024-01-15T09:00:00Z',
    isRead: true,
  },
  {
    id: 'msg16',
    conversationId: 'conv4',
    senderId: mockUsers[6].id,
    sender: mockUsers[6],
    text: 'How about this Saturday afternoon?',
    createdAt: '2024-01-15T09:30:00Z',
    isRead: true,
  },
  {
    id: 'msg17',
    conversationId: 'conv4',
    senderId: mockUsers[0].id,
    sender: mockUsers[0],
    text: 'Perfect! Let us meet at the city park at 3 PM.',
    createdAt: '2024-01-15T10:00:00Z',
    isRead: true,
  },
  {
    id: 'msg18',
    conversationId: 'conv4',
    senderId: mockUsers[1].id,
    sender: mockUsers[1],
    text: "I'll be there! Can't wait to capture some great shots.",
    createdAt: '2024-01-15T10:30:00Z',
    isRead: true,
  },
  {
    id: 'msg19',
    conversationId: 'conv4',
    senderId: mockUsers[0].id,
    sender: mockUsers[0],
    text: 'Here are the photos from our last shoot!',
    createdAt: '2024-01-15T11:00:00Z',
    isRead: true,
  },
];

// Messages for conv6 (Weekend Adventure group chat)
export const mockMessages_conv6: Message[] = [
  {
    id: 'msg20',
    conversationId: 'conv6',
    senderId: mockUsers[1].id,
    sender: mockUsers[1],
    text: 'Guys, I am so excited for our trip! 🎉',
    createdAt: '2024-01-15T08:00:00Z',
    isRead: true,
  },
  {
    id: 'msg21',
    conversationId: 'conv6',
    senderId: mockUsers[2].id,
    sender: mockUsers[2],
    text: 'Same here! Already packed my bags!',
    createdAt: '2024-01-15T08:30:00Z',
    isRead: false,
  },
  {
    id: 'msg22',
    conversationId: 'conv6',
    senderId: mockUsers[4].id,
    sender: mockUsers[4],
    text: 'I am bringing my camera for sure. Will capture everything.',
    createdAt: '2024-01-15T09:00:00Z',
    isRead: false,
  },
  {
    id: 'msg23',
    conversationId: 'conv6',
    senderId: mockUsers[2].id,
    sender: mockUsers[2],
    text: 'Can we push the trip to next weekend?',
    createdAt: '2024-01-15T09:30:00Z',
    isRead: false,
  },
];

// Map for quick message lookup
export const mockMessagesMap: Record<string, Message[]> = {
  conv1: mockMessages_conv1,
  conv2: mockMessages_conv2,
  conv3: mockMessages_conv3,
  conv4: mockMessages_conv4,
  conv6: mockMessages_conv6,
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'like',
    user: mockUsers[7],
    post: mockPosts[6],
    message: 'liked your post',
    createdAt: '2024-01-15T13:00:00Z',
    isRead: false,
  },
  {
    id: 'n2',
    type: 'follow',
    user: mockUsers[5],
    message: 'started following you',
    createdAt: '2024-01-15T12:30:00Z',
    isRead: false,
  },
  {
    id: 'n3',
    type: 'comment',
    user: mockUsers[3],
    post: mockPosts[0],
    comment: {
      id: 'nc1',
      userId: mockUsers[3].id,
      user: mockUsers[3],
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
    user: mockUsers[4],
    post: mockPosts[4],
    message: 'liked your post',
    createdAt: '2024-01-15T10:00:00Z',
    isRead: true,
  },
  {
    id: 'n5',
    type: 'follow',
    user: mockUsers[0],
    message: 'started following you',
    createdAt: '2024-01-14T20:00:00Z',
    isRead: true,
  },
  {
    id: 'n6',
    type: 'mention',
    user: mockUsers[1],
    post: mockPosts[0],
    message: 'mentioned you in a post',
    createdAt: '2024-01-14T18:00:00Z',
    isRead: true,
  },
  {
    id: 'n7',
    type: 'follow',
    user: mockUsers[2],
    message: 'started following you',
    createdAt: '2024-01-14T15:00:00Z',
    isRead: true,
  },
  {
    id: 'n8',
    type: 'like',
    user: mockUsers[6],
    post: mockPosts[7],
    message: 'liked your post',
    createdAt: '2024-01-14T12:00:00Z',
    isRead: true,
  },
  {
    id: 'n9',
    type: 'comment',
    user: mockUsers[7],
    post: mockPosts[4],
    comment: {
      id: 'nc2',
      userId: mockUsers[7].id,
      user: mockUsers[7],
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
    user: mockUsers[0],
    post: mockPosts[3],
    message: 'shared your post with their followers',
    createdAt: '2024-01-13T14:00:00Z',
    isRead: true,
  },
];

// ============================================================
// MUSIC (for Music tab)
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
