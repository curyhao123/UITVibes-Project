import { useColorScheme as useRNColorScheme } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  try {
    const { activeTheme } = useTheme();
    return activeTheme;
  } catch {
    const rn = useRNColorScheme();
    return rn === 'dark' ? 'dark' : 'light';
  }
}
