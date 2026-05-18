/**
 * tabBarVisibility.tsx
 *
 * Manages the visibility of the custom ModernTabBar across the app.
 *
 * Problem: expo-router's Tabs group stays mounted even when a Stack screen
 * is pushed on top of it. ModernTabBar is rendered inside the Tabs group via
 * the `tabBar` prop, so it would always be visible.
 *
 * Solution: ModernTabBar lives inside Tabs (to receive BottomTabBarProps)
 * but tracks the topmost Stack navigator state via a global ref.
 * When a non-tab route is active, it hides itself by returning null.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigatorScreenParams, ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// ── Types ────────────────────────────────────────────────────────────────────

type RootStackParamList = ParamListBase & {
  '(tabs)': NavigatorScreenParams;
  'post/[id]': undefined;
  'profile/[id]': undefined;
  'story/create': undefined;
  'story/[id]': undefined;
  notifications: undefined;
  settings: undefined;
  'followers/[userId]': undefined;
};

// ── Context ───────────────────────────────────────────────────────────────────

type TabBarVisibilityContextValue = {
  registerTabBarProps: (props: BottomTabBarProps) => void;
  isTabBarVisible: boolean;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue>({
  registerTabBarProps: () => {},
  isTabBarVisible: true,
});

export function useTabBarVisibilityContext() {
  return useContext(TabBarVisibilityContext);
}

// ── Provider: lives in root _layout.tsx ──────────────────────────────────────

/**
 * Root-level provider that watches the Stack navigator's route state.
 * It re-renders children whenever the top-level route changes.
 * Children can call `registerTabBarProps` to store the BottomTabBarProps.
 */
export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      const state = e.data.state;
      if (!state) return;

      // Navigate down the state tree to find the active route
      const getActiveRouteName = (s: typeof state): string | null => {
        const route = s.routes[s.index ?? 0];
        if (!route) return null;
        // If this level has a "state" (nested navigator), recurse
        if ('state' in route && route.state) {
          return getActiveRouteName(route.state as typeof state);
        }
        return route.name;
      };

      const activeRoute = getActiveRouteName(state);
      const VISIBLE_ROUTES = new Set([
        'home',
        'search',
        'music',
        'create',
        'reels',
        'message',
        'profile',
      ]);
      setIsTabBarVisible(activeRoute != null && VISIBLE_ROUTES.has(activeRoute));
    });

    return unsubscribe;
  }, [navigation]);

  const registerTabBarProps = useCallback((_props: BottomTabBarProps) => {
    // No-op: the props are used directly in (tabs)/_layout.tsx
    // This function exists only to satisfy the API shape
  }, []);

  return (
    <TabBarVisibilityContext.Provider value={{ registerTabBarProps, isTabBarVisible }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}
