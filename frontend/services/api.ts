import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  User,
  Post,
  Story,
  Conversation,
  Message,
  Notification,
  Reel,
  Track,
  MusicArtist,
} from '../data/mockData';

// ─────────────────────────────────────────────────────────────────
// MOCK DATA (giữ nguyên để fallback / demo)
// ─────────────────────────────────────────────────────────────────
import {
  mockPosts,
  mockActiveUserPosts,
  mockUsers,
  mockStories,
  mockReels,
  mockNewUser,
  mockConversations,
  mockMessagesMap,
  mockNotifications,
  mockTracks,
  mockMusicArtists,
  activeUserFollowingIds,
} from '../data/mockData';
import type { Comment as CommentType } from '../data/mockData';

export const DEMO_ACCOUNTS = {
  newUser: {
    email: 'new@uitvibes.com',
    password: 'demo1234',
    label: 'New Account',
    description: 'Fresh start — no posts, no friends',
    user: mockNewUser,
  },
  activeUser: {
    email: 'active@uitvibes.com',
    password: 'demo1234',
    label: 'Active Account',
    description: 'Full data — posts, stories, friends',
    user: {} as User,
  },
};

let _currentAccount: 'newUser' | 'activeUser' = 'activeUser';
let _currentUserId: string = 'current';
let _currentUser: User | null = null;
let _userCache: Map<string, User> = new Map(); // cache user để tránh N+1

