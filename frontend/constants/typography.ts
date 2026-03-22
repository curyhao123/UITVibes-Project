/**
 * Earthy Minimalist typography — SF Pro (iOS) / system sans (Android) for UI body;
 * Georgia / serif accent for "Discover" and premium headlines.
 */
import { Platform, TextStyle } from 'react-native';

/** Horizontal padding used across feed, headers, lists */
export const layoutPadding = 20;

export const fontFamily = {
  /** Body UI — SF Pro on iOS when omitted; Roboto-like on Android */
  sans: Platform.select({
    ios: undefined,
    android: 'sans-serif',
    web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }) as string | undefined,
  /** Accent title (Discover, editorial moments) */
  discover: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: 'Georgia, "Times New Roman", "Palatino Linotype", serif',
  }) as string,
};

export const Typography = {
  discoverTitle: {
    fontFamily: fontFamily.discover,
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.45,
  } satisfies TextStyle,

  screenTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.35,
  } satisfies TextStyle,

  sectionTitle: {
    fontFamily: fontFamily.sans,
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.25,
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.15,
  } satisfies TextStyle,

  bodyMedium: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '500' as const,
    letterSpacing: -0.15,
  } satisfies TextStyle,

  bodySemibold: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  /** Captions, post copy — tighter tracking */
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  captionSemibold: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  meta: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: -0.1,
  } satisfies TextStyle,

  tabLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  statNumber: {
    fontFamily: fontFamily.sans,
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  } satisfies TextStyle,

  statLabel: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: -0.05,
  } satisfies TextStyle,
};
