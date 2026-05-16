/**
 * MessageContextMenu — bottom sheet triggered by long-press on a chat message.
 *
 * UX spec:
 *  - Long-press threshold: 500ms (must not move more than 10px during hold)
 *  - Appears as a slide-up bottom sheet (mobile) / centered overlay (desktop)
 *  - Options: "Edit message" · "Delete message"
 *  - Dismiss: tap outside, swipe down, or press Escape
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { AppColors, borderRadius } from '../constants/theme';
import { SPRING_GENTLE } from '../animations/spring';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = Platform.OS === 'web' || SCREEN_WIDTH >= 640;

export interface MessageMenuActions {
  onEdit: () => void;
  onDelete: () => void;
}

interface MessageContextMenuProps {
  visible: boolean;
  actions: MessageMenuActions;
  onClose: () => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  visible,
  actions,
  onClose,
}) => {
  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, SPRING_GENTLE);
    } else {
      opacity.value = withTiming(0, { duration: 180 }, () => {
        translateY.value = 400;
      });
      translateY.value = withTiming(400, { duration: 180 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleEdit = () => {
    onClose();
    setTimeout(() => actions.onEdit(), 250);
  };

  const handleDelete = () => {
    onClose();
    setTimeout(() => actions.onDelete(), 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View style={[styles.backdropFill, backdropStyle]} />
        </Pressable>

        {/* Sheet / Overlay */}
        {IS_DESKTOP ? (
          <Animated.View style={[styles.desktopOverlay, sheetStyle]}>
            {renderMenu(handleEdit, handleDelete)}
          </Animated.View>
        ) : (
          <Animated.View style={[styles.bottomSheet, sheetStyle]}>
            {/* Drag handle */}
            <View style={styles.dragHandle} />
            {renderMenu(handleEdit, handleDelete)}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

function renderMenu(onEdit: () => void, onDelete: () => void) {
  return (
    <View style={styles.menu}>
      {/* Edit */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <Feather name="edit-2" size={18} color={AppColors.textSecondary} />
        <Text style={styles.menuItemText}>Edit message</Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Delete */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onDelete}
        activeOpacity={0.7}
      >
        <Feather name="trash-2" size={18} color={AppColors.error} />
        <Text style={[styles.menuItemText, styles.deleteText]}>Delete message</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomSheet: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 34,
    paddingHorizontal: 8,
    paddingTop: 10,
  },
  desktopOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -140 }, { translateY: -70 }],
    width: 280,
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.border,
    alignSelf: 'center',
    marginBottom: 6,
  },
  menu: {
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: borderRadius.sm,
  },
  menuItemText: {
    fontSize: 15,
    color: AppColors.textSecondary,
  },
  deleteText: {
    color: AppColors.error,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderLight,
    marginHorizontal: 12,
  },
});
