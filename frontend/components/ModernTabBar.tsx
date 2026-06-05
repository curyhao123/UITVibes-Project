/**
 * ModernTabBar — Instagram/Threads/Arc-inspired floating bottom tab bar.
 *
 * Features:
 * - Floating capsule design with glassmorphism
 * - Active pill indicator that slides smoothly
 * - Micro-interactions: active icon bounce, press scale
 * - Per-press haptic feedback
 * - Equal spacing with centered layout
 */

import React, { useCallback, useEffect } from 'react';
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
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../constants/theme';

// ── Design tokens ────────────────────────────────────────────────────────────

const TAB_COUNT = 5;
const TAB_ICONS = ['home', 'search', 'plus', 'play-circle', 'user'] as const;

const CAPSULE_WIDTH_RATIO = 0.88;
const CAPSULE_RADIUS = 28;
const CAPSULE_PADDING = 6;
const BAR_HEIGHT = 62;
const ICON_SIZE = 23;
const CREATE_ICON_SIZE = 26;
const PILL_GAP = 6;
const FLOAT_BOTTOM = 14;
const BOTTOM_INSET = 4;

export const TAB_BAR_BOTTOM_OFFSET = BAR_HEIGHT + BOTTOM_INSET + FLOAT_BOTTOM;
export const TAB_BAR_HEIGHT = BAR_HEIGHT;

const CREATE_INDEX = 2;

// ── Dimensions ──────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAPSULE_WIDTH = SCREEN_WIDTH * CAPSULE_WIDTH_RATIO;
const INNER_WIDTH = CAPSULE_WIDTH - CAPSULE_PADDING * 2;
const TAB_WIDTH = INNER_WIDTH / TAB_COUNT;
const PILL_WIDTH = TAB_WIDTH - PILL_GAP;
const PILL_TOP = 7;
const PILL_HEIGHT = BAR_HEIGHT - PILL_TOP * 2;

// ── Spring configs ───────────────────────────────────────────────────────────

const SPRING = {
  damping: 18,
  stiffness: 200,
  mass: 0.8,
};

const PRESS_SPRING = {
  damping: 20,
  stiffness: 300,
};

const RELEASE_SPRING = {
  damping: 14,
  stiffness: 220,
};

const ACTIVE_BOUNCE = {
  damping: 12,
  stiffness: 400,
};

// ── Active Pill ──────────────────────────────────────────────────────────────

interface ActivePillProps {
  positions: Animated.SharedValue<number[]>;
  currentIndex: number;
}

function ActivePill({ positions, currentIndex }: ActivePillProps) {
  // Use a separate shared value for the animated position
  const animatedX = useSharedValue(0);

  // Update animatedX when positions or currentIndex changes
  React.useEffect(() => {
    const updatePosition = () => {
      const posArray = positions.value;
      const targetX = posArray.length > 0 && posArray[currentIndex] !== undefined
        ? posArray[currentIndex]
        : CAPSULE_PADDING + currentIndex * TAB_WIDTH;
      animatedX.value = withSpring(targetX, SPRING);
    };
    updatePosition();
  }, [positions.value, currentIndex]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: animatedX.value }],
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

// ── Animated Tab Icon ────────────────────────────────────────────────────────

interface AnimatedTabIconProps {
  iconName: string;
  isActive: boolean;
  isCreate?: boolean;
  size?: number;
}

const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  iconName,
  isActive,
  isCreate = false,
  size = ICON_SIZE,
}) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isActive && !isCreate) {
      // Bounce effect when tab becomes active
      scale.value = withSequence(
        withSpring(1.2, ACTIVE_BOUNCE),
        withSpring(1, { damping: 15, stiffness: 200 }),
      );
    } else {
      scale.value = withSpring(1, RELEASE_SPRING);
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Feather
        name={iconName as any}
        size={isCreate ? CREATE_ICON_SIZE : size}
        color={isActive ? AppColors.primary : AppColors.iconMuted}
        strokeWidth={isActive ? 2.2 : 2}
      />
    </Animated.View>
  );
};

// ── Tab Button ───────────────────────────────────────────────────────────────

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
  const opacity = useSharedValue(isActive ? 1 : 0.8);

  const handlePressIn = () => {
    scale.value = withSpring(0.82, PRESS_SPRING);
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, RELEASE_SPRING);
    opacity.value = withTiming(isActive ? 1 : 0.8, { duration: 100 });
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isCreate = route === 'create';
  const iconName = TAB_ICONS[index];

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
          <View style={styles.createIconWrap}>
            <Feather
              name={iconName as any}
              size={CREATE_ICON_SIZE}
              color="#FFFFFF"
              strokeWidth={2.4}
            />
          </View>
        ) : (
          <AnimatedTabIcon
            iconName={iconName}
            isActive={isActive}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Main Tab Bar ─────────────────────────────────────────────────────────────

export function ModernTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const TAB_ROUTE_NAMES = ['home', 'search', 'create', 'reels', 'profile'];
  const isTabNavigator =
    state.type === 'tab' ||
    (state.routes.length > 0 &&
      state.routes.every((r) => TAB_ROUTE_NAMES.includes(r.name)));

  const currentRoute = state.routes[state.index]?.name;
  const shouldHideTabBar = currentRoute === 'create';

  if (!isTabNavigator || shouldHideTabBar) {
    return null;
  }

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
      <View
        style={[styles.capsule, { width: CAPSULE_WIDTH }]}
        onLayout={onCapsuleLayout}
      >
        <BlurView
          intensity={70}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.capsuleTint} />
        <View style={styles.capsuleBorder} />

        <ActivePill positions={positions} currentIndex={state.index} />

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
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },

  capsule: {
    height: BAR_HEIGHT,
    borderRadius: CAPSULE_RADIUS,
    overflow: 'hidden',
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

  capsuleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },

  capsuleBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CAPSULE_RADIUS,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },

  pillWrapper: {
    position: 'absolute',
    left: CAPSULE_PADDING,
    borderRadius: PILL_HEIGHT / 2,
    zIndex: 0,
  },

  pillFill: {
    flex: 1,
    borderRadius: PILL_HEIGHT / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
    }),
  },

  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },

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
