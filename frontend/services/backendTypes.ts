// Shared backend DTO types used by multiple service modules

export interface BE_RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface BE_LoginRequest {
  email: string;
  password: string;
}

export interface BE_AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface BE_UserProfile {
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

/** BE có thể trả camelCase hoặc PascalCase tùy cấu hình JSON */
export function normalizeAvatarUrlFromProfile(profile: BE_UserProfile): string {
  const raw = profile as unknown as Record<string, unknown>;
  const v = profile.avatarUrl ?? raw.avatarUrl ?? raw.AvatarUrl;
  return typeof v === "string" ? v.trim() : "";
}

export function normalizeCoverUrlFromProfile(profile: BE_UserProfile): string {
  const raw = profile as unknown as Record<string, unknown>;
  const v = profile.coverImageUrl ?? raw.coverImageUrl ?? raw.CoverImageUrl;
  return typeof v === "string" ? v.trim() : "";
}

/** PUT /user/userprofile/me — body matches UpdateProfileRequest (camelCase JSON) */
export interface BE_UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  dateOfBirth?: string | null;
  location?: string;
  website?: string;
}

/** PUT /user/userprofile/me/bio */
export interface BE_UpdateBioRequest {
  bio?: string | null;
}

export interface BE_FollowStats {
  userId: string;
  displayName: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isFollowedBy: boolean;
}

export interface BE_PostResponse {
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

export interface BE_CommentResponse {
  id: string;
  userId: string;
  content: string;
  likesCount: number;
  isLikedByCurrentUser: boolean;
  createdAt: string;
  replies: BE_CommentResponse[];
  parentId: string | null;
}

export interface BE_ConversationResponse {
  id: string;
  type: "Private" | "Group";
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

export interface BE_MessageResponse {
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

export interface BE_LikeResponse {
  likeId: string;
  postId: string;
  userId: string;
  totalLikes: number;
  createdAt: string;
}

export interface CreatePostBody {
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

// ============ STORY TYPES ============

export interface BE_StoryMediaUploadResponse {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  type: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface BE_StoryFeedItem {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  expiresAt: string;
  isViewed: boolean;
  previewUrl: string;
  totalItems: number;
  createdAt: string;
}

export interface BE_CreateStoryRequest {
  ownerDisplayName: string;
  ownerAvatarUrl: string;
  media: Array<{
    type: number;
    url: string;
    publicId?: string;
    thumbnailUrl?: string;
    displayOrder?: number;
    duration?: number;
  }>;
}
