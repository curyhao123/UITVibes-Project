import type { Comment as CommentType, Post, User } from "../data/mockData";
import apiClient from "./httpClient";
import {
  BE_PostResponse,
  BE_CommentResponse,
  BE_CommentLikeResponse,
  BE_LikeResponse,
  BE_LikeDto,
  BE_HashtagDto,
  CreatePostBody,
  BE_RepostResponse,
  BE_RepostStatusResponse,
  BE_BookmarkResponse,
} from "./backendTypes";
import { fetchUserById } from "./userService";
import { getCurrentUser } from "./api";
import { getCurrentUserId } from "./session";

// ─── Comment transformer ─────────────────────────────────────────────────────
async function fetchRepliesForComment(
  commentId: string,
): Promise<CommentType[]> {
  try {
    const { data } = await apiClient.get<BE_CommentResponse[]>(
      `/post/comment/${commentId}/replies`,
    );
    if (!data || !Array.isArray(data)) return [];
    return Promise.all(
      data.map(async (r) => {
        const replyUser = await fetchUserById(r.userId);
        const reply = await transformComment(r, replyUser);
        if (r.repliesCount && r.repliesCount > 0) {
          reply.replies = await fetchRepliesForComment(r.id);
        }
        return reply;
      }),
    );
  } catch {
    return [];
  }
}

async function transformComment(
  be: BE_CommentResponse,
  user?: User,
): Promise<CommentType> {
  const resolvedUser = user ||
    (await fetchUserById(be.userId)) || {
      id: be.userId,
      username: "",
      displayName: "",
      avatar: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };

  // Recursively transform nested replies with their own users
  const replies: CommentType[] = be.replies?.length
    ? await Promise.all(be.replies.map((r) => transformComment(r, undefined)))
    : [];

  return {
    id: be.id,
    userId: be.userId,
    user: resolvedUser,
    text: be.isDeleted ? "" : be.content,
    createdAt: be.createdAt,
    likes: be.likesCount,
    isLiked: be.isLikedByCurrentUser,
    replies,
    parentId: be.parentCommentId ?? undefined,
  };
}

export async function uploadMedia(
  uri: string,
  type: "image" | "video" = "image",
): Promise<{
  url: string;
  publicId?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}> {
  if (
    uri.startsWith("https://res.cloudinary.com") ||
    uri.startsWith("https://")
  ) {
    return { url: uri };
  }

  const formData = new FormData();

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    const name =
      uri.split("/").pop() || (type === "video" ? "video.mp4" : "image.jpg");
    const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
    (formData as any).append("File", { uri, type: mimeType, name } as any);
  } else if (
    typeof fetch !== "undefined" &&
    (uri.startsWith("blob:") || uri.startsWith("data:"))
  ) {
    const res = await fetch(uri);
    const blob = await res.blob();
    const mimeType =
      blob.type || (type === "video" ? "video/mp4" : "image/jpeg");
    const ext = mimeType.includes("png")
      ? "png"
      : type === "video"
        ? "mp4"
        : "jpg";
    const name = `upload.${ext}`;
    if (typeof File !== "undefined") {
      (formData as any).append(
        "File",
        new File([blob], name, { type: mimeType }),
      );
    } else {
      (formData as any).append("File", blob as any, name);
    }
  } else {
    throw new Error("Unsupported URI scheme for media upload: " + uri);
  }

  const { data } = await apiClient.post<{
    url: string;
    publicId: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
  }>("/post/media", formData as any, {
    headers: { "Content-Type": "multipart/form-data" } as any,
  });

  return data;
}

function transformBEPost(post: BE_PostResponse, author?: User): Post {
  const allImages = post.media?.map((m) => m.url) ?? [];
  return {
    id: post.id,
    userId: post.userId,
    user: author || {
      id: post.userId,
      username: "",
      fullName: "",
      coverImage: "",
      gender: "",
      displayName: "",
      avatar: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    },
    image: allImages[0] ?? "",
    images: allImages,
    caption: post.content,
    visibility: post.visibility ?? undefined,
    likes: post.likesCount,
    comments: [],
    createdAt: post.createdAt,
    isLiked: post.isLikedByCurrentUser,
    isBookmarked: post.isBookmarkedByCurrentUser,
    shareCount: post.sharesCount || 0,
    views: post.viewsCount || 0,
    location: post.location || undefined,
    tags: post.hashtags || [],
    commentsCount: post.commentsCount ?? 0,
    repostCount: post.repostCount ?? 0,
    isReposted: post.isRepostedByCurrentUser ?? false,
  };
}

