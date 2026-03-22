import axios from 'axios';
import {
  mockPosts,
  mockUsers,
  mockStories,
  mockReels,
  currentUser,
  mockConversations,
  mockMessagesMap,
  mockNotifications,
  mockTracks,
  mockMusicArtists,
  currentUserFollowingIds,
  Post,
  User,
  Story,
  Conversation,
  Message,
  Notification,
  Reel,
  Track,
  MusicArtist,
} from '../data/mockData';

const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// POSTS
// ============================================================

export const getPosts = async (): Promise<Post[]> => {
  await delay(300);
  return [...mockPosts];
};

export const getPostById = async (id: string): Promise<Post | undefined> => {
  await delay(200);
  return mockPosts.find((post) => post.id === id);
};

export const createPost = async (
  image: string,
  caption: string
): Promise<Post> => {
  await delay(500);
  const newPost: Post = {
    id: `post${Date.now()}`,
    userId: 'current',
    user: currentUser,
    image,
    caption,
    likes: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    isLiked: false,
    isBookmarked: false,
    shareCount: 0,
    views: 0,
  };
  mockPosts.unshift(newPost);
  return newPost;
};

export const updatePost = async (
  postId: string,
  caption: string
): Promise<Post | null> => {
  await delay(300);
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    post.caption = caption;
    return post;
  }
  return null;
};

export const deletePost = async (postId: string): Promise<boolean> => {
  await delay(300);
  const index = mockPosts.findIndex((p) => p.id === postId);
  if (index !== -1) {
    mockPosts.splice(index, 1);
    return true;
  }
  return false;
};

// ============================================================
// LIKE / BOOKMARK
// ============================================================

export const toggleLike = async (postId: string): Promise<boolean> => {
  await delay(100);
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
    return post.isLiked;
  }
  return false;
};

export const toggleBookmark = async (postId: string): Promise<boolean> => {
  await delay(100);
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    post.isBookmarked = !post.isBookmarked;
    return post.isBookmarked;
  }
  return false;
};

export const getBookmarkedPosts = async (): Promise<Post[]> => {
  await delay(300);
  return mockPosts.filter((p) => p.isBookmarked);
};

// ============================================================
// COMMENTS
// ============================================================

export const addComment = async (
  postId: string,
  text: string
): Promise<{ success: boolean }> => {
  await delay(300);
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    const newComment = {
      id: `c${Date.now()}`,
      userId: 'current',
      user: currentUser,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false,
    };
    post.comments.push(newComment);
    return { success: true };
  }
  return { success: false };
};

export const deleteComment = async (
  postId: string,
  commentId: string
): Promise<boolean> => {
  await delay(200);
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    const idx = post.comments.findIndex((c) => c.id === commentId);
    if (idx !== -1) {
      post.comments.splice(idx, 1);
      return true;
    }
  }
  return false;
};

export const toggleCommentLike = async (
  postId: string,
  commentId: string
): Promise<boolean> => {
  await delay(100);
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    const comment = post.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.isLiked = !comment.isLiked;
      comment.likes += comment.isLiked ? 1 : -1;
      return comment.isLiked;
    }
  }
  return false;
};

// ============================================================
// USERS / FOLLOW
// ============================================================

export const getUsers = async (): Promise<User[]> => {
  await delay(300);
  return [...mockUsers];
};

export const searchUsers = async (query: string): Promise<User[]> => {
  await delay(300);
  const lowerQuery = query.toLowerCase();
  return mockUsers.filter(
    (user) =>
      user.username.toLowerCase().includes(lowerQuery) ||
      user.displayName.toLowerCase().includes(lowerQuery)
  );
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  await delay(200);
  if (id === 'current') return currentUser;
  return mockUsers.find((user) => user.id === id);
};

export const getUserPosts = async (userId: string): Promise<Post[]> => {
  await delay(300);
  if (userId === 'current') {
    return mockPosts.filter((p) => p.userId === 'current');
  }
  return mockPosts.filter((p) => p.userId === userId);
};

export const getCurrentUser = async (): Promise<User> => {
  await delay(200);
  return currentUser;
};

// Follow / Unfollow
export const followUser = async (userId: string): Promise<boolean> => {
  await delay(300);
  const user = mockUsers.find((u) => u.id === userId);
  if (user) {
    if (!currentUserFollowingIds.has(userId)) {
      currentUserFollowingIds.add(userId);
      user.isFollowing = true;
      user.followers += 1;
      currentUser.following += 1;
    }
    return true;
  }
  return false;
};

export const unfollowUser = async (userId: string): Promise<boolean> => {
  await delay(300);
  const user = mockUsers.find((u) => u.id === userId);
  if (user) {
    if (currentUserFollowingIds.has(userId)) {
      currentUserFollowingIds.delete(userId);
      user.isFollowing = false;
      user.followers = Math.max(0, user.followers - 1);
      currentUser.following = Math.max(0, currentUser.following - 1);
    }
    return true;
  }
  return false;
};

export const toggleFollow = async (userId: string): Promise<boolean> => {
  await delay(200);
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return false;

  if (currentUserFollowingIds.has(userId)) {
    currentUserFollowingIds.delete(userId);
    user.isFollowing = false;
    user.followers = Math.max(0, user.followers - 1);
    currentUser.following = Math.max(0, currentUser.following - 1);
    return false;
  } else {
    currentUserFollowingIds.add(userId);
    user.isFollowing = true;
    user.followers += 1;
    currentUser.following += 1;
    return true;
  }
};

export const isFollowing = (userId: string): boolean => {
  return currentUserFollowingIds.has(userId);
};

export const getFollowers = async (userId: string): Promise<User[]> => {
  await delay(300);
  // Return users who follow this user (mock: return first 5 users)
  return mockUsers.slice(0, 5);
};