// ─────────────────────────────────────────────────────────────────
// API BASE URL
// - Set EXPO_PUBLIC_API_URL for production or a fixed LAN IP.
// - In dev, Android emulator cannot use localhost (use 10.0.2.2).
// - Expo Go / physical device: prefer Metro host so the phone reaches your PC.
// ─────────────────────────────────────────────────────────────────
const DEFAULT_API_PORT = 8080;

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:${DEFAULT_API_PORT}`;
      }
    }
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

const API_BASE_URL = resolveApiBaseUrl();

// ─────────────────────────────────────────────────────────────────
// TOKEN STORAGE KEYS
// ─────────────────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = '@uitvibes_access_token';
const REFRESH_TOKEN_KEY = '@uitvibes_refresh_token';
/** UserService không trả username; lưu handle user chọn ở onboarding (và đồng bộ sau login). */
const LOCAL_HANDLE_KEY = '@uitvibes_local_username_handle';

type LocalHandlePayload = { userId: string; username: string };

async function readLocalHandle(userId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_HANDLE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalHandlePayload;
    return p.userId === userId && p.username?.trim() ? p.username.trim() : null;
  } catch {
    return null;
  }
}

async function writeLocalHandle(userId: string, username: string): Promise<void> {
  const t = username.trim();
  if (!userId || !t) return;
  await AsyncStorage.setItem(LOCAL_HANDLE_KEY, JSON.stringify({ userId, username: t }));
}

async function clearLocalHandle(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_HANDLE_KEY);
}

/** BE profile DTO không có username — gắn lại từ session / storage. */
async function applyLocalUsernameToUser(user: User): Promise<User> {
  const fromDto = user.username?.trim();
  if (fromDto) return user;
  const fromSession =
    _currentUser?.id === user.id ? _currentUser.username?.trim() || '' : '';
  const fromStore = (await readLocalHandle(user.id)) || '';
  const u = fromSession || fromStore;
  return u ? { ...user, username: u } : user;
}

/**
 * Gọi từ onboarding (hoặc chỗ khác) để profile hiển thị đúng @username user nhập.
 */
export function patchCurrentUserLocal(updates: { username?: string; displayName?: string }): void {
  if (!_currentUser) return;
  let next: User = { ..._currentUser };
  if (updates.username != null) {
    const t = updates.username.trim();
    if (t) {
      next = { ...next, username: t };
      void writeLocalHandle(next.id, t);
    }
  }
  if (updates.displayName != null) {
    const t = updates.displayName.trim();
    if (t) next = { ...next, displayName: t };
  }
  _currentUser = next;
}

// ─────────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// ─────────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─────────────────────────────────────────────────────────────────
// TOKEN HELPERS
// ─────────────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function getRefreshTokenFromStorage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

async function clearTokens(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ─────────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR — tự động gắn JWT
// ─────────────────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR — xử lý 401 → refresh token
// ─────────────────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getRefreshTokenFromStorage();
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
          await saveTokens(data.accessToken, data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        await clearTokens();
      }
    }

    // Avoid console.error here — it triggers React Native LogBox red screen for
    // routine "Network Error" when BE is down or URL is wrong; callers use mock fallback.
    if (__DEV__) {
      const status = error.response?.status;
      const detail = error.response?.data ?? error.message;
      if (status != null) {
        console.warn(`[API] ${status}`, detail);
      } else {
        console.warn(
          `[API] ${error.message} — base: ${API_BASE_URL} (set EXPO_PUBLIC_API_URL if needed)`
        );
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────
// MOCK HELPERS
// ─────────────────────────────────────────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMockMode(): boolean {
  return !_currentUserId || _currentUserId === 'current';
}

// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// FE → BE FIELD MAPPING
// ─────────────────────────────────────────────────────────────────
//
// FE uses:    id (string), user (embedded User object), posts (count)
// BE returns: id (Guid), UserProfile + separate stats, posts from PostService
//
// Post mapping:
//   FE: { id, userId, user: User, image, caption, likes, isLiked, isBookmarked, comments }
//   BE: { id, userId, author (no User obj), media: [{url, type}], content, likesCount, isLikedByCurrentUser, comments: [...] }
//
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// FE → BE User mapping (đẩy data lên BE)
// ─────────────────────────────────────────────────────────────────
interface BE_RegisterRequest {
  email: string;
  username: string;
  password: string;
}

interface BE_LoginRequest {
  email: string;
  password: string;
}

interface BE_AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

interface BE_UserProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverImageUrl: string;
  dateOfBirth: string | null;
  location: string;
  website: string;
  socialLinks: Array<{ platform: string; url: string }>;
}

interface BE_FollowStats {
  userId: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

interface BE_PostResponse {
  id: string;
  userId: string;
  content: string;
  visibility: string;
  location: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  media: Array<{
    id: string;
    type: string;
    url: string;
    thumbnailUrl: string | null;
    displayOrder: number;
    width: number | null;
    height: number | null;
    duration: number | null;
  }>;
  hashtags: string[];
  isLikedByCurrentUser: boolean;
  isBookmarkedByCurrentUser: boolean;
  originalPost: BE_PostResponse | null;
}

interface BE_CommentResponse {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  createdAt: string;
  replies: BE_CommentResponse[];
  parentId: string | null;
}

interface BE_ConversationResponse {
  id: string;
  type: 'Private' | 'Group';
  name: string;
  avatarUrl: string;
  members: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  }>;
  lastMessageContent: string;
  lastMessageSenderId: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isMuted: boolean;
  isPinned: boolean;
  adminIds: string[];
}

interface BE_MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  mediaUrl: string;
  fileName: string;
  fileSize: number;
  replyToMessageId: string;
  replyToMessage: BE_MessageResponse | null;
  isEdited: boolean;
  isDeleted: boolean;
  readBy: Array<{ userId: string; readAt: string }>;
  createdAt: string;
  editedAt: string;
}

interface BE_LikeResponse {
  likeId: string;
  postId: string;
  userId: string;
  totalLikes: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────
// TRANSFORM: BE → FE (map dữ liệu từ backend về đúng FE shape)
// ─────────────────────────────────────────────────────────────────

function transformBEUserProfile(profile: BE_UserProfile, stats: BE_FollowStats): User {
  return {
    id: profile.userId,
    username: '', // BE không trả username trong UserProfile
    displayName: profile.displayName,
    avatar: profile.avatarUrl || '',
    bio: profile.bio || '',
    website: profile.website || undefined,
    followers: stats.followersCount,
    following: stats.followingCount,
    posts: stats.postsCount,
    isVerified: false,
  };
}

async function fetchUserById(id: string): Promise<User> {
  const cached = _userCache.get(id);
  if (cached) return cached;
  try {
    const { data } = await apiClient.get<BE_UserProfile>(`/user/userprofile/${id}`);
    const statsRes = await apiClient.get<BE_FollowStats>(`/user/follow/${id}/stats`);
    const user = transformBEUserProfile(data, statsRes.data);
    _userCache.set(id, user);
    return user;
  } catch {
    return {
      id,
      username: '',
      displayName: 'User',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };
  }
}

function transformBEPost(post: BE_PostResponse, author?: User): Post {
  return {
    id: post.id,
    userId: post.userId,
    user: author || {
      id: post.userId,
      username: '',
      displayName: '',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    },
    image: post.media?.[0]?.url || '',
    caption: post.content,
    likes: post.likesCount,
    comments: [],
    createdAt: post.createdAt,
    isLiked: post.isLikedByCurrentUser,
    isBookmarked: post.isBookmarkedByCurrentUser,
    shareCount: post.sharesCount || 0,
    views: post.viewsCount || 0,
    location: post.location || undefined,
    tags: post.hashtags || [],
  };
}

// Chỉ BE → FE cho FE user object (khi login/register)
function transformBEUser(b: BE_AuthResponse['user'] & { profile?: BE_UserProfile; stats?: BE_FollowStats }): User {
  const profile = b.profile;
  const stats = b.stats;
  return {
    id: b.id,
    username: b.username,
    displayName: profile?.displayName || b.username,
    avatar: profile?.avatarUrl || '',
    bio: profile?.bio || '',
    website: profile?.website || undefined,
    followers: stats?.followersCount ?? 0,
    following: stats?.followingCount ?? 0,
    posts: stats?.postsCount ?? 0,
    isVerified: false,
  };
}

// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<User> {
  const body: BE_LoginRequest = { email, password };

  try {
    const { data } = await apiClient.post<BE_AuthResponse>('/auth/login', body);
    await saveTokens(data.accessToken, data.refreshToken);

    // Lấy user profile + stats song song
    const [profileRes, statsRes] = await Promise.allSettled([
      apiClient.get<BE_UserProfile>('/user/userprofile/me'),
      apiClient.get<BE_FollowStats>('/user/follow/me/stats'),
    ]);

    const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
    const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : null;

    const user: User = {
      id: data.user.id,
      username: data.user.username,
      displayName: profile?.displayName || data.user.username,
      avatar: profile?.avatarUrl || '',
      bio: profile?.bio || '',
      website: profile?.website || undefined,
      followers: stats?.followersCount ?? 0,
      following: stats?.followingCount ?? 0,
      posts: stats?.postsCount ?? 0,
      isVerified: false,
    };

    _currentUserId = data.user.id;
    _currentUser = user;
    if (user.username) void writeLocalHandle(user.id, user.username);
    return user;
  } catch {
    // Fallback mock nếu backend không chạy
    await delay(800);
    const normalized = email.trim().toLowerCase();
    if (normalized === 'new@uitvibes.com') {
      _currentAccount = 'newUser';
      _currentUserId = 'current';
      return mockNewUser;
    }
    _currentAccount = 'activeUser';
    _currentUserId = 'current';
    _currentUser = {} as User;
    // Trả về mock nhưng đánh dấu là dùng mock
    return {
      id: 'current',
      username: 'anhvu',
      displayName: 'Anh Vu',
      avatar: 'https://i.pravatar.cc/150?img=33',
      bio: 'Software engineer 💻',
      followers: 1240,
      following: 380,
      posts: 45,
      isVerified: false,
    };
  }
}

export async function register(email: string, password: string, username: string): Promise<User> {
  const body: BE_RegisterRequest = { email, username, password };

  try {
    const { data } = await apiClient.post<BE_AuthResponse>('/auth/register', body);
    await saveTokens(data.accessToken, data.refreshToken);

    const user: User = {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.username,
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };

    _currentUserId = data.user.id;
    _currentUser = user;
    if (user.username) void writeLocalHandle(user.id, user.username);
    return user;
  } catch {
    await delay(800);
    const newUser: User = {
      id: `user_${Date.now()}`,
      username,
      displayName: username,
      avatar: 'https://i.pravatar.cc/150?img=47',
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };
    _currentUserId = newUser.id;
    _currentUser = newUser;
    if (newUser.username) void writeLocalHandle(newUser.id, newUser.username);
    return newUser;
  }
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = await getRefreshTokenFromStorage();
    if (refreshToken) {
      await apiClient.post('/auth/revoke', { refreshToken });
    }
  } catch {
    // ignore revoke errors
  } finally {
    await clearTokens();
    await clearLocalHandle();
    _currentUserId = 'current';
    _currentUser = null;
  }
}

export async function refreshSession(): Promise<User | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const [profileRes, statsRes] = await Promise.allSettled([
      apiClient.get<BE_UserProfile>('/user/userprofile/me'),
      apiClient.get<BE_FollowStats>('/user/follow/me/stats'),
    ]);

    const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
    const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : null;

    if (!profile) return null;

    let user: User = {
      id: profile.userId,
      username: '',
      displayName: profile.displayName,
      avatar: profile.avatarUrl || '',
      bio: profile.bio || '',
      website: profile.website || undefined,
      followers: stats?.followersCount ?? 0,
      following: stats?.followingCount ?? 0,
      posts: stats?.postsCount ?? 0,
      isVerified: false,
    };

    user = await applyLocalUsernameToUser(user);
    _currentUserId = user.id;
    _currentUser = user;
    return user;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// SUGGESTED USERS
// ─────────────────────────────────────────────────────────────────
export async function getSuggestedUsers(): Promise<User[]> {
  try {
    const { data } = await apiClient.get<{ users: BE_UserProfile[] }>('/user/suggested', {
      params: { limit: 6 },
    });
    return data.users.map((p) => ({
      id: p.userId,
      username: '',
      displayName: p.displayName,
      avatar: p.avatarUrl || '',
      bio: p.bio || '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(400);
    const followedIds = activeUserFollowingIds;
    return mockUsers
      .filter((user) => !followedIds.has(user.id))
      .slice(0, 6);
  }
}

// ─────────────────────────────────────────────────────────────────
// POSTS
// ─────────────────────────────────────────────────────────────────
export async function getPosts(): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<BE_PostResponse[]>('/post/feed', {
      params: { skip: 0, take: 20 },
    });
    // Resolve author cho mỗi post để hiển thị tên/avatar đúng
    const posts = await Promise.all(
      data.map(async (post) => {
        const author = await fetchUserById(post.userId);
        return transformBEPost(post, author);
      })
    );
    return posts;
  } catch {
    await delay(300);
    if (_currentAccount === 'newUser') return [];
    return [...mockPosts];
  }
}

export async function getPostById(id: string): Promise<Post | undefined> {
  try {
    const { data } = await apiClient.get<BE_PostResponse>(`/post/${id}`);
    const author = await fetchUserById(data.userId);
    return transformBEPost(data, author);
  } catch {
    await delay(200);
    return mockPosts.find((post) => post.id === id);
  }
}

interface CreatePostBody {
  content: string;
  location?: string;
  visibility?: number;
  media?: Array<{
    type: number;
    url: string;
    publicId?: string;
    thumbnailUrl?: string;
    displayOrder?: number;
    width?: number;
    height?: number;
  }>;
}

export async function createPost(
  image: string,
  caption: string,
  location?: string
): Promise<Post> {
  const body: CreatePostBody = {
    content: caption,
    location,
    visibility: 0, // Public
    media: [
      {
        type: 0, // Image
        url: image,
        displayOrder: 0,
      },
    ],
  };

  try {
    const { data } = await apiClient.post<BE_PostResponse>('/post', body);
    const author = _currentUser || {
      id: _currentUserId,
      username: '',
      displayName: 'You',
      avatar: '',
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };
    return transformBEPost(data, author);
  } catch {
    await delay(500);
    const newPost: Post = {
      id: `post${Date.now()}`,
      userId: _currentUserId,
      user: _currentUser || ({
        id: _currentUserId,
        username: '',
        displayName: 'You',
        avatar: '',
        bio: '',
        followers: 0,
        following: 0,
        posts: 0,
        isVerified: false,
      } as User),
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
  }
}

export async function updatePost(postId: string, caption: string): Promise<Post | null> {
  try {
    const { data } = await apiClient.put<BE_PostResponse>(`/post/${postId}`, {
      content: caption,
      visibility: 0,
    });
    const author = await fetchUserById(data.userId);
    return transformBEPost(data, author);
  } catch {
    await delay(300);
    const post = mockPosts.find((p) => p.id === postId);
    if (post) {
      post.caption = caption;
      return post;
    }
    return null;
  }
}

export async function deletePost(postId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/post/${postId}`);
    return true;
  } catch {
    await delay(300);
    const index = mockPosts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      mockPosts.splice(index, 1);
      return true;
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// LIKE / BOOKMARK
// ─────────────────────────────────────────────────────────────────
export async function toggleLike(postId: string): Promise<boolean> {
  try {
    const { data } = await apiClient.post<BE_LikeResponse>(`/post/${postId}/like`);
    return data.totalLikes > 0;
  } catch {
    await delay(100);
    const post = mockPosts.find((p) => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes += post.isLiked ? 1 : -1;
      return post.isLiked;
    }
    return false;
  }
}

export async function toggleBookmark(postId: string): Promise<boolean> {
  try {
    await apiClient.post(`/post/${postId}/bookmark`);
    return true;
  } catch {
    await delay(100);
    const post = mockPosts.find((p) => p.id === postId);
    if (post) {
      post.isBookmarked = !post.isBookmarked;
      return post.isBookmarked;
    }
    return false;
  }
}

export async function getBookmarkedPosts(): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<BE_PostResponse[]>('/post/bookmarks', {
      params: { skip: 0, take: 20 },
    });
    const posts = await Promise.all(
      data.map(async (post) => {
        const author = await fetchUserById(post.userId);
        return transformBEPost(post, author);
      })
    );
    return posts;
  } catch {
    await delay(300);
    return mockPosts.filter((p) => p.isBookmarked);
  }
}