export async function getPosts(): Promise<Post[]> {
  const { data } = await apiClient.get<BE_PostResponse[]>("/post/feed", {
    params: { skip: 0, take: 20 },
  });
  const posts = await Promise.all(
    data.map(async (post) => {
      const author = await fetchUserById(post.userId);
      return transformBEPost(post, author);
    }),
  );
  return posts;
}

export async function getTrendingHashtags(
  skip = 0,
  take = 20,
): Promise<BE_HashtagDto[]> {
  const { data } = await apiClient.get<BE_HashtagDto[]>(
    "/post/hashtag/trending",
    { params: { skip, take } },
  );
  return data || [];
}

export async function searchHashtags(
  query: string,
  skip = 0,
  take = 20,
): Promise<BE_HashtagDto[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data } = await apiClient.get<BE_HashtagDto[]>(
    "/post/hashtag/search",
    { params: { q: trimmed, skip, take } },
  );
  return data || [];
}

export async function getPostsByHashtag(
  hashtagName: string,
  skip = 0,
  take = 20,
): Promise<Post[]> {
  const normalized = hashtagName.trim().replace(/^#+/, "");
  if (!normalized) return [];
  const { data } = await apiClient.get<BE_PostResponse[]>(
    `/post/hashtag/${encodeURIComponent(normalized)}/posts`,
    { params: { skip, take } },
  );
  const posts = await Promise.all(
    (data || []).map(async (post) => {
      try {
        const author = await fetchUserById(post.userId);
        return transformBEPost(post, author);
      } catch {
        return transformBEPost(post, undefined);
      }
    }),
  );
  return posts;
}

export async function getPostById(id: string): Promise<Post | undefined> {
  const { data } = await apiClient.get<BE_PostResponse>(`/post/${id}`);
  const author = await fetchUserById(data.userId);

  // Fetch comments separately
  const comments = await getPostComments(id);

  const post = transformBEPost(data, author);
  post.comments = comments;
  return post;
}

export async function getPostLikes(postId: string): Promise<BE_LikeDto[]> {
  const { data } = await apiClient.get<BE_LikeDto[]>(`/post/${postId}/likes`);
  return data;
}

export async function getPostComments(postId: string): Promise<CommentType[]> {
  try {
    const { data } = await apiClient.get<BE_CommentResponse[]>(
      `/post/${postId}/comments`,
    );
    if (!data || !Array.isArray(data)) return [];

    // Fetch top-level comments and their full reply trees in parallel
    const comments = await Promise.all(
      data.map(async (c) => {
        const user = await fetchUserById(c.userId);
        const comment = await transformComment(c, user);

        if (c.repliesCount && c.repliesCount > 0) {
          comment.replies = await fetchRepliesForComment(c.id);
        }

        return comment;
      }),
    );
    return comments;
  } catch (err) {
    console.error("[getPostComments] API error:", err);
    return [];
  }
}

export async function getMyPosts(): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<BE_PostResponse[]>(
      "/post/my-posts",
      {
        params: { skip: 0, take: 50 },
      },
    );
    if (!data || data.length === 0) {
      return [];
    }

    // Xử lý từng post riêng, không throw nếu 1 post lỗi
    const posts: Post[] = [];
    for (const post of data) {
      try {
        const author = await fetchUserById(post.userId);
        posts.push(transformBEPost(post, author));
      } catch (authorError) {
        console.warn(
          "[getMyPosts] Failed to fetch author for post",
          post.id,
          authorError,
        );
        // Vẫn thêm post vào danh sách, author sẽ là empty user
        posts.push(transformBEPost(post, undefined));
      }
    }
    return posts;
  } catch (e: any) {
    console.error(
      "[getMyPosts] FATAL ERROR:",
      e?.response?.status,
      e?.response?.data,
      e?.message,
    );
    throw e;
  }
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<BE_PostResponse[]>(
      `/post/user/${userId}`,
      {
        params: { skip: 0, take: 50 },
      },
    );
    if (!data || !Array.isArray(data)) {
      console.warn("[getUserPosts] Expected array, got:", data);
      return [];
    }
    const posts = await Promise.all(
      data.map(async (post) => {
        try {
          const author = await fetchUserById(post.userId);
          return transformBEPost(post, author);
        } catch {
          return transformBEPost(post, undefined);
        }
      }),
    );
    return posts;
  } catch (err: any) {
    console.error(
      "[getUserPosts] API error:",
      err?.response?.status,
      err?.response?.data,
    );
    return [];
  }
}

