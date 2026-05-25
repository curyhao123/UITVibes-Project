/**
 * ModernTabBar — Instagram/Threads/Arc-inspired floating bottom tab bar.
 *
 * UX improvements:
 *  - Floating capsule design: tab bar is a centered pill, not full-width.
 *    This creates visual breathing room and a premium "floating UI" feel.
 *  - Active pill indicator: a pill slides smoothly between tabs using Reanimated.
 *    Provides clear affordance of which tab is active.
 *  - No labels: icons-only design reduces cognitive load and feels modern/minimal.
 *  - Glassmorphism background: semi-transparent + blur effect makes the bar
 *    feel integrated with content behind it.
 *  - Safe-area aware: respects iPhone notch and Android nav bar height.
 *  - Per-press haptic feedback: subtle touch confirmation on every tap.
 *  - Equal spacing: tabs are mathematically centered in the capsule.
 *  - Create button elevated: the + button pops with its own pill background
 *    and stronger shadow — intentional visual hierarchy.
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../constants/theme';

// ── Design tokens ────────────────────────────────────────────────────────────

const TAB_COUNT = 7;
const TAB_ICONS = ['home', 'search', 'music', 'plus', 'video', 'message-circle', 'user'] as const;

/** Width of the floating capsule (as a fraction of screen width). */
const CAPSULE_WIDTH_RATIO = 0.88;
/** Corner radius of the whole floating bar. */
const CAPSULE_RADIUS     = 28;
/** Padding inside the capsule left & right. */
const CAPSULE_PADDING    = 6;
/** Total height of the tab bar (excluding safe area). */
const BAR_HEIGHT         = 62;
/** Icon size for normal tabs. */
const ICON_SIZE          = 23;
/** Icon size for the create (+) button (slightly larger to stand out). */
const CREATE_ICON_SIZE   = 26;
/** Gap between pill and tab edges within capsule. */
const PILL_GAP           = 6;
/** Distance the floating bar sits above the screen bottom. */
const FLOAT_BOTTOM       = 14;
/** Bottom inset: additional breathing room on top of safe area. */
const BOTTOM_INSET       = 4;

/**
 * Total bottom offset for content that needs to avoid the floating tab bar.
 * Use this value as bottom padding/margin for overlay content.
 */
export const TAB_BAR_BOTTOM_OFFSET = BAR_HEIGHT + BOTTOM_INSET + FLOAT_BOTTOM;

/** Create-tab is index 3 (centered in the 7-tab layout). */
const CREATE_INDEX = 3;

// ── Pre-computed dimensions (stable across renders) ──────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAPSULE_WIDTH = SCREEN_WIDTH * CAPSULE_WIDTH_RATIO;
const INNER_WIDTH   = CAPSULE_WIDTH - CAPSULE_PADDING * 2;
const TAB_WIDTH     = INNER_WIDTH / TAB_COUNT;
const PILL_WIDTH    = TAB_WIDTH - PILL_GAP;
const PILL_TOP      = 7;
const PILL_HEIGHT   = BAR_HEIGHT - PILL_TOP * 2;

// ── Spring config shared across animations ───────────────────────────────────

const SPRING = {
  damping:   18,
  stiffness: 200,
  mass:       0.8,
};

// ── Animated active-pill component ─────────────────────────────────────────

/**
 * The active-pill slides horizontally between tabs using Reanimated.
 * It uses absolute positioning with `withSpring` for a physics-based motion.
 *
 * Why: The pill visually anchors to the active tab, giving users
 * immediate feedback on their current location in the app.
 */
function ActivePill({ positions, currentIndex }: {
  positions: Animated.SharedValue<number[]>;
  currentIndex: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';

    if (positions.value.length === 0) {
      return {};
    }

    // positions.value holds each tab's center X inside the capsule.
    // Fallback: compute from index if shared value not yet set.
    const targetX = positions.value[currentIndex] !== undefined
      ? positions.value[currentIndex]
      : CAPSULE_PADDING + currentIndex * TAB_WIDTH;

    return {
      transform: [{ translateX: withSpring(targetX, SPRING) }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.pillWrapper,
        { width: PILL_WIDTH, height: PILL_HEIGHT, top: PILL_TOP },
        animatedStyle,
      ]}
    >
      <View style={styles.pillFill} />
    </Animated.View>
  );
}

// ── Single tab button ────────────────────────────────────────────────────────

/**
 * Each tab button:
 * - Uses Reanimated scale for press feedback (0.82 → 1.0 spring)
 * - Fires light haptic on press
 * - Icon color switches between muted (inactive) and primary (active)
 *
 * Why press scale: gives physical "click" feel without slowing the UI.
 * Haptics reinforce the tap without being intrusive.
 */
