/**
 * AnimatedButton — Button with micro-interactions.
 *
 * Features:
 * - Press scale animation (subtle shrink on press)
 * - Haptic feedback on press (light, medium, or heavy)
 * - Loading state with spinner
 * - Disabled state
 * - Variants: primary, secondary, ghost, danger
 * - Size options: sm, md, lg
 */

import React, { useCallback } from 'react';
import { Text, StyleSheet, ActivityIndicator, Platform, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../constants/theme';

type HapticType = 'light' | 'medium' | 'heavy' | 'none';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AnimatedButtonProps {
  children?: React.ReactNode;
  title?: string;
  onPress: () => void;
  onLongPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  hapticType?: HapticType;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SPRING_PRESS = { damping: 20, stiffness: 300 };
const SPRING_RELEASE = { damping: 15, stiffness: 200 };

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  title,
  onPress,
  onLongPress,
  variant = 'primary',
  size = 'md',
  hapticType = 'light',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  testID,
}) => {
  const scale = useSharedValue(1);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web' && hapticType !== 'none') {
      const hapticMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      Haptics.impactAsync(hapticMap[hapticType]);
    }
  }, [hapticType]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading) {
      onPress();
    }
  }, [disabled, loading, onPress]);

  const handleLongPress = useCallback(() => {
    if (!disabled && !loading && onLongPress) {
      triggerHaptic();
      onLongPress();
    }
  }, [disabled, loading, onLongPress, triggerHaptic]);

  const tapGesture = Gesture.Tap()
    .enabled(!disabled && !loading)
    .onStart(() => {
      scale.value = withSpring(0.94, SPRING_PRESS);
      runOnJS(triggerHaptic)();
    })
    .onEnd(() => {
      scale.value = withSpring(1, SPRING_RELEASE);
      runOnJS(handlePress)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_RELEASE);
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled && !loading && !!onLongPress)
    .minDuration(500)
    .onStart(() => {
      scale.value = withSpring(0.88, SPRING_PRESS);
      runOnJS(triggerHaptic)();
      runOnJS(handleLongPress)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_RELEASE);
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerStyle = [
    styles.base,
    styles[`${variant}Container`],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.baseText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
  ];

  const isDisabled = disabled || loading;

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : AppColors.primary}
        />
      );
    }

    if (children) {
      return children;
    }

    return (
      <>
        {icon && iconPosition === 'left' && (
          <Feather
            name={icon as any}
            size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18}
            color={getIconColor(variant, isDisabled)}
            style={styles.iconLeft}
          />
        )}
        <Text style={textStyle}>{title}</Text>
        {icon && iconPosition === 'right' && (
          <Feather
            name={icon as any}
            size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18}
            color={getIconColor(variant, isDisabled)}
            style={styles.iconRight}
          />
        )}
      </>
    );
  };

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[containerStyle, animatedStyle]} testID={testID}>
        <Animated.View style={styles.content}>{renderContent()}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

// ─── Helper ────────────────────────────────────────────────────────────────────

function getIconColor(variant: ButtonVariant, disabled: boolean): string {
  if (disabled) return AppColors.iconMuted;
  switch (variant) {
    case 'primary':
    case 'danger':
      return '#FFFFFF';
    case 'secondary':
      return AppColors.primary;
    case 'ghost':
      return AppColors.text;
    default:
      return AppColors.text;
  }
}

// ─── Icon Button Variant ───────────────────────────────────────────────────────

interface AnimatedIconButtonProps {
  icon: string;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  hapticType?: HapticType;
  disabled?: boolean;
  testID?: string;
}

export const AnimatedIconButton: React.FC<AnimatedIconButtonProps> = ({
  icon,
  onPress,
  size = 24,
  color = AppColors.iconMuted,
  backgroundColor,
  hapticType = 'light',
  disabled = false,
  testID,
}) => {
  const scale = useSharedValue(1);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web' && hapticType !== 'none') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticType]);

  const tapGesture = Gesture.Tap()
    .enabled(!disabled)
    .onStart(() => {
      scale.value = withSpring(0.85, SPRING_PRESS);
      runOnJS(triggerHaptic)();
    })
    .onEnd(() => {
      scale.value = withSpring(1, SPRING_RELEASE);
      runOnJS(onPress)();
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING_RELEASE);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.iconButton,
          backgroundColor && { backgroundColor },
          animatedStyle,
        ]}
        testID={testID}
      >
        <Feather name={icon as any} size={size} color={disabled ? AppColors.iconMuted : color} />
      </Animated.View>
    </GestureDetector>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Container variants
  primaryContainer: {
    backgroundColor: AppColors.primary,
  },
  secondaryContainer: {
    backgroundColor: AppColors.surface,
    borderWidth: 1.5,
    borderColor: AppColors.primary,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  dangerContainer: {
    backgroundColor: AppColors.error,
  },
  disabled: {
    opacity: 0.5,
  },

  // Size variants
  smSize: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  mdSize: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
  },
  lgSize: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    minHeight: 56,
  },

  fullWidth: {
    width: '100%',
  },

  // Text styles
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: AppColors.primary,
  },
  ghostText: {
    color: AppColors.text,
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: AppColors.iconMuted,
  },

  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 17,
  },

  // Icon styles
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },

  // Icon button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
