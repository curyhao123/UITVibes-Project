import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { borderRadius } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary };
      case 'secondary':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case 'ghost':
      default:
        return { backgroundColor: 'transparent' };
    }
  };

  const getVariantTextStyle = () => {
    switch (variant) {
      case 'primary':
        return { color: '#FFFFFF' };
      case 'secondary':
        return { color: colors.text };
      case 'outline':
      case 'ghost':
      default:
        return { color: colors.primary };
    }
  };

  return (
    <Animated.View style={{ flex: 1, width: '100%', transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.base,
          getVariantStyle(),
          styles[`${size}Size`],
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' ? '#fff' : colors.primary}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.text,
              getVariantTextStyle(),
              styles[`${size}Text`],
              textStyle,
            ]}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  // Sizes
  smSize: { height: 40, paddingHorizontal: 16 },
  mdSize: { height: 50, paddingHorizontal: 20 },
  lgSize: { height: 56, paddingHorizontal: 24 },
  // Disabled
  disabled: {
    opacity: 0.55,
  },
  // Text base
  text: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // Text sizes
  smText: { fontSize: 14 },
  mdText: { fontSize: 16 },
  lgText: { fontSize: 17 },
});

