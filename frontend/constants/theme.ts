/**
 * Warm, distinctive UI theme — off-white/beige backgrounds with terracotta/coral accent.
 * Inspired by natural, earthy tones for a cohesive and inviting look.
 */

import { Platform } from 'react-native';

// Warm palette
export const AppColors = {
  // Primary accent — terracotta / warm coral (buttons, active states, likes)
  primary: '#c97b5a',
  primaryLight: '#e09a7a',
  primaryDark: '#a85f42',

  // Backgrounds
  background: '#f8f4f0',      // Warm off-white / beige
  surface: '#fdfbf9',        // Cards, sheets (slightly warm white)
  surfaceElevated: '#ffffff', // Modals, headers

  // Borders & dividers
  border: '#e8e2db',
  borderLight: '#f0ebe5',

  // Text
  text: '#2c2520',
  textSecondary: '#7a6f66',
  textMuted: '#9a8f85',

  // Semantic
  like: '#c97b5a',           // Use primary for likes (warm orange heart)
  error: '#c75c5c',
  success: '#6b8f71',
};

// Legacy compatibility with existing useThemeColor
const tintColorLight = AppColors.primary;
const tintColorDark = '#e09a7a';

export const Colors = {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    tint: tintColorLight,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.textMuted,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
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

// Common border radius for soft, friendly look
export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};
