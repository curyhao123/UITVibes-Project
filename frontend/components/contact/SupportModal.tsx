/**
 * SupportModal — modern animated bottom-sheet modal for contacting admin support.
 *
 * Features:
 * - Smooth slide-up animation using react-native-reanimated
 * - Backdrop blur via expo-blur
 * - Dismissible via backdrop tap, swipe-down gesture, or close button
 * - Admin list with avatar, name, role, description, and Facebook CTA
 * - Clean config-driven architecture (all data from adminContacts.ts)
 * - Instagram/Discord-style premium social app aesthetic
 *
 * Design rationale:
 * - Bottom sheet pattern: user context isn't lost, feels lightweight
 * - Backdrop blur keeps the page visible behind — context preserved
 * - Each admin is a tappable card with clear hierarchy
 * - Facebook button per admin is prominent but not aggressive
 * - Smooth spring animation (not abrupt Alert style)
 * - Rounded top corners + shadow make it feel like a floating panel
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  Dimensions,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ContactAvatar } from './ContactAvatar';
import { ADMIN_CONTACTS, type AdminContact } from '../../data/adminContacts';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SupportModalProps {
  visible: boolean;
  onClose: () => void;
}

const SHEET_HEIGHT = 420;
const SPRING_CONFIG = {
  damping: 22,
  stiffness: 280,
  mass: 0.9,
};

// ─── Admin Card ────────────────────────────────────────────────────────────────

interface AdminCardProps {
  admin: AdminContact;
  isFirst: boolean;
  isLast: boolean;
}

function AdminCard({ admin, isFirst, isLast }: AdminCardProps) {
  const handleFacebookPress = () => {
    Linking.openURL(admin.facebookUrl);
  };

  return (
    <View
      style={[
        styles.adminCard,
        isFirst && styles.adminCardFirst,
        isLast && styles.adminCardLast,
      ]}
    >
      {/* Avatar */}
      <ContactAvatar
        initials={admin.initials}
        avatarBg={admin.avatarBg}
        size={52}
      />

      {/* Info */}
      <View style={styles.adminInfo}>
        <Text style={styles.adminName}>{admin.name}</Text>
        <View style={styles.roleRow}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{admin.role}</Text>
          </View>
        </View>
        {admin.description && (
          <Text style={styles.adminDescription} numberOfLines={2}>
            {admin.description}
          </Text>
        )}
      </View>

      {/* Facebook CTA */}
      <TouchableOpacity
        style={styles.facebookBtn}
        activeOpacity={0.7}
        onPress={handleFacebookPress}
      >
        <Feather name="facebook" size={18} color="#1877F2" strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Backdrop ─────────────────────────────────────────────────────────────────

interface BackdropProps {
  opacity: Animated.SharedValue<number>;
  onPress: () => void;
}

function Backdrop({ opacity, onPress }: BackdropProps) {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(
        opacity.value,
        [0, 1],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View style={[styles.backdrop, animatedStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
    </Animated.View>
  );
}

// ─── Swipeable Handle ──────────────────────────────────────────────────────────

function SwipeHandle() {
  return <View style={styles.swipeHandle} />;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function SupportModal({ visible, onClose }: SupportModalProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(SHEET_HEIGHT, { damping: 30, stiffness: 300 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleClose = () => {
    'worklet';
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withSpring(SHEET_HEIGHT, { damping: 30, stiffness: 300 });
    runOnJS(onClose)();
  };

  const totalAdmins = ADMIN_CONTACTS.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Backdrop opacity={opacity} onPress={handleClose} />

      {/* Sheet */}
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <BlurView
          intensity={20}
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        {/* Handle + Header */}
        <View style={styles.header}>
          <SwipeHandle />
          <View style={styles.titleRow}>
            <View style={styles.headerIconWrap}>
              <Feather name="headphones" size={18} color={AppColors.primary} strokeWidth={2} />
            </View>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>Contact Admin Support</Text>
              <Text style={styles.subtitle}>
                Need help? Reach out to one of our admins.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={20} color={AppColors.iconMuted} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin list */}
        <View style={styles.adminList}>
          {ADMIN_CONTACTS.map((admin, index) => (
            <AdminCard
              key={admin.id}
              admin={admin}
              isFirst={index === 0}
              isLast={index === totalAdmins - 1}
            />
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    // Premium shadow: deep, diffused
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    paddingTop: 14,
    paddingHorizontal: layoutPadding,
    paddingBottom: 8,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    ...Typography.sectionTitle,
    color: AppColors.text,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  adminList: {
    marginHorizontal: layoutPadding,
    marginTop: 4,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    // Subtle inset shadow for depth
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: AppColors.surfaceElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.borderLight,
    gap: 12,
  },
  adminCardFirst: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  adminCardLast: {
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    borderBottomWidth: 0,
  },
  adminInfo: {
    flex: 1,
    minWidth: 0,
  },
  adminName: {
    ...Typography.bodySemibold,
    color: AppColors.text,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  roleBadge: {
    backgroundColor: `${AppColors.primary}12`,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    ...Typography.meta,
    color: AppColors.primary,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  adminDescription: {
    ...Typography.caption,
    color: AppColors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  facebookBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(24, 119, 242, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
