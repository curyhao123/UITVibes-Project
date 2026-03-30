import type { Comment as CommentType, Post, User } from "../data/mockData";
import { mockPosts } from "../data/mockData";
import apiClient, { delay } from "./httpClient";
import { getCurrentAccount, getCurrentUser, getCurrentUserId } from "./session";
import {
  BE_PostResponse,
  BE_CommentResponse,
  BE_LikeResponse,
  CreatePostBody,
} from "./backendTypes";
import { fetchUserById } from "./userService";

function transformBEPost(post: BE_PostResponse, author?: User): Post {
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
  try {
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
  } catch {
    await delay(300);
    if (getCurrentAccount() === "newUser") return [];
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

export async function createPost(
  image: string,
  caption: string,
  location?: string,
): Promise<Post> {
  const body: CreatePostBody = {
    content: caption,
    location,
    visibility: 0,
    media: [
      {
        type: 0,
        url: image,
        displayOrder: 0,
      },
    ],
  };

  try {
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
  } catch {
    await delay(500);
    const newPost: Post = {
      id: `post${Date.now()}`,
      userId: getCurrentUserId(),
      user:
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

export async function updatePost(
  postId: string,
  caption: string,
): Promise<Post | null> {
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

export async function toggleLike(postId: string): Promise<boolean> {
  try {
    const { data } = await apiClient.post<BE_LikeResponse>(
      `/post/${postId}/like`,
    );
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
  } catch {
    await delay(300);
    return mockPosts.filter((p) => p.isBookmarked);
  }
}

export async function addComment(
  postId: string,
  text: string,
): Promise<{ success: boolean; comment?: CommentType }> {
  try {
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
  } catch {
    await delay(300);
    const post = mockPosts.find((p) => p.id === postId);
    if (post) {
      const newComment: CommentType = {
        id: `c${Date.now()}`,
        userId: getCurrentUserId(),
        user: getCurrentUser() || ({ id: getCurrentUserId() } as User),
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
  commentId: string,
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
  commentId: string,
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
