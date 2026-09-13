import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  User,
  Post,
  Comment,
  Conversation,
  Message,
} from '../data/mockData';
import type { Notification } from '../services/notificationService';
import * as api from '../services/api';
import type { Story } from '../services/storyService';
import { useOnlineUsers } from '../hooks/useOnlineUsers';
import { clearReelsUserCache } from '../context/reelsUserCache';
import { useAuthState } from './useAuthState';
import { useFeedState } from './useFeedState';
import { useChatState } from './useChatState';
import { useNotificationState } from './useNotificationState';

interface AppContextType {
  currentUser: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  markUserActive: () => void;
  login: (email: string, password: string) => Promise<User | null>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  confirmPendingAuth: (user: User) => void;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  isAuthenticated: boolean;
  authError: string | null;

  onboardingStep: number;
  onboardingData: {
    fullName: string;
    username: string;
    displayName: string;
    gender: string;
    bio: string;
    avatar: string;
  };
  saveOnboardingData: (data: Partial<AppContextType['onboardingData']>) => void;
  completeOnboardingStep: () => void;
  resetOnboarding: () => void;

  suggestedUsers: User[];
  fetchSuggestedUsers: () => Promise<void>;
  followSuggestedUser: (userId: string) => Promise<void>;

  posts: Post[];
  stories: Story[];
  refreshPosts: () => Promise<void>;
  refreshStories: () => Promise<void>;
  lastPostsFetch: number;
  lastStoriesFetch: number;

  myPosts: Post[];
  refreshMyPosts: () => Promise<void>;

  feedTab: 'foryou' | 'following';
  setFeedTab: (tab: 'foryou' | 'following') => void;