// ─────────────────────────────────────────────────────────────────
// COMMENTS
// ─────────────────────────────────────────────────────────────────
export async function addComment(
  postId: string,
  text: string
): Promise<{ success: boolean; comment?: CommentType }> {
  try {
    const { data } = await apiClient.post<BE_CommentResponse>(
      `/post/${postId}/comment`,
      { content: text }
    );
    const comment: CommentType = {
      id: data.id,
      userId: data.userId,
      user: _currentUser || ({ id: _currentUserId } as User),
      text: data.content,
      createdAt: data.createdAt,
      likes: data.likesCount,
      isLiked: data.isLikedByCurrentUser,
    };
    return { success: true, comment };
  } catch {
    await delay(300);
    const post = mockPosts.find((p) => p.id === postId);
    if (post) {
      const newComment: CommentType = {
        id: `c${Date.now()}`,
        userId: _currentUserId,
        user: _currentUser || ({ id: _currentUserId } as User),
        text,
        createdAt: new Date().toISOString(),
        likes: 0,
        isLiked: false,
      };
      post.comments.push(newComment);
      return { success: true, comment: newComment };
    }
    return { success: false };
  }
}

export async function deleteComment(
  postId: string,
  commentId: string
): Promise<boolean> {
  try {
    await apiClient.delete(`/post/${postId}/comment/${commentId}`);
    return true;
  } catch {
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
  }
}

