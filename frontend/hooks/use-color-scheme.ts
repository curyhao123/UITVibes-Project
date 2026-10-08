import { useColorScheme as useRNColorScheme } from 'react-native';
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  // Hooks must be called unconditionally at the top level.
  const themeContext = useContext(ThemeContext);
  const rn = useRNColorScheme();

  if (themeContext) {
    return themeContext.activeTheme;
  }
  return rn === 'dark' ? 'dark' : 'light';
}
