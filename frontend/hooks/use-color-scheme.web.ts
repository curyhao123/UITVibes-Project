import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  try {
    const { activeTheme } = useTheme();
    if (hasHydrated) {
      return activeTheme;
    }
    return 'light';
  } catch {
    const colorScheme = useRNColorScheme();
    if (hasHydrated) {
      return colorScheme === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  }
}
