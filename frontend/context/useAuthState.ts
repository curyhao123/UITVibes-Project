import { useCallback, useState } from 'react';
import { User } from '../data/mockData';
import * as api from '../services/api';

export const useAuthState = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingAuthUser, setPendingAuthUser] = useState<User | null>(null);

  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    fullName: '',
    username: '',
    displayName: '',
    gender: '',
    bio: '',
    avatar: '',
  });

  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  const markUserActive = useCallback(() => setIsNewUser(false), []);

  const fetchSuggestedUsers = useCallback(async () => {
    try {
      const users = await api.getSuggestedUsers();
      setSuggestedUsers(users);
    } catch (error) {
      console.error('Failed to fetch suggested users:', error);
    }
  }, []);

  const followSuggestedUser = useCallback(
    async (userId: string) => {
      setSuggestedUsers((prev) => prev.filter((u) => u.id !== userId));
      try {
        await api.toggleFollow(userId);
      } catch (error) {
        await fetchSuggestedUsers();
        console.error('Failed to follow user:', error);
      }
    },
    [fetchSuggestedUsers],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<User | null> => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const user = await api.login(email, password);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setIsNewUser(user.posts === 0);
        return user;
      } catch (error) {
        console.error('Login failed:', error);
        const errorCode = (error as any)?.errorCode;
        if (errorCode) {
          setIsLoading(false);
          const errWithCode = error as Error & { errorCode: string; email: string };
          throw errWithCode;
        }
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Login failed. Please check your credentials and try again.';
        setAuthError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const register = useCallback(
    async (email: string, password: string, username: string): Promise<boolean> => {
      setIsLoading(true);
      setAuthError(null);
      try {
        const user = await api.register(email, password, username);
        setPendingAuthUser(user);
        setCurrentUser(user);
        setOnboardingStep(0);
        return true;
      } catch (error) {
        console.error('Registration failed:', error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Registration failed. Please try again.';
        setAuthError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const confirmPendingAuth = useCallback((user: User) => {
    setPendingAuthUser(null);
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsNewUser(true);
  }, []);

  const resetSessionAfterSignOut = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsNewUser(false);
    setAuthError(null);
    setOnboardingStep(0);
    setPendingAuthUser(null);
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
    (data: Partial<{ fullName: string; username: string; displayName: string; gender: string; bio: string; avatar: string }>) => {
      setOnboardingData((prev) => ({ ...prev, ...data }));
      if (typeof data.username === 'string' && data.username.trim()) {
        const handle = data.username.trim();
        setCurrentUser((prev) => (prev ? { ...prev, username: handle } : prev));
        api.patchCurrentUserLocal({ username: handle });
      }
      if (typeof data.displayName === 'string' && data.displayName.trim()) {
        const name = data.displayName.trim();
        setCurrentUser((prev) => (prev ? { ...prev, displayName: name } : prev));
        api.patchCurrentUserLocal({ displayName: name });
      }
      if (typeof data.fullName === 'string' && data.fullName.trim()) {
        const name = data.fullName.trim();
        setCurrentUser((prev) => (prev ? { ...prev, fullName: name } : prev));
        api.patchCurrentUserLocal({ fullName: name });
      }
      if (typeof data.gender === 'string') {
        const gender = data.gender;
        setCurrentUser((prev) => (prev ? { ...prev, gender } : prev));
        api.patchCurrentUserLocal({ gender });
      }
      if (typeof data.bio === 'string') {
        const bio = data.bio;
        setCurrentUser((prev) => (prev ? { ...prev, bio } : prev));
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
    setOnboardingData({ fullName: '', username: '', displayName: '', gender: '', bio: '', avatar: '' });
  }, []);

  return {
    currentUser,
    setCurrentUser,
    isLoading,
    isNewUser,
    markUserActive,
    login,
    register,
    confirmPendingAuth,
    logout,
    deleteAccount,
    isAuthenticated,
    authError,
    onboardingStep,
    onboardingData,
    saveOnboardingData,
    completeOnboardingStep,
    resetOnboarding,
    suggestedUsers,
    fetchSuggestedUsers,
    followSuggestedUser,
    setIsAuthenticated,
    setIsLoading,
    setIsNewUser,
    setAuthError,
    setOnboardingStep,
    setPendingAuthUser,
    pendingAuthUser,
    resetSessionAfterSignOut,
  };
};
