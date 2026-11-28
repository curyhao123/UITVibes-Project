import { useMemo } from 'react';
import type { ThemeColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

// Builds a stylesheet from the active theme; `factory` must be a stable module-level function.
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
