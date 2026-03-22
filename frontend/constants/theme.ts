/**
 * Earthy Minimalist palette — off-white ground, terracotta accent, charcoal type.
 */

import { Platform } from 'react-native';
import { layoutPadding } from './typography';

export { layoutPadding };

export const AppColors = {
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

const tintColorLight = AppColors.primary;
const tintColorDark = '#E89578';

export const Colors = {
  light: {
    text: AppColors.text,
    background: AppColors.background,
    tint: tintColorLight,
    icon: AppColors.textSecondary,
    tabIconDefault: AppColors.iconMuted,
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

/** Card corners — friendly, soft */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
