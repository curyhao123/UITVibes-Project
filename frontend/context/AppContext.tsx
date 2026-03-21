import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Post, Story } from '../data/mockData';
import * as api from '../services/api';

interface AppContextType {
  currentUser: User | null;
  posts: Post[];
  stories: Story[];
  isLoading: boolean;
  refreshPosts: () => Promise<void>;
  refreshStories: () => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  createPost: (image: string, caption: string) => Promise<Post | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPosts = async () => {
    try {
      const data = await api.getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const refreshStories = async () => {
    try {
      const data = await api.getStories();
      setStories(data);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      await api.toggleLike(postId);
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            };
          }
          return post;
        })
      );
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const addComment = async (postId: string, text: string) => {
    try {
      const result = await api.addComment(postId, text);
      if (result.success) {
        await refreshPosts();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const createPost = async (image: string, caption: string): Promise<Post | null> => {
    try {
      const newPost = await api.createPost(image, caption);
      setPosts((prevPosts) => [newPost, ...prevPosts]);
      return newPost;
    } catch (error) {
      console.error('Failed to create post:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const user = await api.getCurrentUser();
        setCurrentUser(user);
        await refreshPosts();
        await refreshStories();
      } catch (error) {
        console.error('Failed to initialize data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        posts,
        stories,
        isLoading,
        refreshPosts,
        refreshStories,
        toggleLike,
        addComment,
        createPost,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