export async function getBookmarkedPosts(): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<BE_BookmarkResponse[]>("/post/bookmarks", {
      params: { skip: 0, take: 20 },
    });
    
    const posts = await Promise.all(
      data.map(async (bookmark) => {
        // Backend returns BookmarkDto with nested Post
        const post = bookmark.post;
        if (!post) return null;
        
        const author = await fetchUserById(post.userId);
        return transformBEPost(post, author);
      }),
    );
    
    // Filter out null values (posts without data)
    return posts.filter((p): p is Post => p !== null);
  } catch (error) {
    console.error("[getBookmarkedPosts] Error:", error);
    return [];
  }
}

export async function createPost(
  imageUris: string[],
  caption: string,
  location?: string,
  visibility?: number,
): Promise<Post> {
  // Upload all local media to Cloudinary, keep remote URLs as-is
  const uploadedMedia = await Promise.all(
    imageUris.map(async (uri, index) => {
      const isLocal =
        uri.startsWith("file://") ||
        uri.startsWith("content://") ||
        uri.startsWith("blob:") ||
        uri.startsWith("data:");

      if (!isLocal) {
        return { url: uri, displayOrder: index };
      }

      const uploaded = await uploadMedia(uri, "image");
      return {
        url: uploaded.url,
        publicId: uploaded.publicId,
        thumbnailUrl: uploaded.thumbnailUrl,
        width: uploaded.width,
        height: uploaded.height,
        displayOrder: index,
      };
    }),
  );

  const body: CreatePostBody = {
    content: caption,
    location,
    visibility: visibility ?? 0,
    media: uploadedMedia.map((m) => ({
      type: 0,
      url: m.url,
      publicId: m.publicId,
      thumbnailUrl: m.thumbnailUrl,
      displayOrder: m.displayOrder,
      width: m.width,
      height: m.height,
    })),
  };

  const { data } = await apiClient.post<BE_PostResponse>("/post", body);
  let author = await getCurrentUser();
  if (!author) {
    author = {
      id: getCurrentUserId(),
      username: "",
      displayName: "You",
      fullName: "",
      gender: "",
      avatar: "",
      coverImage: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    };
  }
  return transformBEPost(data, author);
}

export async function updatePost(
  postId: string,
  caption: string,
): Promise<Post | null> {
  const { data } = await apiClient.put<BE_PostResponse>(`/post/${postId}`, {
    content: caption,
    visibility: 0,
  });
  const author = await fetchUserById(data.userId);
  return transformBEPost(data, author);
}

export async function deletePost(postId: string): Promise<boolean> {
  await apiClient.delete(`/post/${postId}`);
  return true;
}

export async function toggleLike(postId: string, isCurrentlyLiked: boolean): Promise<boolean> {
  if (isCurrentlyLiked) {
    await apiClient.delete(`/post/${postId}/like`);
    return false;
  }
  const { data } = await apiClient.post<BE_LikeResponse>(
    `/post/${postId}/like`,
  );
  return data.totalLikes > 0;
}

export async function toggleBookmark(postId: string): Promise<boolean> {
  try {
    await apiClient.post(`/post/${postId}/bookmark`);
    return true;
  } catch (error) {
    console.error("[toggleBookmark] API error:", error);
    return false;
  }
}

