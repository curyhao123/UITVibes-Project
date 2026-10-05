/**
 * Earthy Minimalist palette — warm off-white in light mode, pitch black in dark mode.
 */

import { Platform } from 'react-native';
import { layoutPadding } from './typography';

export { layoutPadding };

export const LightThemeColors = {
  primary: '#D97757',
  primaryLight: '#E89578',
  primaryDark: '#C45F3D',

  background: '#F9F8F6',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  border: '#E8E4DF',
  borderLight: '#F2EFEB',

  text: '#2D3748',
  textSecondary: '#4A5568',
  /** Muted copy */
  textMuted: '#718096',
  /** Inactive tab icons & de-emphasized chrome */
  iconMuted: '#A0AEC0',

  like: '#D97757',
  error: '#C75C5C',
  success: '#6B8F71',
};

export const DarkThemeColors = {
  primary: '#E07A5F',
  primaryLight: '#E89578',
  primaryDark: '#C45F3D',

  background: '#000000', // Pitch black
  surface: '#121212', // Deep dark card/surface
  surfaceElevated: '#1C1C1E', // Elevated surface

  border: '#242426',
  borderLight: '#2C2C2E',

  text: '#FFFFFF', // Crisp white
  textSecondary: '#EBEBF5',
  /** Muted copy */
  textMuted: '#8E8E93',
  /** Inactive tab icons & de-emphasized chrome */
  iconMuted: '#636366',

  like: '#E07A5F',
  error: '#EF4444',
  success: '#34C759',
};

export type ThemeColors = typeof LightThemeColors;

export const AppColors = LightThemeColors;

const tintColorLight = LightThemeColors.primary;
const tintColorDark = DarkThemeColors.primary;

export const Colors = {
  light: {
    text: LightThemeColors.text,
    background: LightThemeColors.background,
    tint: tintColorLight,
    icon: LightThemeColors.textSecondary,
    tabIconDefault: LightThemeColors.iconMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: DarkThemeColors.text,
    background: DarkThemeColors.background,
    tint: tintColorDark,
    icon: DarkThemeColors.textSecondary,
    tabIconDefault: DarkThemeColors.iconMuted,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Card corners — friendly, soft */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
