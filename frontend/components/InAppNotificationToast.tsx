/**
 * InAppNotificationToast
 *
 * Instagram-style banner toast for real-time notifications.
 * - Renders at top of screen (below status bar) when a new notification arrives via SignalR.
 * - Auto-dismisses after a configurable duration.
 * - Tap → navigate to the relevant target (post / profile / message).
 * - Stays in sync with notification count (cleared on mark-read).
 * - Hidden when user is currently on the Notifications history screen.
 *
 * Mount this ONCE in the root layout (AppLayoutInner).
 */

import { Feather } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { getUserById } from '../services/api';
import { createLogger } from '../utils/logger';
import {
  onNewNotification,
  type NewNotificationHandler,
} from '../services/notificationHubService';
import type { Notification } from '../services/notificationService';

const log = createLogger('InAppToast');

// ─── Constants ──────────────────────────────────────────────────────────────
const TOAST_DURATION_MS = 4_000;
const ENTER_DURATION_MS = 220;
const EXIT_DURATION_MS = 180;
const ANIM_TOP_OFFSET = -120;

// ─── Type-specific metadata (icon + color) ─────────────────────────────────
const TYPE_META: Record<
  string,
  { name: keyof typeof Feather.glyphMap; color: string }
> = {
  NewFollower: { name: 'user-plus', color: '#3B82F6' },
  PostLiked: { name: 'heart', color: '#EF4444' },
  PostCommented: { name: 'message-circle', color: '#3B82F6' },
  Mentioned: { name: 'at-sign', color: '#A855F7' },
  Tagged: { name: 'tag', color: '#A855F7' },
  NewMessage: { name: 'message-square', color: '#10B981' },
  MessageRead: { name: 'check-circle', color: '#10B981' },
};

const getTypeMeta = (type: string) =>
  TYPE_META[type] ?? { name: 'bell', color: '#6B7280' } as const;

// ─── Build a short title for the banner ───────────────────────────────────
function buildTitle(n: Notification): string {
  // For NewMessage, content already includes "X sent N messages"
  if (n.type === 'NewMessage') return 'New Message';
  switch (n.type) {
    case 'NewFollower': return 'New Follower';
    case 'PostLiked': return 'Liked Your Post';
    case 'PostCommented': return 'New Comment';
    case 'Mentioned': return 'You Were Mentioned';
    case 'Tagged': return 'You Were Tagged';
    case 'MessageRead': return 'Message Read';
    default: return 'New Notification';
  }
}

// ─── Resolve the screen to navigate to ─────────────────────────────────────
function resolveTarget(n: Notification): string | null {
  switch (n.type) {
    case 'NewFollower':
      return `/profile/${n.actorId}`;
    case 'PostLiked':
    case 'PostCommented':
    case 'Tagged':
    case 'Mentioned':
      return `/post/${n.entityId}`;
    default:
      return null;
  }
}

// ─── Actor info (avatar + name) for the toast ─────────────────────────────
interface ActorInfo {
  avatar: string;
  username: string;
  displayName: string;
}

// Module-level cache so we don't re-fetch the same actor across toasts
const actorCache = new Map<string, ActorInfo>();
const inflightActors = new Map<string, Promise<ActorInfo | null>>();

async function fetchActor(actorId: string): Promise<ActorInfo | null> {
  if (!actorId) return null;
  const cached = actorCache.get(actorId);
  if (cached) return cached;
  if (inflightActors.has(actorId)) return inflightActors.get(actorId)!;
  const p = (async () => {
    try {
      const user: any = await getUserById(actorId);
      if (!user) return null;
      const info: ActorInfo = {
        avatar: user.avatar || '',
        username: user.username || user.handle || '',
        displayName:
          user.displayName || user.fullName || user.username || 'User',
      };
      actorCache.set(actorId, info);
      return info;
    } catch (err) {
      log.warn('fetchActor failed', actorId, err);
      return null;
    } finally {
      inflightActors.delete(actorId);
    }
  })();
  inflightActors.set(actorId, p);
  return p;
}

