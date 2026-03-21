export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  isVerified: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  user: User;
  text: string;
  createdAt: string;
  likes: number;
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
}

export interface Story {
  id: string;
  user: User;
  isViewed: boolean;
  images: string[];
}

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'johndoe',
    displayName: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Photography enthusiast 📸',
    followers: 1250,
    following: 380,
    posts: 45,
    isVerified: false,
  },
  {
    id: '2',
    username: 'janedoe',
    displayName: 'Jane Doe',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: 'Travel lover ✈️',
    followers: 3500,
    following: 420,
    posts: 78,
    isVerified: true,
  },
  {
    id: '3',
    username: 'alex_smith',
    displayName: 'Alex Smith',
    avatar: 'https://i.pravatar.cc/150?img=3',
    bio: 'Foodie 🍕',
    followers: 890,
    following: 250,
    posts: 32,
    isVerified: false,
  },
  {
    id: '4',
    username: 'sarah_jones',
    displayName: 'Sarah Jones',
    avatar: 'https://i.pravatar.cc/150?img=9',
    bio: 'Fitness coach 💪',
    followers: 5200,
    following: 180,
    posts: 156,
    isVerified: true,
  },
  {
    id: '5',
    username: 'mikebrown',
    displayName: 'Mike Brown',
    avatar: 'https://i.pravatar.cc/150?img=11',
    bio: 'Music producer 🎵',
    followers: 2100,
    following: 310,
    posts: 67,
    isVerified: false,
  },
  {
    id: '6',
    username: 'emily_white',
    displayName: 'Emily White',
    avatar: 'https://i.pravatar.cc/150?img=16',
    bio: 'Artist 🎨',
    followers: 7800,
    following: 450,
    posts: 234,
    isVerified: true,
  },
  {
    id: '7',
    username: 'david_lee',
    displayName: 'David Lee',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Tech geek 💻',
    followers: 1560,
    following: 290,
    posts: 89,
    isVerified: false,
  },
  {
    id: '8',
    username: 'lisa_chen',
    displayName: 'Lisa Chen',
    avatar: 'https://i.pravatar.cc/150?img=20',
    bio: 'Fashion blogger 👗',
    followers: 9800,
    following: 520,
    posts: 312,
    isVerified: true,
  },
];

export const currentUser: User = {
  id: 'current',
  username: 'myusername',
  displayName: 'My Username',
  avatar: 'https://i.pravatar.cc/150?img=33',
  bio: 'Welcome to my profile! 👋',
  followers: 500,
  following: 200,
  posts: 25,
  isVerified: false,
};

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
      },
      {
        id: 'c2',
        userId: '4',
        user: mockUsers[3],
        text: 'Wish I was there!',
        createdAt: '2024-01-15T11:00:00Z',
        likes: 5,
      },
    ],
    createdAt: '2024-01-15T09:00:00Z',
    isLiked: false,
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
      },
    ],
    createdAt: '2024-01-14T17:00:00Z',
    isLiked: true,
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
      },
      {
        id: 'c5',
        userId: '7',
        user: mockUsers[6],
        text: 'What time do you workout?',
        createdAt: '2024-01-14T09:15:00Z',
        likes: 3,
      },
    ],
    createdAt: '2024-01-14T07:00:00Z',
    isLiked: false,
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
      },
    ],
    createdAt: '2024-01-13T14:00:00Z',
    isLiked: true,
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
      },
      {
        id: 'c8',
        userId: '2',
        user: mockUsers[1],
        text: 'What monitor is that?',
        createdAt: '2024-01-12T17:30:00Z',
        likes: 8,
      },
    ],
    createdAt: '2024-01-12T15:00:00Z',
    isLiked: false,
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
      },
    ],
    createdAt: '2024-01-11T10:00:00Z',
    isLiked: false,
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
  },
];

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

export const mockReels = [
  {
    id: 'r1',
    user: mockUsers[1],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    caption: 'Sunset vibes 🌅',
    likes: 4500,
    comments: 234,
    isLiked: false,
  },
  {
    id: 'r2',
    user: mockUsers[3],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    caption: 'Workout tips 💪',
    likes: 3200,
    comments: 156,
    isLiked: true,
  },
  {
    id: 'r3',
    user: mockUsers[5],
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    caption: 'Art process 🎨',
    likes: 8900,
    comments: 456,
    isLiked: false,
  },
];
