/**
 * SwipeableRow — Swipe-to-reveal actions component.
 *
 * Features:
 * - Left swipe: reveals primary action (e.g., bookmark, archive)
 * - Right swipe: reveals secondary action (e.g., delete, mute)
 * - Smooth spring physics with velocity-based snap
 * - Threshold-based reveal (30% of row width)
 * - Haptic feedback on threshold cross
 * - Prevents conflict with internal tap gestures by using minimum distance
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, Pressable, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SNAP_THRESHOLD = 0.25; // 25% of row width to trigger action reveal
const MAX_TRANSLATE = SCREEN_WIDTH * 0.35;
const MIN_SWIPE_DISTANCE = 15; // Minimum horizontal distance to distinguish swipe from tap

const SPRING_CONFIG = {
  damping: 22,
  stiffness: 200,
  mass: 0.8,
};

const ACTION_WIDTH = 80;

export interface SwipeAction {
  icon: string;
  color: string;
  backgroundColor?: string;
  label?: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  enabled?: boolean;
  testID?: string;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  leftAction,
  rightAction,
  leftActions,
  rightActions,
  enabled = true,
  testID,
}) => {
  const translateX = useSharedValue(0);
  const isSwiping = useSharedValue(false);
  const rowWidth = useSharedValue(SCREEN_WIDTH);

  const hasLeftActions = leftAction || (leftActions && leftActions.length > 0);
  const hasRightActions = rightAction || (rightActions && rightActions.length > 0);
  const actionsToRender = leftActions || (leftAction ? [leftAction] : []);
  const rightActionsToRender = rightActions || (rightAction ? [rightAction] : []);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .minDistance(MIN_SWIPE_DISTANCE)
    .onStart(() => {
      isSwiping.value = true;
    })
    .onUpdate((event) => {
      const newTranslate = event.translationX;

      // Clamp values based on available actions
      if (hasLeftActions && !hasRightActions) {
        translateX.value = Math.max(0, newTranslate);
      } else if (hasRightActions && !hasLeftActions) {
        translateX.value = Math.min(0, newTranslate);
      } else {
        translateX.value = Math.max(-MAX_TRANSLATE, Math.min(MAX_TRANSLATE, newTranslate));
      }
    })
    .onEnd((event) => {
      isSwiping.value = false;
      const threshold = MAX_TRANSLATE * SNAP_THRESHOLD;

      // Only swipe left to reveal rightAction, only swipe right to reveal leftAction
      if (hasRightActions && !hasLeftActions) {
        // Swipe left reveals rightAction
        if (translateX.value < -threshold || event.velocityX < -300) {
          translateX.value = withSpring(-ACTION_WIDTH, SPRING_CONFIG);
          runOnJS(triggerHaptic)();
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
      } else if (hasLeftActions && !hasRightActions) {
        // Swipe right reveals leftAction
        if (translateX.value > threshold || event.velocityX > 300) {
          translateX.value = withSpring(ACTION_WIDTH, SPRING_CONFIG);
          runOnJS(triggerHaptic)();
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
      } else {
        // Both actions available
        if (translateX.value < -threshold || event.velocityX < -300) {
          translateX.value = withSpring(-ACTION_WIDTH, SPRING_CONFIG);
          runOnJS(triggerHaptic)();
        } else if (translateX.value > threshold || event.velocityX > 300) {
          translateX.value = withSpring(ACTION_WIDTH, SPRING_CONFIG);
          runOnJS(triggerHaptic)();
        } else {
          translateX.value = withSpring(0, SPRING_CONFIG);
        }
      }
    });

  // Tap gesture to close when actions are revealed
  const tapToCloseGesture = Gesture.Tap()
    .enabled(enabled)
    .onEnd(() => {
      'worklet';
      if (Math.abs(translateX.value) > 5) {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionsStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: progress,
      transform: [{ scale: 0.8 + progress * 0.2 }],
    };
  });

  const rightActionsStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateX.value,
      [0, -ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: progress,
      transform: [{ scale: 0.8 + progress * 0.2 }],
    };
  });

  const handleActionPress = useCallback((action: SwipeAction) => {
    translateX.value = withSpring(0, SPRING_CONFIG);
    runOnJS(triggerHaptic)();
    setTimeout(() => action.onPress(), 50);
  }, [translateX]);

  // Compose gestures - pan takes priority over tap for closing
  const composedGesture = Gesture.Race(panGesture, tapToCloseGesture);

  return (
    <View style={styles.container} testID={testID}>
      {/* Left Actions (revealed on right swipe) */}
      {hasLeftActions && (
        <Animated.View style={[styles.actionsContainer, styles.leftActions, leftActionsStyle]}>
          {actionsToRender.map((action, index) => (
            <ActionButton
              key={index}
              action={action}
              onPress={() => handleActionPress(action)}
            />
          ))}
        </Animated.View>
      )}

      {/* Right Actions (revealed on left swipe) */}
      {hasRightActions && (
        <Animated.View style={[styles.actionsContainer, styles.rightActions, rightActionsStyle]}>
          {rightActionsToRender.map((action, index) => (
            <ActionButton
              key={index}
              action={action}
              onPress={() => handleActionPress(action)}
            />
          ))}
        </Animated.View>
      )}

      {/* Main Content - Swipeable */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.rowContent, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// ─── Action Button ───────────────────────────────────────────────────────────

interface ActionButtonProps {
  action: SwipeAction;
  onPress: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: action.backgroundColor || action.color },
        pressed && styles.actionButtonPressed,
      ]}
    >
      <Feather name={action.icon as any} size={22} color="#FFFFFF" strokeWidth={2} />
      {action.label && (
        <Text style={styles.actionLabel}>{action.label}</Text>
      )}
    </Pressable>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  rowContent: {
    zIndex: 1,
    backgroundColor: AppColors.surface,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  leftActions: {
    left: 0,
    justifyContent: 'flex-start',
  },
  rightActions: {
    right: 0,
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: ACTION_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    borderRadius: borderRadius.md,
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
