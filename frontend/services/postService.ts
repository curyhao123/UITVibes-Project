import type { Comment as CommentType, Post, User } from "../data/mockData";
import apiClient from "./httpClient";
import { getCurrentUser, getCurrentUserId } from "./session";
import {
  BE_PostResponse,
  BE_CommentResponse,
  BE_LikeResponse,
  CreatePostBody,
} from "./backendTypes";
import { fetchUserById } from "./userService";

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
  return transformBEPost(data, author);
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
): Promise<{ success: boolean; comment?: CommentType }> {
  const { data } = await apiClient.post<BE_CommentResponse>(
    `/post/${postId}/comment`,
    { content: text },
  );
  const comment: CommentType = {
    id: data.id,
    userId: data.userId,
    user: getCurrentUser() || ({ id: getCurrentUserId() } as User),
    text: data.content,
    createdAt: data.createdAt,
    likes: data.likesCount,
    isLiked: data.isLikedByCurrentUser,
  };
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