export const getFollowing = async (userId: string): Promise<User[]> => {
  await delay(300);
  // Return users that this user follows
  return mockUsers.filter((u) => currentUserFollowingIds.has(u.id));
};

// ============================================================
// PROFILE EDITING
// ============================================================

export const updateProfile = async (updates: {
  displayName?: string;
  bio?: string;
  website?: string;
}): Promise<User> => {
  await delay(400);
  if (updates.displayName !== undefined) currentUser.displayName = updates.displayName;
  if (updates.bio !== undefined) currentUser.bio = updates.bio;
  if (updates.website !== undefined) currentUser.website = updates.website;
  return currentUser;
};

export const updateAvatar = async (avatarUri: string): Promise<User> => {
  await delay(500);
  currentUser.avatar = avatarUri;
  return currentUser;
};

export const updateCover = async (coverUri: string): Promise<User> => {
  await delay(500);
  // We'll add a cover property to currentUser
  (currentUser as any).cover = coverUri;
  return currentUser;
};

// ============================================================
// STORIES
// ============================================================

export const getStories = async (): Promise<Story[]> => {
  await delay(300);
  return [...mockStories];
};

export const markStoryViewed = async (storyId: string): Promise<void> => {
  await delay(100);
  const story = mockStories.find((s) => s.id === storyId);
  if (story) {
    story.isViewed = true;
  }
};

// ============================================================
// REELS
// ============================================================

export const getReels = async (): Promise<Reel[]> => {
  await delay(300);
  return [...mockReels];
};

export const toggleReelLike = async (reelId: string): Promise<boolean> => {
  await delay(100);
  const reel = mockReels.find((r) => r.id === reelId);
  if (reel) {
    reel.isLiked = !reel.isLiked;
    reel.likes += reel.isLiked ? 1 : -1;
    return reel.isLiked;
  }
  return false;
};

export const toggleReelBookmark = async (reelId: string): Promise<boolean> => {
  await delay(100);
  const reel = mockReels.find((r) => r.id === reelId);
  if (reel) {
    reel.isBookmarked = !reel.isBookmarked;
    return reel.isBookmarked;
  }
  return false;
};

// ============================================================
// CONVERSATIONS & MESSAGES
// ============================================================

export const getConversations = async (): Promise<Conversation[]> => {
  await delay(300);
  return [...mockConversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
};

export const getConversationById = async (
  id: string
): Promise<Conversation | undefined> => {
  await delay(200);
  return mockConversations.find((c) => c.id === id);
};

export const getMessages = async (
  conversationId: string
): Promise<Message[]> => {
  await delay(300);
  return mockMessagesMap[conversationId] || [];
};

export const sendMessage = async (
  conversationId: string,
  text: string
): Promise<Message> => {
  await delay(200);
  const newMessage: Message = {
    id: `msg${Date.now()}`,
    conversationId,
    senderId: 'current',
    sender: currentUser,
    text,
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  if (!mockMessagesMap[conversationId]) {
    mockMessagesMap[conversationId] = [];
  }
  mockMessagesMap[conversationId].push(newMessage);

  // Update conversation lastMessage
  const conv = mockConversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastMessage = newMessage;
    conv.updatedAt = newMessage.createdAt;
  }

  return newMessage;
};

export const deleteMessage = async (
  conversationId: string,
  messageId: string
): Promise<boolean> => {
  await delay(200);
  const messages = mockMessagesMap[conversationId];
  if (messages) {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      messages.splice(idx, 1);
      return true;
    }
  }
  return false;
};

export const markMessagesRead = async (
  conversationId: string
): Promise<void> => {
  await delay(100);
  const conv = mockConversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.unreadCount = 0;
  }
  const messages = mockMessagesMap[conversationId];
  if (messages) {
    messages.forEach((m) => {
      if (m.senderId !== 'current') {
        m.isRead = true;
      }
    });
  }
};

export const createConversation = async (
  userId: string
): Promise<Conversation> => {
  await delay(300);
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) throw new Error('User not found');

  const existing = mockConversations.find(
    (c) => !c.isGroup && c.members.some((m) => m.id === userId)
  );
  if (existing) return existing;

  const newConv: Conversation = {
    id: `conv${Date.now()}`,
    type: 'private',
    members: [currentUser, user],
    unreadCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockConversations.push(newConv);
  return newConv;
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const getNotifications = async (): Promise<Notification[]> => {
  await delay(300);
  return [...mockNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await delay(100);
  const notif = mockNotifications.find((n) => n.id === notificationId);
  if (notif) {
    notif.isRead = true;
  }
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await delay(200);
  mockNotifications.forEach((n) => {
    n.isRead = true;
  });
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  await delay(100);
  return mockNotifications.filter((n) => !n.isRead).length;
};

// ============================================================
// MUSIC
// ============================================================

export const getTracks = async (): Promise<Track[]> => {
  await delay(300);
  return [...mockTracks];
};

export const toggleTrackLike = async (trackId: string): Promise<boolean> => {
  await delay(100);
  const track = mockTracks.find((t) => t.id === trackId);
  if (track) {
    track.isLiked = !track.isLiked;
    track.likes += track.isLiked ? 1 : -1;
    return track.isLiked;
  }
  return false;
};

export const getMusicArtists = async (): Promise<MusicArtist[]> => {
  await delay(300);
  return [...mockMusicArtists];
};

export const toggleMusicArtistFollow = async (
  artistId: string
): Promise<boolean> => {
  await delay(200);
  const artist = mockMusicArtists.find((a) => a.id === artistId);
  if (artist) {
    artist.isFollowing = !artist.isFollowing;
    return artist.isFollowing;
  }
  return false;
};

export default api;