// ─── Component ─────────────────────────────────────────────────────────────
export const InAppNotificationToast: React.FC = () => {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Current visible toast (single banner — Instagram pattern)
  const [toast, setToast] = useState<Notification | null>(null);
  const [actor, setActor] = useState<ActorInfo | null>(null);

  const translateY = useSharedValue(ANIM_TOP_OFFSET);
  const opacity = useSharedValue(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard to prevent overlapping shows
  const isShowingRef = useRef(false);

  // ─── Hide on Notifications history screen + Message screen ───────────────
  // Check segments[0..n] for "notifications" / "message" segment
  const shouldHideToast = (() => {
    const segs = segments as readonly string[];
    if (!segs || segs.length === 0) return false;
    return segs.some(
      (s) =>
        s === 'notifications' ||
        s === 'notification' ||
        s === 'message',
    );
  })();

  // ─── Dismiss logic ────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    isShowingRef.current = false;
    opacity.value = withTiming(0, { duration: EXIT_DURATION_MS });
    translateY.value = withTiming(
      ANIM_TOP_OFFSET,
      { duration: EXIT_DURATION_MS },
      (finished) => {
        if (finished) runOnJS(clearToast)();
      },
    );
  }, [opacity, translateY]);

  const clearToast = useCallback(() => {
    setToast(null);
    setActor(null);
  }, []);

  // ─── Show logic ───────────────────────────────────────────────────────
  const show = useCallback(
    async (n: Notification) => {
      // Already showing a toast — replace after current finishes
      if (isShowingRef.current) {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }
        // Quick fade-out then re-enter
        opacity.value = withTiming(0, { duration: 100 }, () => {
          runOnJS(setToastAndAnimate)(n);
        });
        return;
      }
      setToastAndAnimate(n);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const setToastAndAnimate = useCallback(
    (n: Notification) => {
      isShowingRef.current = true;
      setToast(n);
      // Reset position offscreen, then animate in
      translateY.value = ANIM_TOP_OFFSET;
      opacity.value = 0;
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      opacity.value = withTiming(1, { duration: ENTER_DURATION_MS });

      // Auto-dismiss after duration
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, TOAST_DURATION_MS);

      // Lazily fetch actor info (avatar, name)
      if (n.actorId) {
        fetchActor(n.actorId).then((info) => {
          // Only update if this is still the current toast
          setActor((prev) => info ?? prev);
        });
      }
    },
    [dismiss, opacity, translateY],
  );

  // ─── Tap handler ──────────────────────────────────────────────────────
  const handlePress = useCallback(() => {
    if (!toast) return;
    const target = resolveTarget(toast);
    dismiss();
    if (target) {
      // small delay so the toast can finish animating out
      setTimeout(() => router.push(target as any), 120);
    }
  }, [toast, dismiss, router]);

  // ─── Subscribe to SignalR events ─────────────────────────────────────
  useEffect(() => {
    const handler: NewNotificationHandler = (n) => {
      // Don't show on auth screens (in case SignalR connects before redirect)
      const segStr = (segments as string[]).join('/');
      if (segStr.startsWith('auth/') || segStr.startsWith('auth')) return;
      show(n);
    };
    const off = onNewNotification(handler);
    return off;
  }, [show, segments]);

  // ─── Auto-hide if we navigated to history / message screen ──────────────
  useEffect(() => {
    if (shouldHideToast && toast) {
      dismiss();
    }
  }, [shouldHideToast, toast, dismiss]);

  // ─── Cleanup timer on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // ─── Animated styles ──────────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  const meta = getTypeMeta(toast.type);
  const title = buildTitle(toast);
  const message = toast.content || '';

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8 },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.banner,
          {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
          Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
            },
            android: {
              elevation: 6,
            },
          }),
        ]}
      >
        {/* Avatar with type badge */}
        <View style={styles.avatarWrap}>
          {actor?.avatar ? (
            <Image
              source={{ uri: actor.avatar }}
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Feather name="user" size={20} color={colors.iconMuted} />
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: meta.color }]}>
            <Feather name={meta.name} size={10} color="#FFFFFF" />
          </View>
        </View>

        {/* Text content */}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>now</Text>
          </View>
          <Text
            style={[styles.message, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {/* BE already embeds actorName in content (e.g. "X sent you 5 messages.")
                so FE just renders message — NO prepend to avoid duplicate. */}
            {message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10_000,
    elevation: 10_000,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textWrap: {
    flex: 1,
    marginRight: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    lineHeight: 17,
  },
});