function TabButton({
  route,
  index,
  isActive,
  onPress,
}: {
  route: string;
  index: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.82, { damping: 20, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isCreate = route === 'create';
  const iconName = TAB_ICONS[index];
  const iconSize = isCreate ? CREATE_ICON_SIZE : ICON_SIZE;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={route}
      style={styles.tabButton}
    >
      <Animated.View style={animatedStyle}>
        {isCreate ? (
          // Create button: filled circle that visually "pops" above the bar.
          // Negative marginTop makes it breach the capsule top edge.
          <View style={styles.createIconWrap}>
            <Feather
              name={iconName as any}
              size={iconSize}
              color="#FFFFFF"
              strokeWidth={2.4}
            />
          </View>
        ) : (
          <View style={styles.iconWrap}>
            <Feather
              name={iconName as any}
              size={iconSize}
              color={isActive ? AppColors.primary : AppColors.iconMuted}
              strokeWidth={isActive ? 2.2 : 2}
            />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Main ModernTabBar ────────────────────────────────────────────────────────

export function ModernTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Guard: only render when inside the Tabs navigator.
  // When a Stack screen (post/[id], followers, etc.) is pushed on the parent
  // Stack, expo-router still calls the tab bar, but state.type !== 'tab'.
  // As a secondary check, also verify all route names belong to tab screens.
  const TAB_ROUTE_NAMES = ['home', 'search', 'music', 'create', 'reels', 'message', 'profile'];
  const isTabNavigator =
    state.type === 'tab' ||
    (state.routes.length > 0 &&
      state.routes.every((r) => TAB_ROUTE_NAMES.includes(r.name)));

  // Hide tab bar on create screen to give more space for content
  const currentRoute = state.routes[state.index]?.name;
  const shouldHideTabBar = currentRoute === 'create';

  if (!isTabNavigator || shouldHideTabBar) {
    return null;
  }

  // Shared value: pixel positions of each tab center within the capsule.
  // Updated once after the capsule has been laid out.
  const positions = useSharedValue<number[]>([]);

  const handleTabPress = useCallback(
    (routeName: string, routeIndex: number) => {
      if (state.index !== routeIndex) {
        navigation.navigate(routeName);
      }
      if (state.events) {
        const event = state.events.find(
          (e) => e.target === state.routes?.[routeIndex]?.key,
        );
        if (event) {
          navigation.emit({
            type: 'tabPress',
            target: event.target,
            canPreventDefault: true,
          });
        }
      }
    },
    [navigation, state],
  );

  // Called after capsule layout — capture the exact pixel positions of each tab center.
  const onCapsuleLayout = useCallback(() => {
    positions.value = Array.from(
      { length: TAB_COUNT },
      (_, i) => CAPSULE_PADDING + i * TAB_WIDTH + TAB_WIDTH / 2,
    );
  }, [positions]);

  const totalHeight = BAR_HEIGHT + insets.bottom + BOTTOM_INSET + FLOAT_BOTTOM;

  return (
    <View
      style={[
        styles.wrapper,
        { height: totalHeight, paddingBottom: insets.bottom + BOTTOM_INSET },
      ]}
    >
      {/* ── Floating capsule ────────────────────────────────────────────── */}
      <View
        style={[styles.capsule, { width: CAPSULE_WIDTH }]}
        onLayout={onCapsuleLayout}
      >
        {/* Background blur (iOS / Android 10+; falls back on older Android) */}
        <BlurView
          intensity={70}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        {/* Semi-transparent tint layer — makes content readable on all backgrounds */}
        <View style={styles.capsuleTint} />

        {/* Frosted-glass edge: top highlight + bottom shadow border */}
        <View style={styles.capsuleBorder} />

        {/* Active pill indicator — slides under tab buttons, above capsule fill */}
        <ActivePill positions={positions} currentIndex={state.index} />

        {/* Tab buttons — rendered above the pill so they receive touches */}
        <View style={styles.tabsRow} pointerEvents="box-none">
          {state.routes.map((route, index) => (
            <TabButton
              key={route.key}
              route={route.name}
              index={index}
              isActive={state.index === index}
              onPress={() => handleTabPress(route.name, index)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Outer wrapper: full width, positions the capsule from the bottom.
  // Sits above the native safe-area background.
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // Floating capsule: a pill-shaped container with glassmorphism effect.
  // Layers (bottom to top): BlurView → tint → border → active pill → buttons
  capsule: {
    height: BAR_HEIGHT,
    borderRadius: CAPSULE_RADIUS,
    overflow: 'hidden',
    // iOS: layered shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A2E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  // Tint layer: a semi-transparent white wash over the blur.
  // On light backgrounds (default), this lightens the bar slightly.
  // On dark backgrounds, this makes the bar visible.
  capsuleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },

  // Frosted-glass border: a subtle lighter top edge and darker bottom edge
  // simulates the iOS frosted glass highlight seen in Control Center etc.
  capsuleBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CAPSULE_RADIUS,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },

  // Active pill: a white rectangle with rounded ends that slides between tabs.
  // The animated translateX is computed from tab-center positions.
  pillWrapper: {
    position: 'absolute',
    left: CAPSULE_PADDING,
    borderRadius: PILL_HEIGHT / 2,
    zIndex: 0,
  },

  // Solid white fill — the pill is always visible regardless of background.
  pillFill: {
    flex: 1,
    borderRadius: PILL_HEIGHT / 2,
    // Subtle inner shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },

  // Row of all tab buttons — takes full capsule width, equal flex分配
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },

  // Individual tab button — fills 1/TAB_COUNT of capsule width
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },

  // Icon wrapper for normal (non-create) tabs — purely for touch area expansion
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
    width: '100%',
  },

  // The floating create (+) button: a filled circle that visually
  // "pops" above the capsule. Negative marginTop breaches the capsule top.
  // Uses a stronger shadow to lift it off the surface.
  createIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    ...Platform.select({
      ios: {
        shadowColor: AppColors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.36,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
