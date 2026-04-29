import type { Comment as CommentType, Post, User } from "../data/mockData";
import apiClient from "./httpClient";
import {
  BE_PostResponse,
  BE_CommentResponse,
  BE_LikeResponse,
  CreatePostBody,
} from "./backendTypes";
import { fetchUserById } from "./userService";

// ─── Comment transformer ─────────────────────────────────────────────────────
async function fetchRepliesForComment(commentId: string): Promise<CommentType[]> {
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

async function transformComment(be: BE_CommentResponse, user?: User): Promise<CommentType> {
  const resolvedUser = user || (await fetchUserById(be.userId)) || {
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
    text: be.content,
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
  if (uri.startsWith("https://res.cloudinary.com") || uri.startsWith("https://")) {
    return { url: uri };
  }

  const formData = new FormData();

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    const name = uri.split("/").pop() || (type === "video" ? "video.mp4" : "image.jpg");
    const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
    (formData as any).append("File", { uri, type: mimeType, name } as any);
  } else if (typeof fetch !== "undefined" && (uri.startsWith("blob:") || uri.startsWith("data:"))) {
    const res = await fetch(uri);
    const blob = await res.blob();
    const mimeType = blob.type || (type === "video" ? "video/mp4" : "image/jpeg");
    const ext = mimeType.includes("png") ? "png" : type === "video" ? "mp4" : "jpg";
    const name = `upload.${ext}`;
    if (typeof File !== "undefined") {
      (formData as any).append("File", new File([blob], name, { type: mimeType }));
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
  console.log("[transformBEPost] post.id:", post.id, "media:", JSON.stringify(post.media));
  return {
    id: post.id,
    userId: post.userId,
    user: author || {
      id: post.userId,
      username: "",
      displayName: "",
      avatar: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    },
    image: post.media?.[0]?.url || "",
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
    commentsCount: post.commentsCount ?? 0,
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

export async function getPostById(id: string): Promise<Post | undefined> {
  const { data } = await apiClient.get<BE_PostResponse>(`/post/${id}`);
  const author = await fetchUserById(data.userId);

  // Fetch comments separately
  const comments = await getPostComments(id);

  const post = transformBEPost(data, author);
  post.comments = comments;
  return post;
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
    const { data, status } = await apiClient.get<BE_PostResponse[]>("/post/my-posts", {
      params: { skip: 0, take: 50 },
    });
    console.log("[getMyPosts] status:", status, "data length:", data?.length, "data:", JSON.stringify(data));
    
    if (!data || data.length === 0) {
      console.log("[getMyPosts] No posts returned from API");
      return [];
    }
    
    // Xử lý từng post riêng, không throw nếu 1 post lỗi
    const posts: Post[] = [];
    for (const post of data) {
      try {
        const author = await fetchUserById(post.userId);
        posts.push(transformBEPost(post, author));
      } catch (authorError) {
        console.warn("[getMyPosts] Failed to fetch author for post", post.id, authorError);
        // Vẫn thêm post vào danh sách, author sẽ là empty user
        posts.push(transformBEPost(post, undefined));
      }
    }
    console.log("[getMyPosts] Transformed posts:", posts.length, "posts");
    return posts;
  } catch (e: any) {
    console.error("[getMyPosts] FATAL ERROR:", e?.response?.status, e?.response?.data, e?.message);
    throw e;
  }
}

export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
    const { data } = await apiClient.get<BE_PostResponse[]>(`/post/user/${userId}`, {
      params: { skip: 0, take: 50 },
    });
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
    console.error("[getUserPosts] API error:", err?.response?.status, err?.response?.data);
    return [];
  }
}

export async function getBookmarkedPosts(): Promise<Post[]> {
  const { data } = await apiClient.get<BE_PostResponse[]>("/post/bookmarks", {
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

export async function createPost(
  imageUri: string,
  caption: string,
  location?: string,
): Promise<Post> {
  const isLocal =
    imageUri.startsWith("file://") ||
    imageUri.startsWith("content://") ||
    imageUri.startsWith("blob:") ||
    imageUri.startsWith("data:");

  let mediaUrl = imageUri;
  let publicId: string | undefined;
  let thumbnailUrl: string | undefined;
  let width: number | undefined;
  let height: number | undefined;

  if (isLocal) {
    const uploaded = await uploadMedia(imageUri, "image");
    mediaUrl = uploaded.url;
    publicId = uploaded.publicId;
    thumbnailUrl = uploaded.thumbnailUrl;
    width = uploaded.width;
    height = uploaded.height;
  }

  const body: CreatePostBody = {
    content: caption,
    location,
    visibility: 0,
    media: [
      {
        type: 0,
        url: mediaUrl,
        publicId,
        thumbnailUrl,
        displayOrder: 0,
        width,
        height,
      },
    ],
  };

  const { data } = await apiClient.post<BE_PostResponse>("/post", body);
  const author =
    getCurrentUser() ||
    ({
      id: getCurrentUserId(),
      username: "",
      displayName: "You",
      fullName: "",
      gender: "",
      avatar: "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    } as User);
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

export async function toggleLike(postId: string): Promise<boolean> {
  const { data } = await apiClient.post<BE_LikeResponse>(`/post/${postId}/like`);
  return data.totalLikes > 0;
}

export async function toggleBookmark(postId: string): Promise<boolean> {
  await apiClient.post(`/post/${postId}/bookmark`);
  return true;
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
  postId: string,
  commentId: string,
): Promise<boolean> {
  await apiClient.delete(`/post/${postId}/comment/${commentId}`);
  return true;
}

export async function toggleCommentLike(
  postId: string,
  commentId: string,
): Promise<boolean> {
  await apiClient.post(`/post/${postId}/comment/${commentId}/like`);
  return true;
}