  toggleLike: (postId: string, isCurrentlyLiked?: boolean) => Promise<boolean>;
  toggleBookmark: (postId: string) => Promise<void>;
  toggleRepost: (postId: string) => Promise<void>;
  repostedPosts: Post[];
  addComment: (params: {
    postId: string;
    text: string;
    parentCommentId?: string;
    imageUrl?: string;
  }) => Promise<Comment | undefined>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  createPost: (
    images: string[],
    caption: string,
    location?: string,
    visibility?: number,
  ) => Promise<Post | null>;
  createReel: (videoUri: string, caption: string, duration?: number) => Promise<any>;
  updatePost: (postId: string, caption: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  reels: any[];
  refreshReels: () => Promise<void>;
  toggleReelLike: (reelId: string, isLiked: boolean) => Promise<void>;
  toggleReelBookmark: (reelId: string) => Promise<void>;
  addReelComment: (reelId: string, text: string, parentCommentId?: string) => Promise<void>;
  deleteReelComment: (commentId: string) => Promise<void>;
  toggleReelCommentLike: (commentId: string) => Promise<void>;
  deleteReel: (reelId: string) => Promise<void>;

  refreshUser: () => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  updateProfile: (updates: {
    displayName?: string;
    fullName?: string;
    gender?: string;
    bio?: string;
    website?: string;
  }) => Promise<void>;
  updateAvatar: (avatarUri: string) => Promise<void>;
  updateCover: (coverUri: string) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  deleteCover: () => Promise<void>;

  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationMembers: Conversation['members'];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  conversationError: string | null;
  messageError: string | null;
  refreshConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  sendMessage: (
    conversationId: string,
    payload: string | {
      content?: string;
      mediaUri?: string;
      mediaUrl?: string;
      mediaPublicId?: string;
      fileName?: string;
      fileSize?: number;
      type?: 0 | 1 | 2 | 3;
    },
  ) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, text: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  markMessagesRead: (conversationId: string, lastMessageId?: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  startConversation: (userId: string) => Promise<Conversation | null>;
  createGroup: (name: string, memberUserIds: string[]) => Promise<Conversation>;
  addGroupMember: (conversationId: string, targetUserId: string) => Promise<Conversation | null>;
  removeGroupMember: (conversationId: string, targetUserId: string) => Promise<Conversation | null>;
  leaveGroupConversation: (conversationId: string) => Promise<void>;

  partnerTyping: boolean;

  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  isUserOnline: (userId: string) => boolean;
  onlineSignalRConnected: boolean;
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
  const auth = useAuthState();
  const feed = useFeedState();
  const { isOnline, isConnected: onlineSignalRConnected } = useOnlineUsers(auth.isAuthenticated);
  const chat = useChatState(auth.currentUser, onlineSignalRConnected);
  const notifications = useNotificationState();

  const refreshUser = useCallback(async () => {
    try {
      const user = await api.getCurrentUser();
      auth.setCurrentUser(user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [auth]);

  const toggleFollow = useCallback(
    async (userId: string) => {
      try {
        await api.toggleFollow(userId);
        await refreshUser();
        await feed.refreshPosts();
        await feed.refreshReels();
        clearReelsUserCache();
      } catch (error) {
        console.error('Failed to toggle follow:', error);
      }
    },
    [feed, refreshUser],
  );

  const updateProfile = useCallback(
    async (updates: {
      displayName?: string;
      fullName?: string;
      gender?: string;
      bio?: string;
      website?: string;
    }) => {
      try {
        await api.updateProfile(updates);
        await refreshUser();
      } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    },
    [refreshUser],
  );

  const updateAvatar = useCallback(
    async (avatarUri: string) => {
      auth.setCurrentUser((prev) => (prev ? { ...prev, avatar: avatarUri } : prev));
      try {
        await api.updateAvatar(avatarUri);
        await refreshUser();
      } catch (error) {
        await refreshUser();
        console.error('Failed to update avatar:', error);
        throw error;
      }
    },
    [auth, refreshUser],
  );

  const deleteAvatar = useCallback(async () => {
    auth.setCurrentUser((prev) => (prev ? { ...prev, avatar: '' } : prev));
    try {
      await api.deleteAvatar();
      await refreshUser();
    } catch (error) {
      await refreshUser();
      console.error('Failed to delete avatar:', error);
      throw error;
    }
  }, [auth, refreshUser]);

  const updateCover = useCallback(
    async (coverUri: string) => {
      try {
        await api.updateCover(coverUri);
        await refreshUser();
      } catch (error) {
        console.error('Failed to update cover:', error);
        throw error;
      }
    },
    [refreshUser],
  );

  const deleteCover = useCallback(async () => {
    try {
      await api.deleteCover();
      await refreshUser();
    } catch (error) {
      console.error('Failed to delete cover:', error);
      throw error;
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await auth.logout();
    feed.setPosts([]);
    feed.setStories([]);
    feed.setMyPosts([]);
    feed.setRepostedPosts([]);
    chat.setConversations([]);
    notifications.setNotifications([]);
  }, [auth, chat, feed, notifications]);

  const deleteAccount = useCallback(
    async (password: string) => {
      await auth.deleteAccount(password);
      feed.setPosts([]);
      feed.setStories([]);
      feed.setMyPosts([]);
      feed.setRepostedPosts([]);
      chat.setConversations([]);
      notifications.setNotifications([]);
    },
    [auth, chat, feed, notifications],
  );

  useEffect(() => {
    let isActive = true;

    const initializeData = async () => {
      auth.setIsLoading(true);
      try {
        const restoredUser = await api.refreshSession();

        if (!isActive) return;

        if (restoredUser) {
          auth.setCurrentUser(restoredUser);
          auth.setIsAuthenticated(true);
          auth.setIsNewUser(restoredUser.posts === 0);

          await Promise.all([
            feed.refreshPosts(),
            feed.refreshMyPosts(),
            feed.refreshStories(),
            feed.refreshReels(),
            chat.refreshConversations(),
            notifications.refreshNotifications(),
            auth.fetchSuggestedUsers(),
          ]);
        } else {
          await Promise.all([
            feed.refreshPosts(),
            feed.refreshStories(),
            feed.refreshReels(),
            chat.refreshConversations(),
            notifications.refreshNotifications(),
          ]);
        }
      } catch (error) {
        console.error('Failed to initialize data:', error);
        if (!isActive) return;

        await Promise.all([
          feed.refreshPosts(),
          feed.refreshStories(),
          feed.refreshReels(),
          chat.refreshConversations(),
          notifications.refreshNotifications(),
        ]);
      } finally {
        if (isActive) {
          auth.setIsLoading(false);
        }
      }
    };

    void initializeData();

    return () => {
      isActive = false;
    };
  }, [
    auth.setCurrentUser,
    auth.setIsAuthenticated,
    auth.setIsLoading,
    auth.setIsNewUser,
    auth.fetchSuggestedUsers,
    feed.refreshPosts,
    feed.refreshMyPosts,
    feed.refreshStories,
    feed.refreshReels,
    chat.refreshConversations,
    notifications.refreshNotifications,
  ]);

  const value: AppContextType = {
    currentUser: auth.currentUser,
    isLoading: auth.isLoading,
    isNewUser: auth.isNewUser,
    markUserActive: auth.markUserActive,
    login: auth.login,
    register: auth.register,
    confirmPendingAuth: auth.confirmPendingAuth,
    logout,
    deleteAccount,
    isAuthenticated: auth.isAuthenticated,
    authError: auth.authError,
    onboardingStep: auth.onboardingStep,
    onboardingData: auth.onboardingData,
    saveOnboardingData: auth.saveOnboardingData,
    completeOnboardingStep: auth.completeOnboardingStep,
    resetOnboarding: auth.resetOnboarding,
    suggestedUsers: auth.suggestedUsers,
    fetchSuggestedUsers: auth.fetchSuggestedUsers,
    followSuggestedUser: auth.followSuggestedUser,
    posts: feed.posts,
    stories: feed.stories,
    refreshPosts: feed.refreshPosts,
    refreshStories: feed.refreshStories,
    lastPostsFetch: feed.lastPostsFetch,
    lastStoriesFetch: feed.lastStoriesFetch,
    myPosts: feed.myPosts,
    refreshMyPosts: feed.refreshMyPosts,
    feedTab: feed.feedTab,
    setFeedTab: feed.setFeedTab,
    toggleLike: feed.toggleLike,
    toggleBookmark: feed.toggleBookmark,
    toggleRepost: feed.toggleRepost,
    repostedPosts: feed.repostedPosts,
    addComment: feed.addComment,
    deleteComment: feed.deleteComment,
    createPost: async (images, caption, location, visibility) => {
      const newPost = await feed.createPost(images, caption, location, visibility);
      if (newPost) {
        auth.setCurrentUser((prev) => (prev ? { ...prev, posts: prev.posts + 1 } : prev));
        auth.setIsNewUser(false);
      }
      return newPost;
    },
    createReel: feed.createReel,
    updatePost: feed.updatePost,
    deletePost: async (postId: string) => {
      await feed.deletePost(postId);
      auth.setCurrentUser((prev) => (prev ? { ...prev, posts: Math.max(0, prev.posts - 1) } : prev));
    },
    reels: feed.reels,
    refreshReels: feed.refreshReels,
    toggleReelLike: feed.toggleReelLike,
    toggleReelBookmark: feed.toggleReelBookmark,
    addReelComment: feed.addReelComment,
    deleteReelComment: feed.deleteReelComment,
    toggleReelCommentLike: feed.toggleReelCommentLike,
    deleteReel: feed.deleteReel,
    refreshUser,
    toggleFollow,
    updateProfile,
    updateAvatar,
    updateCover,
    deleteAvatar,
    deleteCover,
    conversations: chat.conversations,
    activeConversation: chat.activeConversation,
    messages: chat.messages,
    conversationMembers: chat.conversationMembers,
    isLoadingConversations: chat.isLoadingConversations,
    isLoadingMessages: chat.isLoadingMessages,
    conversationError: chat.conversationError,
    messageError: chat.messageError,
    refreshConversations: chat.refreshConversations,
    loadMessages: chat.loadMessages,
    sendMessage: chat.sendMessage,
    editMessage: chat.editMessage,
    deleteMessage: chat.deleteMessage,
    setActiveConversation: chat.setActiveConversation,
    setMessages: chat.setMessages,
    markMessagesRead: chat.markMessagesRead,
    markConversationAsRead: chat.markConversationAsRead,
    startConversation: chat.startConversation,
    createGroup: chat.createGroup,
    addGroupMember: chat.addGroupMember,
    removeGroupMember: chat.removeGroupMember,
    leaveGroupConversation: chat.leaveGroupConversation,
    partnerTyping: chat.partnerTyping,
    notifications: notifications.notifications,
    unreadCount: notifications.unreadCount,
    refreshNotifications: notifications.refreshNotifications,
    markNotificationRead: notifications.markNotificationRead,
    markAllNotificationsRead: notifications.markAllNotificationsRead,
    isUserOnline: isOnline,
    onlineSignalRConnected,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
