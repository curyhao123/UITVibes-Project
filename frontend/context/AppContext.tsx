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
  Conversation,
  Message,
  Notification,
} from '../data/mockData';
import * as api from '../services/api';
import type { Story } from '../services/storyService';
import { useOnlineUsers } from '../hooks/useOnlineUsers';

interface AppContextType {
  // Auth / User
  currentUser: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  markUserActive: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;

  // Onboarding
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

  // Suggested Users
  suggestedUsers: User[];
  fetchSuggestedUsers: () => Promise<void>;
  followSuggestedUser: (userId: string) => Promise<void>;

  // Feed
  posts: Post[];
  stories: Story[];
  refreshPosts: () => Promise<void>;
  refreshStories: () => Promise<void>;

  myPosts: Post[];           // Posts của user hiện tại cho profile
  refreshMyPosts: () => Promise<void>; // Fetch riêng từ /post/my-posts

  // Feed filter
  feedTab: "foryou" | "following";
  setFeedTab: (tab: "foryou" | "following") => void;

  // Post interactions
  toggleLike: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string, parentCommentId?: string) => Promise<void>;
  deleteComment: (postId: string, commentId: string) => Promise<void>;
  createPost: (
    image: string,
    caption: string,
    location?: string,
  ) => Promise<Post | null>;
  updatePost: (postId: string, caption: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;

  // User / Follow
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

  // Messages
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  conversationMembers: Conversation["members"];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  conversationError: string | null;
  messageError: string | null;
  refreshConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  setActiveConversation: (conv: Conversation | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  markMessagesRead: (conversationId: string) => Promise<void>;
  startConversation: (userId: string) => Promise<Conversation | null>;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Online Status (SignalR + Redis)
  isUserOnline: (userId: string) => boolean;
  onlineSignalRConnected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const markUserActive = useCallback(() => setIsNewUser(false), []);

  // ─── Onboarding ─────────────────────────────────────────
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    fullName: "",
    username: "",
    displayName: "",
    gender: "",
    bio: "",
    avatar: "",
  });

  // ─── Suggested Users ─────────────────────────────────────
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      const users = await api.getSuggestedUsers();
      setSuggestedUsers(users);
    } catch (error) {
      console.error("Failed to fetch suggested users:", error);
    }
  }, []);

  const followSuggestedUser = useCallback(
    async (userId: string) => {
      setSuggestedUsers((prev) => prev.filter((u) => u.id !== userId));
      try {
        await api.toggleFollow(userId);
      } catch (error) {
        await fetchSuggestedUsers();
        console.error("Failed to follow user:", error);
      }
    },
    [fetchSuggestedUsers],
  );

  // ─── Auth Actions ────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const user = await api.login(email, password);
        setCurrentUser(user);
        setIsAuthenticated(true);
        // isNewUser = posts === 0 (tài khoản mới tạo chưa có bài viết)
        setIsNewUser(user.posts === 0);
        return true;
      } catch (error) {
        console.error("Login failed:", error);
        const errorCode = (error as any)?.errorCode;
        if (errorCode) {
          setIsLoading(false);
          const errWithCode = error as Error & { errorCode: string; email: string };
          throw errWithCode;
        }
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Login failed. Please check your credentials and try again.";
        setAuthError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      username: string,
    ): Promise<boolean> => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const user = await api.register(email, password, username);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsNewUser(true); // Tài khoản mới → posts = 0
        setOnboardingStep(0);
        return true;
      } catch (error) {
        console.error("Registration failed:", error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Registration failed. Please try again.";
        setAuthError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const resetSessionAfterSignOut = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsNewUser(false);
    setAuthError(null);
    setOnboardingStep(0);
    setPosts([]);
    setStories([]);
    setConversations([]);
    setNotifications([]);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    resetSessionAfterSignOut();
  }, [resetSessionAfterSignOut]);

  const deleteAccount = useCallback(
    async (password: string) => {
      await api.deleteAccount(password);
      resetSessionAfterSignOut();
    },
    [resetSessionAfterSignOut],
  );

  const saveOnboardingData = useCallback(
    (data: Partial<AppContextType["onboardingData"]>) => {
      setOnboardingData((prev) => ({ ...prev, ...data }));
      if (typeof data.username === "string" && data.username.trim()) {
        const handle = data.username.trim();
        setCurrentUser((prev) => (prev ? { ...prev, username: handle } : prev));
        api.patchCurrentUserLocal({ username: handle });
      }
      if (typeof data.displayName === "string" && data.displayName.trim()) {
        const name = data.displayName.trim();
        setCurrentUser((prev) =>
          prev ? { ...prev, displayName: name } : prev,
        );
        api.patchCurrentUserLocal({ displayName: name });
      }
      if (typeof data.fullName === "string" && data.fullName.trim()) {
        const name = data.fullName.trim();
        setCurrentUser((prev) =>
          prev ? { ...prev, fullName: name } : prev,
        );
        api.patchCurrentUserLocal({ fullName: name });
      }
      if (typeof data.gender === "string") {
        const gender = data.gender;
        setCurrentUser((prev) =>
          prev ? { ...prev, gender } : prev,
        );
        api.patchCurrentUserLocal({ gender });
      }
      if (typeof data.bio === "string") {
        const bio = data.bio;
        setCurrentUser((prev) =>
          prev ? { ...prev, bio } : prev,
        );
        api.patchCurrentUserLocal({ bio });
      }
    },
    [],
  );

  const completeOnboardingStep = useCallback(() => {
    setOnboardingStep((prev) => prev + 1);
  }, []);

  const resetOnboarding = useCallback(() => {
    setOnboardingStep(0);
    setIsNewUser(false);
    setOnboardingData({ fullName: "", username: "", displayName: "", gender: "", bio: "", avatar: "" });
  }, []);

  // ─── Feed ────────────────────────────────────────────────
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [feedTab, setFeedTab] = useState<"foryou" | "following">("foryou");
  const [myPosts, setMyPosts] = useState<Post[]>([]); // Posts của user hiện tại cho profile

  // ─── Messages ─────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationMembers, setConversationMembers] = useState<Conversation["members"]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  // ─── Notifications ───────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ─── Online Status ────────────────────────────────────────
  const { isOnline, isConnected: onlineSignalRConnected } = useOnlineUsers(isAuthenticated);

  // ─── Feed Actions ────────────────────────────────────────
  const refreshPosts = useCallback(async () => {
    try {
      const data = await api.getPosts();
      setPosts(data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  }, []);

  const refreshStories = useCallback(async () => {
    try {
      const data = await api.getStories();
      setStories(data);
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    }
  }, []);

  // Fetch posts của user hiện tại cho profile page
  const refreshMyPosts = useCallback(async () => {
    console.log("[AppContext] refreshMyPosts: START");
    try {
      const data = await api.getMyPosts();
      console.log("[AppContext] refreshMyPosts: SUCCESS, got", data.length, "posts");
      setMyPosts(data);
    } catch (error: any) {
      console.error("[AppContext] refreshMyPosts: ERROR", error?.response?.status, error?.message);
    }
  }, []);

  const toggleLike = useCallback(
    async (postId: string) => {
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
        }),
      );
      try {
        await api.toggleLike(postId);
      } catch (error) {
        // Revert on failure
        await refreshPosts();
        console.error("Failed to toggle like:", error);
      }
    },
    [refreshPosts],
  );

  const toggleBookmark = useCallback(
    async (postId: string) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return { ...post, isBookmarked: !post.isBookmarked };
          }
          return post;
        }),
      );
      try {
        await api.toggleBookmark(postId);
      } catch (error) {
        await refreshPosts();
        console.error("Failed to toggle bookmark:", error);
      }
    },
    [refreshPosts],
  );

  const addComment = useCallback(
    async (postId: string, text: string, parentCommentId?: string) => {
      try {
        const result = await api.addComment(postId, text, parentCommentId);
        if (result.success && result.comment) {
          // Update local posts/myPosts so the feed and profile grid show the new comment
          setPosts((prev) =>
            prev.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  comments: [result.comment!, ...post.comments],
                };
              }
              return post;
            }),
          );
          setMyPosts((prev) =>
            prev.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  comments: [result.comment!, ...post.comments],
                };
              }
              return post;
            }),
          );
        }
        return result.comment;
      } catch (error) {
        console.error("Failed to add comment:", error);
        throw error;
      }
    },
    [],
  );

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      try {
        await api.deleteComment(postId, commentId);
        await refreshPosts();
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    },
    [refreshPosts],
  );

  const createPost = useCallback(
    async (
      image: string,
      caption: string,
      location?: string,
    ): Promise<Post | null> => {
      try {
        const newPost = await api.createPost(image, caption, location);
        setPosts((prev) => [newPost, ...prev]);
        setMyPosts((prev) => [newPost, ...prev]); // Thêm vào myPosts cho profile
        // Refresh myPosts từ server để đảm bảo đồng bộ
        await refreshMyPosts();
        // Cập nhật số posts trên profile ngay lập tức
        setCurrentUser((prev) => (prev ? { ...prev, posts: prev.posts + 1 } : prev));
        setIsNewUser(false); // Đã có bài viết → không còn là new user
        return newPost;
      } catch (error) {
        console.error("Failed to create post:", error);
        return null;
      }
    },
    [refreshMyPosts],
  );

  const updatePost = useCallback(
    async (postId: string, caption: string) => {
      try {
        await api.updatePost(postId, caption);
        await refreshPosts();
      } catch (error) {
        console.error("Failed to update post:", error);
      }
    },
    [refreshPosts],
  );

  const deletePost = useCallback(async (postId: string) => {
    try {
      await api.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setMyPosts((prev) => prev.filter((p) => p.id !== postId)); // Xóa khỏi myPosts
      // Cập nhật số posts trên profile khi xóa
      setCurrentUser((prev) => (prev ? { ...prev, posts: Math.max(0, prev.posts - 1) } : prev));
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  }, []);

  // ─── User / Follow ───────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, []);

  const toggleFollow = useCallback(
    async (userId: string) => {
      try {
        await api.toggleFollow(userId);
        await refreshUser();
        await refreshPosts();
      } catch (error) {
        console.error("Failed to toggle follow:", error);
      }
    },
    [refreshUser, refreshPosts],
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
        console.error("Failed to update profile:", error);
        throw error;
      }
    },
    [refreshUser],
  );

  const updateAvatar = useCallback(
    async (avatarUri: string) => {
      // Optimistic update
      setCurrentUser((prev) => (prev ? { ...prev, avatar: avatarUri } : prev));
      try {
        await api.updateAvatar(avatarUri);
        await refreshUser();
      } catch (error) {
        // Revert on failure
        await refreshUser();
        console.error("Failed to update avatar:", error);
        throw error;
      }
    },
    [refreshUser],
  );

  const deleteAvatar = useCallback(async () => {
    setCurrentUser((prev) => (prev ? { ...prev, avatar: "" } : prev));
    try {
      await api.deleteAvatar();
      await refreshUser();
    } catch (error) {
      await refreshUser();
      console.error("Failed to delete avatar:", error);
      throw error;
    }
  }, [refreshUser]);

  const updateCover = useCallback(
    async (coverUri: string) => {
      try {
        await api.updateCover(coverUri);
        await refreshUser();
      } catch (error) {
        console.error("Failed to update cover:", error);
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
      console.error("Failed to delete cover:", error);
      throw error;
    }
  }, [refreshUser]);

  // ─── Messages ─────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    console.log("[AppContext] refreshConversations: fetching...");
    setIsLoadingConversations(true);
    setConversationError(null);
    try {
      const data = await api.getConversations();
      console.log("[AppContext] refreshConversations: received", data.length, "conversations");
      if (data.length > 0) {
        console.log("[AppContext] refreshConversations: first conv id:", data[0].id, "members:", data[0].members.length);
      }
      setConversations(data);
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? "Failed to load conversations.";
      console.error("[AppContext] refreshConversations: FAILED —", msg, error);
      setConversationError(msg);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    setMessageError(null);
    setMessages([]);
    try {
      const { messages: msgs, members } = await api.getMessages(conversationId);
      // API trả về: tin mới nhất ở đầu → cần đảo để có thứ tự Cũ→Mới (đúng cho FlatList)
      setMessages([...msgs].reverse());
      setConversationMembers(members);
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? "Failed to load messages.";
      setMessageError(msg);
      console.error("[AppContext] loadMessages:", msg, error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const sendMessageFn = useCallback(
    async (conversationId: string, text: string) => {
      try {
        const newMsg = await api.sendMessage(conversationId, text);
        // Attach sender info from cached members
        const sender = conversationMembers.find((m) => m.id === newMsg.senderId);
        if (sender) {
          newMsg.sender = sender;
        }
        setMessages((prev) => [...prev, newMsg]);
        await refreshConversations();
      } catch (error: any) {
        const msg = error?.response?.data?.message ?? "Failed to send message.";
        console.error("[AppContext] sendMessage:", msg, error);
        throw new Error(msg);
      }
    },
    [refreshConversations, conversationMembers],
  );

  const markMessagesRead = useCallback(
    async (conversationId: string) => {
      try {
        // Find last message id to pass as lastMessageId
        const lastMsg = messages[messages.length - 1];
        if (lastMsg) {
          await api.markMessagesRead(conversationId, lastMsg.id);
        }
        await refreshConversations();
      } catch (error) {
        console.error("[AppContext] markMessagesRead:", error);
      }
    },
    [refreshConversations, messages],
  );

  const startConversation = useCallback(
    async (userId: string) => {
      console.log("[AppContext] startConversation: calling API with userId:", userId);
      let conv;
      try {
        conv = await api.createPrivateConversation(userId);
        console.log("[AppContext] startConversation: API returned conv.id:", conv?.id);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Failed to start conversation.";
        console.error("[AppContext] startConversation: API FAILED —", msg, err);
        throw new Error(msg); // ← MUST throw so UI can catch and show Alert
      }
      console.log("[AppContext] startConversation: refreshing conversations...");
      await refreshConversations();
      console.log("[AppContext] startConversation: done. conv.id =", conv.id);
      return conv;
    },
    [refreshConversations],
  );

  // ─── Notifications ───────────────────────────────────────
  const refreshNotifications = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        api.getNotifications(),
        api.getUnreadNotificationCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  }, []);

  // ─── Init: thử restore session từ JWT đã lưu ─────────────
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // Thử khôi phục session từ token đã lưu
        const restoredUser = await api.refreshSession();

        if (restoredUser) {
          // Có token hợp lệ → khôi phục session
          setCurrentUser(restoredUser);
          setIsAuthenticated(true);
          setIsNewUser(restoredUser.posts === 0);

          // Load dữ liệu song song
          await Promise.all([
            refreshPosts(),
            refreshMyPosts(),
            refreshStories(),
            refreshConversations(),
            refreshNotifications(),
            fetchSuggestedUsers(),
          ]);
        } else {
          // Không có token hoặc token hết hạn → chưa đăng nhập
          // Vẫn load dữ liệu mẫu để preview app (nếu cần)
          await Promise.all([
            refreshPosts(),
            refreshStories(),
            refreshConversations(),
            refreshNotifications(),
          ]);
        }
      } catch (error) {
        console.error("Failed to initialize data:", error);
        // Fallback: load mock data
        await Promise.all([
          refreshPosts(),
          refreshStories(),
          refreshConversations(),
          refreshNotifications(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [
    refreshPosts,
    refreshStories,
    refreshConversations,
    refreshNotifications,
    fetchSuggestedUsers,
  ]);

  // ─── Provider ──────────────────────────────────────────────
  return (
    <AppContext.Provider
      value={{
        currentUser,
        isLoading,
        isNewUser,
        authError,
        markUserActive,
        login,
        register,
        logout,
        deleteAccount,
        isAuthenticated,
        onboardingStep,
        onboardingData,
        saveOnboardingData,
        completeOnboardingStep,
        resetOnboarding,
        suggestedUsers,
        fetchSuggestedUsers,
        followSuggestedUser,
        posts,
        myPosts,
        stories,
        refreshPosts,
        refreshMyPosts,
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
        updateAvatar,
        updateCover,
        deleteAvatar,
        deleteCover,
        conversations,
        activeConversation,
        messages,
        conversationMembers,
        isLoadingConversations,
        isLoadingMessages,
        conversationError,
        messageError,
        refreshConversations,
        loadMessages,
        sendMessage: sendMessageFn,
        setActiveConversation,
        setMessages,
        markMessagesRead,
        startConversation,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        isUserOnline: isOnline,
        onlineSignalRConnected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
