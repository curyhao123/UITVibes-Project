import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  User,
  Post,
  Story,
  Conversation,
  Message,
  Notification,
} from '../data/mockData';
import * as api from '../services/api';

interface AppContextType {
  // Auth / User
  currentUser: User | null;
  isLoading: boolean;

  // Feed
  posts: Post[];
  stories: Story[];
  refreshPosts: () => Promise<void>;
  refreshStories: () => Promise<void>;

  // Feed filter
  feedTab: 'foryou' | 'following';
  setFeedTab: (tab: 'foryou' | 'following') => void;

  // Post interactions
  toggleLike: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  createPost: (image: string, caption: string) => Promise<Post | null>;
  updatePost: (postId: string, caption: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  // User / Follow
  refreshUser: () => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  updateProfile: (updates: { displayName?: string; bio?: string; website?: string }) => Promise<void>;

  // Messages
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  refreshConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  markMessagesRead: (conversationId: string) => Promise<void>;
  startConversation: (userId: string) => Promise<void>;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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
  // ─── Auth / User ────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Feed ────────────────────────────────────────────────
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou');

  // ─── Messages ────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // ─── Notifications ───────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ─── Feed Actions ────────────────────────────────────────
  const refreshPosts = useCallback(async () => {
    try {
      const data = await api.getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  }, []);

  const refreshStories = useCallback(async () => {
    try {
      const data = await api.getStories();
      setStories(data);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  }, []);

  const toggleLike = useCallback(async (postId: string) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((post) => {
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
    try {
      await api.toggleLike(postId);
    } catch (error) {
      // Revert on failure
      await refreshPosts();
      console.error('Failed to toggle like:', error);
    }
  }, [refreshPosts]);

  const toggleBookmark = useCallback(async (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return { ...post, isBookmarked: !post.isBookmarked };
        }
        return post;
      })
    );
    try {
      await api.toggleBookmark(postId);
    } catch (error) {
      await refreshPosts();
      console.error('Failed to toggle bookmark:', error);
    }
  }, [refreshPosts]);

  const addComment = useCallback(async (postId: string, text: string) => {
    try {
      const result = await api.addComment(postId, text);
      if (result.success) {
        await refreshPosts();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [refreshPosts]);

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      try {
        await api.deleteComment(postId, commentId);
        await refreshPosts();
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    },
    [refreshPosts]
  );

  const createPost = useCallback(
    async (image: string, caption: string): Promise<Post | null> => {
      try {
        const newPost = await api.createPost(image, caption);
        setPosts((prev) => [newPost, ...prev]);
        return newPost;
      } catch (error) {
        console.error('Failed to create post:', error);
        return null;
      }
    },
    []
  );

  const updatePost = useCallback(
    async (postId: string, caption: string) => {
      try {
        await api.updatePost(postId, caption);
        await refreshPosts();
      } catch (error) {
        console.error('Failed to update post:', error);
      }
    },
    [refreshPosts]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      try {
        await api.deletePost(postId);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (error) {
        console.error('Failed to delete post:', error);
      }
    },
    []
  );

  // ─── User / Follow ───────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const toggleFollow = useCallback(async (userId: string) => {
    try {
      await api.toggleFollow(userId);
      await refreshUser();
      await refreshPosts();
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  }, [refreshUser, refreshPosts]);

  const updateProfile = useCallback(
    async (updates: { displayName?: string; bio?: string; website?: string }) => {
      try {
        await api.updateProfile(updates);
        await refreshUser();
      } catch (error) {
        console.error('Failed to update profile:', error);
      }
    },
    [refreshUser]
  );

  // ─── Messages ─────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await api.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      try {
        const newMsg = await api.sendMessage(conversationId, text);
        setMessages((prev) => [...prev, newMsg]);
        await refreshConversations();
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [refreshConversations]
  );

  const markMessagesRead = useCallback(
    async (conversationId: string) => {
      try {
        await api.markMessagesRead(conversationId);
        await refreshConversations();
      } catch (error) {
        console.error('Failed to mark messages read:', error);
      }
    },
    [refreshConversations]
  );

  const startConversation = useCallback(
    async (userId: string) => {
      try {
        const conv = await api.createConversation(userId);
        await refreshConversations();
        return conv;
      } catch (error) {
        console.error('Failed to start conversation:', error);
        return null;
      }
    },
    [refreshConversations]
  );

  // ─── Notifications ────────────────────────────────────────
  const refreshNotifications = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        api.getNotifications(),
        api.getUnreadNotificationCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  const markNotificationRead = useCallback(
    async (id: string) => {
      try {
        await api.markNotificationRead(id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification read:', error);
      }
    },
    []
  );

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  }, []);

  // ─── Init ─────────────────────────────────────────────────
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        const [user, notifs] = await Promise.all([
          api.getCurrentUser(),
          api.getNotifications(),
        ]);
        setCurrentUser(user);
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.isRead).length);
        await Promise.all([refreshPosts(), refreshStories(), refreshConversations()]);
      } catch (error) {
        console.error('Failed to initialize data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [refreshPosts, refreshStories, refreshConversations, refreshNotifications]);

  // ─── Provider ──────────────────────────────────────────────
  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoading,
        posts,
        stories,
        refreshPosts,
        refreshStories,
        feedTab,
        setFeedTab,
        toggleLike,
        toggleBookmark,
        addComment,
        deleteComment,
        createPost,
        updatePost,
        deletePost,
        refreshUser,
        toggleFollow,
        updateProfile,
        conversations,
        activeConversation,
        messages,
        refreshConversations,
        loadMessages,
        sendMessage,
        setActiveConversation,
        markMessagesRead,
        startConversation,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
