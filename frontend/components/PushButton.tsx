import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AppColors, borderRadius as defaultRadius } from '../constants/theme';
import { Typography } from '../constants/typography';

type HapticType = 'light' | 'medium' | 'heavy' | 'none';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface PushButtonProps {
  /** Background color of the shadow/base layer (the depth color). Defaults to '#1E293B' or 'black'. */
  shadowColor?: string;
  /** Background color of the front face of the button. Defaults to AppColors.primary ('#FFFFFF' if dark base). */
  frontColor?: string;
  /** Text/icon color on the front face. Defaults to '#FFFFFF'. */
  frontTextColor?: string;
  /** How many pixels the front face lifts up at rest. Defaults to 4. */
  liftPx?: number;
  /** Border radius of the button. Defaults to 12. */
  borderRadius?: number;
  /** Button title string if not using custom children. */
  title?: string;
  /** Optional icon name (Feather). */
  icon?: string;
  /** Icon position relative to title. */
  iconPosition?: 'left' | 'right';
  /** Button size preset (sm, md, lg). Defaults to 'md'. */
  size?: ButtonSize;
  /** Haptic feedback on press. Defaults to 'light'. */
  hapticType?: HapticType;
  /** Loading state showing a spinner. */
  loading?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** Whether the button takes 100% width. */
  fullWidth?: boolean;
  /** Outer container style (for layout/margin). */
  style?: StyleProp<ViewStyle>;
  /** Inner front face style (for custom padding/alignment). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Text style when using `title`. */
  textStyle?: StyleProp<TextStyle>;
  /** Children content inside the front face. */
  children?: React.ReactNode;
  /** Press handler. */
  onPress?: () => void;
  /** Long press handler. */
  onLongPress?: () => void;
  /** Test identifier. */
  testID?: string;
}

const SPRING_PRESS = { damping: 18, stiffness: 400 };
const SPRING_RELEASE = { damping: 16, stiffness: 300 };

export const PushButton: React.FC<PushButtonProps> = ({
  shadowColor = '#0F172A',
  frontColor = AppColors.primary,
  frontTextColor = '#FFFFFF',
  liftPx = 4,
  borderRadius = defaultRadius.md,
  title,
  icon,
  iconPosition = 'left',
  size = 'md',
  hapticType = 'light',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  contentStyle,
  textStyle,
  children,
  onPress,
  onLongPress,
  testID,
}) => {
  const translateY = useSharedValue(-liftPx);
  const isDisabled = disabled || loading;

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

  const handlePressIn = () => {
    if (isDisabled) return;
    translateY.value = withSpring(-Math.max(0, liftPx - 3), SPRING_PRESS);
    triggerHaptic();
  };

  const handlePressOut = () => {
    if (isDisabled) return;
    translateY.value = withSpring(-liftPx, SPRING_RELEASE);
  };

  const animatedFrontStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const sizePreset = styles[`${size}Size`];
  const textSizePreset = styles[`${size}Text`];
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={frontTextColor} />;
    }

    if (children) {
      return children;
    }

    return (
      <View style={styles.innerRow}>
        {icon && iconPosition === 'left' && (
          <Feather
            name={icon as any}
            size={iconSize}
            color={frontTextColor}
            style={styles.iconLeft}
          />
        )}
        {title ? (
          <Text
            style={[
              styles.defaultText,
              textSizePreset,
              { color: frontTextColor },
              textStyle,
            ]}
          >
            {title}
          </Text>
        ) : null}
        {icon && iconPosition === 'right' && (
          <Feather
            name={icon as any}
            size={iconSize}
            color={frontTextColor}
            style={styles.iconRight}
          />
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.outerContainer,
        { paddingTop: liftPx },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.shadowBase,
          { backgroundColor: shadowColor, borderRadius },
          fullWidth && styles.fullWidth,
        ]}
      >
        <Animated.View
          style={[
            styles.frontFace,
            sizePreset,
            { backgroundColor: frontColor, borderRadius },
            animatedFrontStyle,
            contentStyle,
          ]}
        >
          {renderContent()}
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.55,
  },
  shadowBase: {
    position: 'relative',
    overflow: 'visible',
  },
  frontFace: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultText: {
    ...Typography.bodySemibold,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Sizes
  smSize: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
  },
  mdSize: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
  },
  lgSize: {
    paddingHorizontal: 26,
    paddingVertical: 16,
    minHeight: 56,
  },
  // Text Sizes
  smText: {
    fontSize: 13,
  },
  mdText: {
    fontSize: 15,
  },
  lgText: {
    fontSize: 17,
  },
  // Icons
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
