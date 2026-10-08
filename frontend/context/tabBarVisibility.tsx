
/**
 * tabBarVisibility.tsx
 *
 * Manages the visibility of the custom ModernTabBar across the app.
 *
 * ModernTabBar lives inside the Tabs group, but this provider watches
 * the top-level navigation state and hides the tab bar when a non-tab
 * route is active.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useNavigation } from 'expo-router';

// ── Types ────────────────────────────────────────────────────────────────────

type TabBarVisibilityContextValue = {
  registerTabBarProps: (props: unknown) => void;
  isTabBarVisible: boolean;
};

// ── Context ───────────────────────────────────────────────────────────────────

const TabBarVisibilityContext =
  createContext<TabBarVisibilityContextValue>({
    registerTabBarProps: () => {},
    isTabBarVisible: true,
  });

export function useTabBarVisibilityContext() {
  return useContext(TabBarVisibilityContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * Root-level provider that watches the navigation state.
 *
 * It re-renders children whenever the active route changes.
 *
 * ModernTabBar can still call registerTabBarProps(), but the props are
 * actually consumed directly by the Tabs layout.
 */
export function TabBarVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (event) => {
      const state = event.data.state;

      if (!state) return;

      /**
       * Recursively walk through nested navigators
       * and find the currently active leaf route.
       */
      const getActiveRouteName = (currentState: any): string | null => {
        const route = currentState.routes?.[currentState.index ?? 0];

        if (!route) return null;

        if (route.state) {
          return getActiveRouteName(route.state);
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

      setIsTabBarVisible(
        activeRoute !== null && VISIBLE_ROUTES.has(activeRoute)
      );
    });

    return unsubscribe;
  }, [navigation]);

  /**
   * Kept for compatibility with existing consumers.
   *
   * BottomTabBarProps is intentionally not imported from
   * @react-navigation/bottom-tabs because the props are not actually
   * used by this provider.
   */
  const registerTabBarProps = useCallback((_props: unknown) => {
    // No-op.
    // Props are consumed directly in (tabs)/_layout.tsx.
  }, []);

  return (
    <TabBarVisibilityContext.Provider
      value={{
        registerTabBarProps,
        isTabBarVisible,
      }}
    >
      {children}
    </TabBarVisibilityContext.Provider>
  );
}