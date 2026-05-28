/**
 * AnimatedModal — Modal with smooth appearance/disappearance animations.
 *
 * Features:
 * - Scale + fade entrance animation
 * - Backdrop fade animation
 * - Multiple variants: default, slide-up, fullscreen
 * - Drag to dismiss (optional)
 * - Press outside to dismiss (optional)
 * - Haptic feedback on open/close
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Modal as RNModal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppColors, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ModalVariant = 'default' | 'slide-up' | 'fullscreen' | 'centered';
type BackdropVariant = 'default' | 'blur' | 'dark';

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: ModalVariant;
  backdropVariant?: BackdropVariant;
  dismissable?: boolean;
  dismissOnBackdropPress?: boolean;
  dismissOnDragDown?: boolean;
  animationDuration?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  contentStyle?: any;
  testID?: string;
}

const SPRING_CONFIG = {
  damping: 18,
  stiffness: 200,
  mass: 0.8,
};

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  visible,
  onClose,
  children,
  variant = 'default',
  backdropVariant = 'default',
  dismissable = true,
  dismissOnBackdropPress = true,
  dismissOnDragDown = false,
  animationDuration = 300,
  springConfig,
  contentStyle,
  testID,
}) => {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(variant === 'slide-up' ? 100 : 0);
  const backdropOpacity = useSharedValue(0);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (!dismissable) return;
    triggerHaptic();
    onClose();
  }, [dismissable, onClose, triggerHaptic]);

  useEffect(() => {
    if (visible) {
      // Opening animation
      triggerHaptic();
      backdropOpacity.value = withTiming(1, { duration: animationDuration * 0.6 });
      opacity.value = withTiming(1, { duration: animationDuration * 0.6 });

      const config = springConfig || SPRING_CONFIG;

      if (variant === 'slide-up') {
        translateY.value = withSpring(0, config);
        scale.value = withSpring(1, config);
      } else if (variant === 'centered' || variant === 'default') {
        scale.value = withSequence(
          withSpring(1.05, { ...config, damping: config.damping! - 4 }),
          withSpring(1, { damping: config.damping! + 2, stiffness: config.stiffness! - 20 }),
        );
        translateY.value = withSpring(0, config);
      } else {
        scale.value = withSpring(1, config);
      }
    } else {
      // Closing animation
      backdropOpacity.value = withTiming(0, { duration: animationDuration * 0.4 });
      opacity.value = withTiming(0, { duration: animationDuration * 0.4 });

      const config = springConfig || SPRING_CONFIG;

      if (variant === 'slide-up') {
        translateY.value = withSpring(100, { ...config, damping: config.damping! + 5 });
      }
      scale.value = withTiming(0.8, { duration: animationDuration * 0.4 });
    }
  }, [visible, variant, animationDuration, springConfig]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    const baseTransform = [{ scale: scale.value }];

    if (variant === 'slide-up') {
      return {
        opacity: opacity.value,
        transform: [...baseTransform, { translateY: translateY.value }],
      };
    }

    return {
      opacity: opacity.value,
      transform: baseTransform,
    };
  });

  const getBackdropColor = () => {
    switch (backdropVariant) {
      case 'dark':
        return 'rgba(0, 0, 0, 0.7)';
      case 'blur':
        return 'rgba(0, 0, 0, 0.3)';
      default:
        return 'rgba(0, 0, 0, 0.5)';
    }
  };

  const getModalStyle = () => {
    switch (variant) {
      case 'fullscreen':
        return styles.fullscreenContent;
      case 'slide-up':
        return styles.slideUpContent;
      default:
        return styles.defaultContent;
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissable ? handleClose : undefined}
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: getBackdropColor() },
            backdropStyle,
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={dismissOnBackdropPress ? handleClose : undefined}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={[styles.modalContainer, getModalStyle(), contentAnimatedStyle, contentStyle]}
          pointerEvents="box-none"
        >
          {/* Drag indicator for slide-up variant */}
          {variant === 'slide-up' && (
            <View style={styles.dragIndicator}>
              <View style={styles.dragIndicatorBar} />
            </View>
          )}

          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

// ─── Bottom Sheet Variant ─────────────────────────────────────────────────────

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dismissable?: boolean;
  height?: number | string;
  contentStyle?: any;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  dismissable = true,
  height = 'auto',
  contentStyle,
}) => {
  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      variant="slide-up"
      backdropVariant="dark"
      dismissable={dismissable}
      contentStyle={[
        styles.bottomSheet,
        height !== 'auto' && { height },
        contentStyle,
      ]}
    >
      {children}
    </AnimatedModal>
  );
};

// ─── Alert Dialog Variant ─────────────────────────────────────────────────────

interface AlertDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  dismissable?: boolean;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  visible,
  onClose,
  title,
  message,
  children,
  dismissable = true,
}) => {
  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      variant="centered"
      backdropVariant="dark"
      dismissable={dismissable}
      animationDuration={200}
      contentStyle={styles.alertDialog}
    >
      <View style={styles.alertContent}>
        <View style={styles.alertIconContainer}>
          <Animated.View style={styles.alertIconPlaceholder} />
        </View>
        <Animated.Text style={styles.alertTitle}>{title}</Animated.Text>
        {message && (
          <Animated.Text style={styles.alertMessage}>{message}</Animated.Text>
        )}
        {children}
      </View>
    </AnimatedModal>
  );
};

// ─── Loading Overlay ─────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  backdropVariant?: BackdropVariant;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  backdropVariant = 'dark',
}) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.loadingOverlay, animatedStyle]}>
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSpinner} />
        {message && (
          <Animated.Text style={styles.loadingText}>{message}</Animated.Text>
        )}
      </View>
    </Animated.View>
  );
};

// ─── Toast Card ─────────────────────────────────────────────────────────────

interface ToastCardProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'info' | 'warning';
}

export const ToastCard: React.FC<ToastCardProps> = ({
  visible,
  onClose,
  children,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(-100, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastCard, animatedStyle]}>
      <TouchableOpacity
        style={styles.toastCardTouchable}
        onPress={onClose}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    zIndex: 2,
  },
  defaultContent: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.xl,
    padding: 24,
    minWidth: 280,
    maxWidth: SCREEN_WIDTH * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  slideUpContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: AppColors.surfaceElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 34,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fullscreenContent: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: AppColors.surfaceElevated,
  },
  dragIndicator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicatorBar: {
    width: 36,
    height: 4,
    backgroundColor: AppColors.border,
    borderRadius: 2,
  },
  bottomSheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  alertDialog: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 28,
  },
  alertContent: {
    alignItems: 'center',
  },
  alertIconContainer: {
    marginBottom: 16,
  },
  alertIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${AppColors.primary}20`,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: AppColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContainer: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    minWidth: 120,
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: AppColors.borderLight,
    borderTopColor: AppColors.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: AppColors.text,
    fontWeight: '500',
  },
  toastCard: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
  },
  toastCardTouchable: {
    padding: 14,
  },
});
