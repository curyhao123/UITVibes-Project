/**
 * Orange primary: Warm Minimalist in light mode (off-white, charcoal/slate text), Modern Dark in dark mode (obsidian/slate, soft orange).
 */

import { Platform } from 'react-native';
import { layoutPadding } from './typography';

export { layoutPadding };

export const LightThemeColors = {
  primary: '#D97757',
  primaryLight: '#E89578',
  primaryDark: '#C45F3D',

  background: '#FAF9F6',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  border: '#E7E5E4',
  borderLight: '#F4F4F5',

  text: '#18181B',
  textSecondary: '#475569',
  /** Muted copy */
  textMuted: '#64748B',
  /** Inactive tab icons & de-emphasized chrome */
  iconMuted: '#94A3B8',

  like: '#D97757',
  error: '#C75C5C',
  success: '#6B8F71',

  /** Each hashtag gets one of these, picked deterministically from its text */
  hashtagPalette: ['#0F766E', '#1D4ED8', '#6D28D9', '#BE185D', '#0E7490', '#15803D'],
};

export const DarkThemeColors = {
  primary: '#FF8C42',
  primaryLight: '#FFA766',
  primaryDark: '#E5722A',

  background: '#0F1115',
  surface: '#16181D',
  surfaceElevated: '#1E2128',

  border: '#262A31',
  borderLight: '#2E323A',

  text: '#FFFFFF',
  textSecondary: '#E4E6EB',
  /** Muted copy */
  textMuted: '#8B919C',
  /** Inactive tab icons & de-emphasized chrome */
  iconMuted: '#5F6672',

  like: '#FF8C42',
  error: '#EF4444',
  success: '#34C759',

  hashtagPalette: ['#2DD4BF', '#60A5FA', '#A78BFA', '#F472B6', '#22D3EE', '#4ADE80'],
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