export async function removeBookmark(postId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/post/${postId}/bookmark`);
    return true;
  } catch (error) {
    console.error("[removeBookmark] API error:", error);
    return false;
  }
}

export async function addComment(
  postId: string,
  text: string,
  parentCommentId?: string,
): Promise<{ success: boolean; comment?: CommentType }> {
  const body: { content: string; parentCommentId?: string } = { content: text };
  if (parentCommentId) {
    body.parentCommentId = parentCommentId;
  }
  const { data } = await apiClient.post<BE_CommentResponse>(
    `/post/${postId}/comment`,
    body,
  );
  const currentUser = await fetchUserById(data.userId);
  const comment = await transformComment(data, currentUser || undefined);
  return { success: true, comment };
}

export async function deleteComment(
  commentId: string,
): Promise<boolean> {
  try {
    await apiClient.delete(`/post/comment/${commentId}`);
    return true;
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 501) {
      return true;
    }
    throw err;
  }
}

export async function updateComment(
  commentId: string,
  text: string,
): Promise<CommentType | null> {
  try {
    const { data } = await apiClient.put<BE_CommentResponse>(
      `/post/comment/${commentId}`,
      { Content: text },
    );
    const currentUser = await fetchUserById(data.userId);
    return currentUser ? transformComment(data, currentUser) : null;
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 501) {
      return null;
    }
    throw err;
  }
}

export async function toggleCommentLike(commentId: string): Promise<boolean> {
  try {
    await apiClient.post<BE_CommentLikeResponse>(
      `/post/comment/${commentId}/like`,
    );
    return true;
  } catch (err: any) {
    const msg = err?.response?.data?.message || "";
    if (
      msg === "Comment already liked" ||
      msg.toLowerCase().includes("already liked")
    ) {
      await apiClient.delete(`/post/comment/${commentId}/like`);
      return false;
    }
    throw err;
  }
}

// ─── Repost functions ──────────────────────────────────────────────────────────

export async function repostPost(postId: string): Promise<Post> {
  const { data } = await apiClient.post<BE_RepostResponse>(
    `/post/${postId}/repost`,
  );
  // Reload bài gốc để lấy fresh RepostCount (luôn dùng originalPostId)
  const post = await getPostById(data.originalPostId);
  return post!;
}

export async function undoRepost(postId: string): Promise<Post> {
  await apiClient.delete(`/post/${postId}/repost`);
  const post = await getPostById(postId);
  return post!;
}

export async function getRepostStatus(
  postId: string,
): Promise<BE_RepostStatusResponse> {
  const { data } = await apiClient.get<BE_RepostStatusResponse>(
    `/post/${postId}/repost/status`,
  );
  return data;
}

export async function getUserReposts(
  userId: string,
  skip = 0,
  take = 20,
): Promise<Post[]> {
  const { data } = await apiClient.get<BE_PostResponse[]>(
    `/post/${userId}/reposts`,
    { params: { skip, take } },
  );
  if (!data || !Array.isArray(data)) return [];
  const posts = await Promise.all(
    data.map(async (post) => {
      try {
        const author = await fetchUserById(post.userId);
        return transformBEPost(post, author);
      } catch {
        return transformBEPost(post, undefined);
      }
    }),
  );
  return posts;
}

// ─── Reels ─────────────────────────────────────────────────────────────────────

export interface ReelUploadResult {
  videoUrl: string;
  videoPublicId: string;
  thumbnailUrl?: string;
  thumbnailPublicId?: string;
  duration: number;
}

export async function uploadReelVideo(
  uri: string,
): Promise<ReelUploadResult> {
  const formData = new FormData();

  let fileUri = uri;
  let fileName = "video.mp4";
  let mimeType = "video/mp4";

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    fileName = uri.split("/").pop() || "video.mp4";
    mimeType = "video/mp4";
  } else if (uri.startsWith("blob:") || uri.startsWith("data:")) {
    const res = await fetch(uri);
    const blob = await res.blob();
    mimeType = blob.type || "video/mp4";
    fileName = "video.mp4";
    if (typeof File !== "undefined") {
      formData.append("File", new File([blob], fileName, { type: mimeType }));
    } else {
      formData.append("File", blob as any, fileName);
    }
    fileUri = "";
  } else if (!uri.startsWith("https://")) {
    fileName = uri.split("/").pop() || "video.mp4";
    mimeType = "video/mp4";
  } else {
    // Already uploaded URL, return as-is
    return { videoUrl: uri, videoPublicId: "", duration: 0 };
  }

  if (fileUri) {
    (formData as any).append("File", {
      uri: fileUri,
      type: mimeType,
      name: fileName,
    } as any);
  }

  const { data } = await apiClient.post<{
    videoUrl: string;
    videoPublicId: string;
    thumbnailUrl?: string;
    thumbnailPublicId?: string;
    duration: number;
  }>("/post/reel/uploadvideo", formData, {
    headers: { "Content-Type": "multipart/form-data" } as any,
  });

  return data;
}

export interface CreateReelBody {
  videoUrl: string;
  videoPublicId: string;
  thumbnailUrl?: string;
  thumbnailPublicId?: string;
  caption?: string;
  duration: number;
}

export interface BE_ReelResponse {
  id: string;
  userId: string;
  ownerDisplayName: string;
  ownerAvatarUrl?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  isLiked: boolean;
  isOwner: boolean;
  createdAt: string;
}

export interface Reel {
  id: string;
  userId: string;
  ownerDisplayName: string;
  ownerAvatarUrl?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  duration: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  isLiked: boolean;
  isOwner: boolean;
  createdAt: string;
}

export async function createReel(
  videoUri: string,
  caption: string,
  duration?: number,
): Promise<Reel> {
  // Upload video first
  const uploadResult = await uploadReelVideo(videoUri);

  const body: CreateReelBody = {
    videoUrl: uploadResult.videoUrl,
    videoPublicId: uploadResult.videoPublicId,
    thumbnailUrl: uploadResult.thumbnailUrl,
    thumbnailPublicId: uploadResult.thumbnailPublicId,
    caption,
    duration: duration ?? uploadResult.duration,
  };

  const { data } = await apiClient.post<BE_ReelResponse>("/post/reel", body);
  return data;
}

// ─── Get Reel Feed ────────────────────────────────────────────────────────────

export async function getReels(skip = 0, take = 20): Promise<Reel[]> {
  try {
    const { data } = await apiClient.get<BE_ReelResponse[]>("/post/reel", {
      params: { skip, take },
    });
    if (!data || !Array.isArray(data)) return [];
    return data;
  } catch (error) {
    console.error("[getReels] API error:", error);
    return [];
  }
}

// ─── Get Single Reel ─────────────────────────────────────────────────────────

export async function getReelById(id: string): Promise<Reel | undefined> {
  try {
    const { data } = await apiClient.get<BE_ReelResponse>(`/post/reel/${id}`);
    return data;
  } catch (error) {
    console.error("[getReelById] API error:", error);
    return undefined;
  }
}

// ─── Toggle Reel Like ────────────────────────────────────────────────────────

export async function toggleReelLike(reelId: string, isCurrentlyLiked: boolean): Promise<boolean> {
  try {
    if (isCurrentlyLiked) {
      await apiClient.post(`/post/reel/${reelId}/unlike`);
      return false;
    }
    await apiClient.post(`/post/reel/${reelId}/like`);
    return true;
  } catch (error) {
    console.error("[toggleReelLike] API error:", error);
    return isCurrentlyLiked;
  }
}

// ─── Toggle Reel Bookmark ───────────────────────────────────────────────────

export async function toggleReelBookmark(reelId: string): Promise<boolean> {
  try {
    await apiClient.post(`/post/reel/${reelId}/bookmark`);
    return true;
  } catch (error) {
    console.error("[toggleReelBookmark] API error:", error);
    return false;
  }
}

// ─── Get Reel Comments ───────────────────────────────────────────────────────

export interface BE_ReelCommentResponse {
  id: string;
  reelId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  content: string;
  likeCount: number;
  isLiked: boolean;
  isOwner: boolean;
  replyCount?: number;
  parentCommentId?: string;
  createdAt: string;
  updatedAt?: string;
}

async function transformReelComment(
  be: BE_ReelCommentResponse,
): Promise<CommentType> {
  const resolvedUser: User = {
    id: be.userId,
    username: be.userDisplayName?.toLowerCase().replace(/\s+/g, '_') || 'user',
    displayName: be.userDisplayName || 'User',
    fullName: be.userDisplayName || 'User',
    avatar: be.userAvatarUrl || '',
    coverImage: '',
    bio: '',
    gender: '',
    followers: 0,
    following: 0,
    posts: 0,
    isVerified: false,
    isFollowing: false,
  };

  return {
    id: be.id,
    userId: be.userId,
    user: resolvedUser,
    text: be.content,
    createdAt: be.createdAt,
    likes: be.likeCount,
    isLiked: be.isLiked,
    replies: [],
    parentId: be.parentCommentId,
  };
}

async function fetchRepliesForReelComment(commentId: string): Promise<CommentType[]> {
  const { data } = await apiClient.get<BE_ReelCommentResponse[]>(
    `/post/reel/comment/${commentId}/replies`,
  );

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return Promise.all(data.map((reply) => transformReelComment(reply)));
}

export async function getReelComments(reelId: string): Promise<CommentType[]> {
  try {
    const { data } = await apiClient.get<BE_ReelCommentResponse[]>(
      `/post/reel/${reelId}/comments`,
    );
    if (!data || !Array.isArray(data)) return [];

    const comments = await Promise.all(
      data.map(async (c) => {
        const comment = await transformReelComment(c);
        if (c.replyCount && c.replyCount > 0) {
          comment.replies = await fetchRepliesForReelComment(c.id);
        }
        return comment;
      }),
    );
    return comments;
  } catch (error) {
    console.error("[getReelComments] API error:", error);
    return [];
  }
}

// ─── Add Reel Comment ───────────────────────────────────────────────────────

export async function addReelComment(
  reelId: string,
  text: string,
  parentCommentId?: string,
): Promise<{ success: boolean; comment?: CommentType }> {
  try {
    const body: { content: string; parentCommentId?: string } = { content: text };
    if (parentCommentId) {
      body.parentCommentId = parentCommentId;
    }
    const { data } = await apiClient.post<BE_ReelCommentResponse>(
      `/post/reel/${reelId}/comment`,
      body,
    );
    const comment = await transformReelComment(data);
    return { success: true, comment };
  } catch (error) {
    console.error("[addReelComment] API error:", error);
    return { success: false };
  }
}

// ─── Delete Reel Comment ─────────────────────────────────────────────────────

export async function deleteReelComment(commentId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/post/reel/comment/${commentId}`);
    return true;
  } catch (error) {
    console.error("[deleteReelComment] API error:", error);
    return false;
  }
}

// ─── Toggle Reel Comment Like ─────────────────────────────────────────────────

export async function toggleReelCommentLike(
  commentId: string,
  isCurrentlyLiked: boolean,
): Promise<boolean> {
  try {
    if (isCurrentlyLiked) {
      await apiClient.post(`/post/reel/comment/${commentId}/unlike`);
      return false;
    }
    await apiClient.post(`/post/reel/comment/${commentId}/like`);
    return true;
  } catch (error) {
    console.error("[toggleReelCommentLike] API error:", error);
    return isCurrentlyLiked;
  }
}

// ─── Get My Reels ────────────────────────────────────────────────────────────

export async function getMyReels(): Promise<Reel[]> {
  try {
    const { data } = await apiClient.get<BE_ReelResponse[]>("/post/reel/my-reels", {
      params: { skip: 0, take: 50 },
    });
    if (!data || !Array.isArray(data)) return [];
    return data;
  } catch (error) {
    console.error("[getMyReels] API error:", error);
    return [];
  }
}

// ─── Delete Reel ─────────────────────────────────────────────────────────────

export async function deleteReel(reelId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/post/reel/${reelId}`);
    return true;
  } catch (error) {
    console.error("[deleteReel] API error:", error);
    return false;
  }
}