export async function toggleCommentLike(
  postId: string,
  commentId: string
): Promise<boolean> {
  try {
    await apiClient.post(`/post/${postId}/comment/${commentId}/like`);
    return true;
  } catch {
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
  }
}

// ─────────────────────────────────────────────────────────────────
// USERS / FOLLOW
// ─────────────────────────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  try {
    const { data } = await apiClient.get<BE_UserProfile[]>('/user/search', {
      params: { limit: 20 },
    });
    return data.map((p) => ({
      id: p.userId,
      username: '',
      displayName: p.displayName,
      avatar: p.avatarUrl || '',
      bio: p.bio || '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    return [...mockUsers];
  }
}

export async function searchUsers(query: string): Promise<User[]> {
  try {
    const { data } = await apiClient.get<BE_UserProfile[]>('/user/search', {
      params: { q: query, limit: 20 },
    });
    return data.map((p) => ({
      id: p.userId,
      username: '',
      displayName: p.displayName,
      avatar: p.avatarUrl || '',
      bio: p.bio || '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return mockUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(lowerQuery) ||
        user.displayName.toLowerCase().includes(lowerQuery)
    );
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  try {
    if (id === _currentUserId || id === 'current') {
      const { data } = await apiClient.get<BE_UserProfile>('/user/userprofile/me');
      const statsRes = await apiClient.get<BE_FollowStats>(
        `/user/follow/${data.userId}/stats`
      );
      return transformBEUserProfile(data, statsRes.data);
    }
    const { data } = await apiClient.get<BE_UserProfile>(`/user/userprofile/${id}`);
    const statsRes = await apiClient.get<BE_FollowStats>(`/user/follow/${id}/stats`);
    return transformBEUserProfile(data, statsRes.data);
  } catch {
    await delay(200);
    if (id === 'current') return _currentUser || ({
      id: 'current',
      username: 'anhvu',
      displayName: 'Anh Vu',
      avatar: 'https://i.pravatar.cc/150?img=33',
      bio: 'Software engineer 💻',
      followers: 1240,
      following: 380,
      posts: 45,
      isVerified: false,
    } as User);
    return mockUsers.find((user) => user.id === id);
  }
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
    const targetId = userId === 'current' ? _currentUserId : userId;
    const { data } = await apiClient.get<BE_PostResponse[]>(`/post/user/${targetId}`, {
      params: { skip: 0, take: 20 },
    });
    const posts = await Promise.all(
      data.map(async (post) => {
        const author = await fetchUserById(post.userId);
        return transformBEPost(post, author);
      })
    );
    return posts;
  } catch {
    await delay(300);
    if (userId === 'current') return [...mockActiveUserPosts];
    return mockPosts.filter((p) => p.userId === userId);
  }
}

export async function getCurrentUser(): Promise<User> {
  if (_currentUser) return _currentUser;
  return {
    id: 'current',
    username: 'anhvu',
    displayName: 'Anh Vu',
    avatar: 'https://i.pravatar.cc/150?img=33',
    bio: 'Software engineer 💻',
    followers: 1240,
    following: 380,
    posts: 45,
    isVerified: false,
  };
}

// Follow / Unfollow
export async function followUser(userId: string): Promise<boolean> {
  try {
    await apiClient.post(`/user/follow/${userId}`);
    return true;
  } catch {
    await delay(300);
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      if (!activeUserFollowingIds.has(userId)) {
        activeUserFollowingIds.add(userId);
        user.isFollowing = true;
        user.followers += 1;
      }
      return true;
    }
    return false;
  }
}

export async function unfollowUser(userId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/user/follow/${userId}`);
    return true;
  } catch {
    await delay(300);
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      if (activeUserFollowingIds.has(userId)) {
        activeUserFollowingIds.delete(userId);
        user.isFollowing = false;
        user.followers = Math.max(0, user.followers - 1);
      }
      return true;
    }
    return false;
  }
}

export async function toggleFollow(userId: string): Promise<boolean> {
  try {
    const isCurrentlyFollowing = activeUserFollowingIds.has(userId);
    if (isCurrentlyFollowing) {
      await apiClient.delete(`/user/follow/${userId}`);
    } else {
      await apiClient.post(`/user/follow/${userId}`);
    }
    return !isCurrentlyFollowing;
  } catch {
    await delay(200);
    const user = mockUsers.find((u) => u.id === userId);
    if (!user) return false;

    if (activeUserFollowingIds.has(userId)) {
      activeUserFollowingIds.delete(userId);
      user.isFollowing = false;
      user.followers = Math.max(0, user.followers - 1);
      return false;
    } else {
      activeUserFollowingIds.add(userId);
      user.isFollowing = true;
      user.followers += 1;
      return true;
    }
  }
}

export function isFollowing(userId: string): boolean {
  return activeUserFollowingIds.has(userId);
}

export async function getFollowers(userId: string): Promise<User[]> {
  try {
    const targetId = userId === 'current' ? _currentUserId : userId;
    const { data } = await apiClient.get<BE_UserProfile[]>(
      `/user/follow/${targetId}/followers`,
      { params: { skip: 0, take: 20 } }
    );
    return data.map((p) => ({
      id: p.userId,
      username: '',
      displayName: p.displayName,
      avatar: p.avatarUrl || '',
      bio: p.bio || '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    return mockUsers.slice(0, 5);
  }
}

export async function getFollowing(userId: string): Promise<User[]> {
  try {
    const targetId = userId === 'current' ? _currentUserId : userId;
    const { data } = await apiClient.get<BE_UserProfile[]>(
      `/user/follow/${targetId}/following`,
      { params: { skip: 0, take: 20 } }
    );
    return data.map((p) => ({
      id: p.userId,
      username: '',
      displayName: p.displayName,
      avatar: p.avatarUrl || '',
      bio: p.bio || '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    }));
  } catch {
    await delay(300);
    return mockUsers.filter((u) => activeUserFollowingIds.has(u.id));
  }
}

// ─────────────────────────────────────────────────────────────────
// PROFILE EDITING
// ─────────────────────────────────────────────────────────────────
export async function updateProfile(updates: {
  displayName?: string;
  bio?: string;
  website?: string;
}): Promise<User> {
  try {
    const body: Record<string, string> = {};
    if (updates.displayName !== undefined) body.displayName = updates.displayName;
    if (updates.bio !== undefined) body.bio = updates.bio;
    if (updates.website !== undefined) body.website = updates.website;

    const { data } = await apiClient.put<BE_UserProfile>('/user/userprofile/me', body);
    const statsRes = await apiClient.get<BE_FollowStats>(`/user/follow/${data.userId}/stats`);

    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    _currentUser = user;
    return user;
  } catch {
    await delay(400);
    if (_currentUser) {
      if (updates.displayName !== undefined) _currentUser.displayName = updates.displayName;
      if (updates.bio !== undefined) _currentUser.bio = updates.bio;
      if (updates.website !== undefined) _currentUser.website = updates.website;
    }
    return _currentUser || ({} as User);
  }
}

export async function updateAvatar(avatarUri: string): Promise<User> {
  try {
    const { data } = await apiClient.put<BE_UserProfile>('/user/userprofile/me/avatar', {
      avatarUrl: avatarUri,
    });
    const statsRes = await apiClient.get<BE_FollowStats>(`/user/follow/${data.userId}/stats`);
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    _currentUser = user;
    return user;
  } catch {
    await delay(500);
    if (_currentUser) _currentUser.avatar = avatarUri;
    return _currentUser || ({} as User);
  }
}

export async function updateCover(coverUri: string): Promise<User> {
  try {
    const { data } = await apiClient.put<BE_UserProfile>('/user/userprofile/me/cover', {
      coverImageUrl: coverUri,
    });
    const statsRes = await apiClient.get<BE_FollowStats>(`/user/follow/${data.userId}/stats`);
    let user = transformBEUserProfile(data, statsRes.data);
    user = await applyLocalUsernameToUser(user);
    _currentUser = user;
    return user;
  } catch {
    await delay(500);
    return _currentUser || ({} as User);
  }
}

// ─────────────────────────────────────────────────────────────────
// STORIES
// ─────────────────────────────────────────────────────────────────
export async function getStories(): Promise<Story[]> {
  try {
    const { data } = await apiClient.get<Array<{
      id: string;
      userId: string;
      displayName: string;
      avatarUrl: string;
      mediaUrls: string[];
      isViewed: boolean;
    }>>('/story/active', { params: { limit: 20 } });

    return data.map((s) => ({
      id: s.id,
      user: {
        id: s.userId,
        username: '',
        displayName: s.displayName,
        avatar: s.avatarUrl || '',
        bio: '',
        followers: 0,
        following: 0,
        posts: 0,
        isVerified: false,
      },
      isViewed: s.isViewed,
      images: s.mediaUrls,
    }));
  } catch {
    await delay(300);
    if (_currentAccount === 'newUser') return [];
    return [...mockStories];
  }
}

export async function markStoryViewed(storyId: string): Promise<void> {
  try {
    await apiClient.post(`/story/${storyId}/view`);
  } catch {
    await delay(100);
    const story = mockStories.find((s) => s.id === storyId);
    if (story) story.isViewed = true;
  }
}

// ─────────────────────────────────────────────────────────────────
// REELS (FE không có BE endpoint — fallback mock)
// ─────────────────────────────────────────────────────────────────
export async function getReels(): Promise<Reel[]> {
  await delay(300);
  return [...mockReels];
}

export async function toggleReelLike(reelId: string): Promise<boolean> {
  await delay(100);
  const reel = mockReels.find((r) => r.id === reelId);
  if (reel) {
    reel.isLiked = !reel.isLiked;
    reel.likes += reel.isLiked ? 1 : -1;
    return reel.isLiked;
  }
  return false;
}

export async function toggleReelBookmark(reelId: string): Promise<boolean> {
  await delay(100);
  const reel = mockReels.find((r) => r.id === reelId);
  if (reel) {
    reel.isBookmarked = !reel.isBookmarked;
    return reel.isBookmarked;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────
// CONVERSATIONS & MESSAGES
// ─────────────────────────────────────────────────────────────────
function transformBEConversation(c: BE_ConversationResponse): Conversation {
  return {
    id: c.id,
    type: c.type === 'Private' ? 'private' : 'group',
    name: c.name,
    avatar: c.avatarUrl,
    members: c.members.map((m) => ({
      id: m.id,
      username: m.username,
      displayName: m.displayName,
      avatar: m.avatarUrl,
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    })),
    lastMessage: c.lastMessageContent
      ? {
          id: '',
          conversationId: c.id,
          senderId: c.lastMessageSenderId,
          sender: {} as User,
          text: c.lastMessageContent,
          createdAt: c.lastMessageAt,
          isRead: false,
        }
      : undefined,
    unreadCount: c.unreadCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isGroup: c.type === 'Group',
    isMuted: c.isMuted,
    isPinned: c.isPinned,
    adminIds: c.adminIds,
  };
}

function transformBEMessage(m: BE_MessageResponse): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    sender: { id: m.senderId } as User,
    text: m.isDeleted ? '' : m.content,
    image: m.mediaUrl || undefined,
    createdAt: m.createdAt,
    isRead: m.readBy.length > 0,
    editedAt: m.isEdited ? m.editedAt : undefined,
  };
}

export async function getConversations(): Promise<Conversation[]> {
  try {
    const { data } = await apiClient.get<BE_ConversationResponse[]>('/message/conversations', {
      params: { skip: 0, take: 20 },
    });
    return data.map(transformBEConversation);
  } catch {
    await delay(300);
    if (_currentAccount === 'newUser') return [];
    return [...mockConversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}

export async function getConversationById(
  id: string
): Promise<Conversation | undefined> {
  try {
    const { data } = await apiClient.get<BE_ConversationResponse>(
      `/message/conversation/${id}`
    );
    return transformBEConversation(data);
  } catch {
    await delay(200);
    return mockConversations.find((c) => c.id === id);
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data } = await apiClient.get<BE_MessageResponse[]>(
      `/message/conversation/${conversationId}/messages`,
      { params: { skip: 0, take: 50 } }
    );
    return data.map(transformBEMessage);
  } catch {
    await delay(300);
    return mockMessagesMap[conversationId] || [];
  }
}

export async function sendMessage(
  conversationId: string,
  text: string
): Promise<Message> {
  try {
    const { data } = await apiClient.post<BE_MessageResponse>(
      `/message/conversation/${conversationId}/send`,
      { content: text, type: 0 }
    );
    return transformBEMessage(data);
  } catch {
    await delay(200);
    const newMessage: Message = {
      id: `msg${Date.now()}`,
      conversationId,
      senderId: _currentUserId,
      sender: _currentUser || ({} as User),
      text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    if (!mockMessagesMap[conversationId]) {
      mockMessagesMap[conversationId] = [];
    }
    mockMessagesMap[conversationId].push(newMessage);

    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.lastMessage = newMessage;
      conv.updatedAt = newMessage.createdAt;
    }

    return newMessage;
  }
}

export async function deleteMessage(
  conversationId: string,
  messageId: string
): Promise<boolean> {
  try {
    await apiClient.delete(`/message/conversation/${conversationId}/message/${messageId}`);
    return true;
  } catch {
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
  }
}

export async function markMessagesRead(conversationId: string): Promise<void> {
  try {
    await apiClient.post(`/message/conversation/${conversationId}/read`, {});
  } catch {
    await delay(100);
    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    const messages = mockMessagesMap[conversationId];
    if (messages) {
      messages.forEach((m) => {
        if (m.senderId !== _currentUserId) m.isRead = true;
      });
    }
  }
}

export async function createConversation(userId: string): Promise<Conversation> {
  try {
    const { data } = await apiClient.post<BE_ConversationResponse>(
      '/message/conversation',
      { participantId: userId }
    );
    return transformBEConversation(data);
  } catch {
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
      members: [(_currentUser || { id: _currentUserId } as User), user],
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockConversations.push(newConv);
    return newConv;
  }
}

// ─────────────────────────────────────────────────────────────────
// NOTIFICATIONS (FE không có notification service — fallback mock)
// ─────────────────────────────────────────────────────────────────
export async function getNotifications(): Promise<Notification[]> {
  await delay(300);
  if (_currentAccount === 'newUser') return [];
  return [...mockNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await delay(100);
  const notif = mockNotifications.find((n) => n.id === notificationId);
  if (notif) notif.isRead = true;
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(200);
  mockNotifications.forEach((n) => { n.isRead = true; });
}

export async function getUnreadNotificationCount(): Promise<number> {
  await delay(100);
  return mockNotifications.filter((n) => !n.isRead).length;
}

// ─────────────────────────────────────────────────────────────────
// MUSIC (FE không có music service — fallback mock)
// ─────────────────────────────────────────────────────────────────
export async function getTracks(): Promise<Track[]> {
  await delay(300);
  return [...mockTracks];
}

export async function toggleTrackLike(trackId: string): Promise<boolean> {
  await delay(100);
  const track = mockTracks.find((t) => t.id === trackId);
  if (track) {
    track.isLiked = !track.isLiked;
    track.likes += track.isLiked ? 1 : -1;
    return track.isLiked;
  }
  return false;
}

export async function getMusicArtists(): Promise<MusicArtist[]> {
  await delay(300);
  return [...mockMusicArtists];
}

export async function toggleMusicArtistFollow(artistId: string): Promise<boolean> {
  await delay(200);
  const artist = mockMusicArtists.find((a) => a.id === artistId);
  if (artist) {
    artist.isFollowing = !artist.isFollowing;
    return artist.isFollowing;
  }
  return false;
}

export default apiClient;
