/**
 * Enhanced Toast System
 *
 * Features:
 * - Multiple toasts stack vertically
 * - Swipe to dismiss
 * - Progress bar showing remaining time
 * - Auto-dismiss with configurable duration
 * - Pause on hover (web)
 * - Different variants: success, error, info, warning
 */

import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedReaction,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppColors, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = SCREEN_WIDTH - 32;

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  index: number;
}

const VARIANT_CONFIG = {
  success: {
    icon: 'check-circle',
    bgColor: '#E8F5EE',
    iconColor: AppColors.success,
    textColor: AppColors.success,
    progressColor: AppColors.success,
  },
  error: {
    icon: 'x-circle',
    bgColor: '#FAECEC',
    iconColor: AppColors.error,
    textColor: AppColors.error,
    progressColor: AppColors.error,
  },
  info: {
    icon: 'info',
    bgColor: '#EDF4FF',
    iconColor: AppColors.primary,
    textColor: AppColors.primary,
    progressColor: AppColors.primary,
  },
  warning: {
    icon: 'alert-triangle',
    bgColor: '#FFF8E6',
    iconColor: '#E5A83D',
    textColor: '#B8860B',
    progressColor: '#E5A83D',
  },
};

// ─── Toast Item ──────────────────────────────────────────────────────────────

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, index }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const progress = useSharedValue(1);
  const contextX = useSharedValue(0);

  const config = VARIANT_CONFIG[toast.variant];
  const remainingTime = useRef(Date.now() + toast.duration);

  // Progress animation
  useEffect(() => {
    progress.value = withTiming(0, { duration: toast.duration }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)(toast.id);
      }
    });
  }, [toast.id, toast.duration]);

  // Entrance animation
  useEffect(() => {
    translateY.value = -100;
    opacity.value = 0;
    scale.value = 0.9;

    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 18, stiffness: 200 });
  }, []);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 150 });
    translateY.value = withTiming(-100, { duration: 150 }, () => {
      runOnJS(onDismiss)(toast.id);
    });
  }, [toast.id, onDismiss, opacity, translateY]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = event.translationY * 0.3;
    })
    .onEnd((event) => {
      const shouldDismiss =
        Math.abs(translateX.value) > TOAST_WIDTH * 0.4 || Math.abs(translateY.value) > 60;

      if (shouldDismiss) {
        translateX.value = withTiming(translateX.value > 0 ? TOAST_WIDTH : -TOAST_WIDTH, {
          duration: 150,
        });
        runOnJS(dismiss)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const swipeLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-TOAST_WIDTH, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const swipeRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, TOAST_WIDTH],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.toastContainer, cardStyle]}>
        {/* Swipe hint backgrounds */}
        <Animated.View style={[styles.swipeHint, styles.swipeLeft, swipeLeftStyle]}>
          <Feather name="trash-2" size={20} color="#FFFFFF" />
        </Animated.View>
        <Animated.View style={[styles.swipeHint, styles.swipeRight, swipeRightStyle]}>
          <Feather name="check" size={20} color="#FFFFFF" />
        </Animated.View>

        {/* Toast content */}
        <View style={[styles.toastContent, { backgroundColor: config.bgColor }]}>
          <View style={styles.toastMain}>
            <Feather
              name={config.icon as any}
              size={20}
              color={config.iconColor}
              strokeWidth={2.2}
            />
            <Text style={[styles.toastMessage, { color: config.textColor }]}>{toast.message}</Text>
          </View>

          {/* Progress bar */}
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: config.progressColor, opacity: 0.4 },
              progressStyle,
            ]}
          />
        </View>

        {/* Dismiss button */}
        <Animated.View style={styles.dismissButton}>
          <Animated.View style={styles.dismissTouchArea} onTouchEnd={dismiss}>
            <Feather name="x" size={16} color={config.iconColor} strokeWidth={2.5} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

// ─── Toast Container (renders all toasts) ───────────────────────────────────

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          index={index}
        />
      ))}
    </View>
  );
};

// ─── Toast Context & Provider ───────────────────────────────────────────────

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children, maxToasts = 3 }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration: number = 2500) => {
      const id = `toast-${++counterRef.current}`;
      const newToast: ToastData = { id, message, variant, duration };

      setToasts((prev) => {
        const updated = [newToast, ...prev].slice(0, maxToasts);
        return updated;
      });
    },
    [maxToasts]
  );

  const dismiss = useCallback((id?: string) => {
    if (id) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    } else {
      setToasts((prev) => prev.slice(0, -1));
    }
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  );
  const error = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  );
  const info = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  );
  const warning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, dismiss, dismissAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// ─── Legacy Toast Component (for backwards compatibility) ────────────────────

interface LegacyToastProps {
  visible: boolean;
  message: string;
  type?: ToastVariant;
  duration?: number;
  onHide: () => void;
}

export function Toast({
  visible,
  message,
  type = 'success',
  duration = 2500,
  onHide,
}: LegacyToastProps) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(-20, { duration: 150 });
        opacity.value = withTiming(0, { duration: 150 }, () => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  const config = VARIANT_CONFIG[type];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.legacyContainer,
        { backgroundColor: config.bgColor },
        animatedStyle,
      ]}
    >
      <View style={styles.legacyContent}>
        <Feather name={config.icon as any} size={20} color={config.iconColor} strokeWidth={2.2} />
        <Text style={[styles.legacyMessage, { color: config.textColor }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastContainer: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  swipeLeft: {
    right: 0,
    backgroundColor: AppColors.error,
  },
  swipeRight: {
    left: 0,
    backgroundColor: AppColors.success,
  },
  toastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toastMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastMessage: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  dismissButton: {
    marginLeft: 8,
  },
  dismissTouchArea: {
    padding: 4,
  },

  // Legacy styles
  legacyContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
  },
  legacyContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legacyMessage: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
