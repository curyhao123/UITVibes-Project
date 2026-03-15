import axios from 'axios';
import {
  mockPosts,
  mockUsers,
  mockStories,
  mockReels,
  currentUser,
  Post,
  User,
  Story,
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

export const getPosts = async (): Promise<Post[]> => {
  await delay(300);
  return [...mockPosts];
};

export const getPostById = async (id: string): Promise<Post | undefined> => {
  await delay(200);
  return mockPosts.find((post) => post.id === id);
};

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
    return mockPosts.slice(0, 3);
  }
  return mockPosts.filter((post) => post.userId === userId);
};

export const getStories = async (): Promise<Story[]> => {
  await delay(300);
  return [...mockStories];
};

export const getReels = async () => {
  await delay(300);
  return [...mockReels];
};

export const getCurrentUser = async (): Promise<User> => {
  await delay(200);
  return currentUser;
};

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
    };
    post.comments.push(newComment);
    return { success: true };
  }
  return { success: false };
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
  };
  mockPosts.unshift(newPost);
  return newPost;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default api;
