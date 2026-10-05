import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DarkThemeColors,
  LightThemeColors,
  ThemeColors,
} from '../constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  activeTheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
}

const THEME_STORAGE_KEY = '@app_theme_mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within an AppThemeProvider');
  }
  return context;
};

interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider: React.FC<AppThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useRNColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (isMounted && stored && (stored === 'system' || stored === 'light' || stored === 'dark')) {
          setThemePreferenceState(stored as ThemePreference);
        }
      })
      .catch((err) => {
        console.warn('Failed to load theme preference:', err);
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemePreference = useCallback(async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (err) {
      console.warn('Failed to save theme preference:', err);
    }
  }, []);

  const activeTheme: 'light' | 'dark' =
    themePreference === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  const isDark = activeTheme === 'dark';
  const colors: ThemeColors = isDark ? DarkThemeColors : LightThemeColors;

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        setThemePreference,
        activeTheme,
        isDark,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
