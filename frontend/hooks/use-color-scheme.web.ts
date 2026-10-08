import { useEffect, useState, useContext } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Hooks must be called unconditionally at the top level.
  const themeContext = useContext(ThemeContext);
  const rnColorScheme = useRNColorScheme();

  if (!hasHydrated) {
    return 'light';
  }

  if (themeContext) {
    return themeContext.activeTheme;
  }
  return rnColorScheme === 'dark' ? 'dark' : 'light';
}
