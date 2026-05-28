/**
 * PremiumHeader — iOS-inspired header with glassmorphism and large title.
 *
 * Features:
 * - Large title that shrinks on scroll (iOS style)
 * - Glassmorphism blur background when scrolled
 * - Animated notification badge
 * - Smooth transitions
 */

import React, { useEffect, useRef, useState, memo, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ScrollView,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { User } from '../data/mockData';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';

const HEADER_MAX_HEIGHT = 100;
const HEADER_MIN_HEIGHT = 56;
const TITLE_MAX_OPACITY = 1;
const TITLE_MIN_OPACITY = 0;
const LARGE_TITLE_MAX_SIZE = 32;
const LARGE_TITLE_MIN_SIZE = 18;

interface PremiumHeaderProps {
  /** Screen title */
  title: string;
  /** Large title (bigger, shown when at top) */
  largeTitle?: string;
  /** Show avatar on the left */
  showAvatar?: boolean;
  /** Avatar user data */
  avatarUser?: User | null;
  /** Right-side action node */
  rightAction?: ReactNode;
  /** Notification count (shows badge if > 0) */
  notificationCount?: number;
  /** Callback when notification icon pressed */
  onNotificationPress?: () => void;
  /** Scroll event from parent ScrollView/FlatList */
  scrollY?: Animated.Value;
  /** Custom header container style */
  headerStyle?: object;
}

export const PremiumHeader = memo(function PremiumHeader({
  title,
  largeTitle,
  showAvatar = false,
  avatarUser = null,
  rightAction,
  notificationCount = 0,
  onNotificationPress,
  scrollY,
  headerStyle,
}: PremiumHeaderProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Use provided scrollY or local value
  const headerScrollY = scrollY ?? animatedValue;

  // Title opacity (fades out as user scrolls)
  const titleOpacity = headerScrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [TITLE_MAX_OPACITY, TITLE_MAX_OPACITY, TITLE_MIN_OPACITY],
    extrapolate: 'clamp',
  });

  // Large title opacity (fades in when at top)
  const largeTitleOpacity = headerScrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Header height animation for smooth shrink
  const headerHeight = headerScrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  // Large title scale
  const largeTitleScale = headerScrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  // Large title translateY
  const largeTitleTranslateY = headerScrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  // Shadow opacity (appears when scrolled)
  const shadowOpacity = headerScrollY.interpolate({
    inputRange: [0, 20],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Badge scale animation
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(notificationCount);

  useEffect(() => {
    if (notificationCount > prevCount.current) {
      // New notification - bounce animation
      Animated.sequence([
        Animated.spring(badgeScale, {
          toValue: 1.3,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevCount.current = notificationCount;
  }, [notificationCount]);

  const handleAvatarPress = () => {
    router.push('/(tabs)/profile');
  };

  const handleBack = () => {
    router.back();
  };

  const displayLargeTitle = largeTitle ?? title;

  return (
    <Animated.View style={[styles.container, { height: headerHeight }, headerStyle]}>
      {/* Blur background when scrolled */}
      {isScrolled && (
        <BlurView
          intensity={80}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Solid background for non-blur devices */}
      <Animated.View
        style={[
          styles.background,
          { opacity: isScrolled ? 0.95 : 1 },
        ]}
      />

      {/* Shadow (appears on scroll) */}
      <Animated.View
        style={[
          styles.shadow,
          {
            opacity: shadowOpacity,
          },
        ]}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Left slot */}
        <View style={styles.leftSlot}>
          {showAvatar ? (
            <TouchableOpacity
              onPress={handleAvatarPress}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              {avatarUser ? (
                <Avatar user={avatarUser} size="small" />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={22} color={AppColors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Title + Large Title */}
        <View style={styles.titleContainer}>
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: titleOpacity,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Animated.Text>

          <Animated.Text
            style={[
              styles.largeTitle,
              {
                opacity: largeTitleOpacity,
                transform: [
                  { scale: largeTitleScale },
                  { translateY: largeTitleTranslateY },
                ],
              },
            ]}
            numberOfLines={1}
          >
            {displayLargeTitle}
          </Animated.Text>
        </View>

        {/* Right slot */}
        <View style={styles.rightSlot}>
          {rightAction ?? (
            <View style={styles.rightActions}>
              {/* Notification button with badge */}
              {onNotificationPress && (
                <TouchableOpacity
                  onPress={onNotificationPress}
                  style={styles.iconButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Feather name="bell" size={22} color={AppColors.text} />
                  {notificationCount > 0 && (
                    <Animated.View
                      style={[
                        styles.badge,
                        {
                          transform: [{ scale: badgeScale }],
                        },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </Animated.View>
                  )}
                </TouchableOpacity>
              )}

              {/* Settings button */}
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={styles.iconButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Feather name="settings" size={22} color={AppColors.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

// ─── ScrollableHeader wrapper ──────────────────────────────────────────────────

interface ScrollableHeaderProps {
  children: React.ReactNode;
  onScroll?: (scrollY: number) => void;
  onScrollChange?: (isScrolled: boolean) => void;
}

export class ScrollableHeader extends React.Component<
  ScrollableHeaderProps,
  { scrollY: Animated.Value }
> {
  scrollY = new Animated.Value(0);
  lastOffset = 0;

  constructor(props: ScrollableHeaderProps) {
    super(props);
    this.state = {
      scrollY: this.scrollY,
    };
  }

  handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: this.scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offset = event.nativeEvent.contentOffset.y;
        const isScrolled = offset > 20;
        this.props.onScroll?.(offset);
        if (isScrolled !== (this.lastOffset > 20)) {
          this.props.onScrollChange?.(isScrolled);
        }
        this.lastOffset = offset;
      },
    }
  );

  render() {
    return (
      <Animated.ScrollView
        onScroll={this.handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {this.props.children}
      </Animated.ScrollView>
    );
  }
}

// ─── Scroll Header Hook ────────────────────────────────────────────────────────

export function useScrollHeader() {
  const scrollY = new Animated.Value(0);
  const isScrolled = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [false, true],
    extrapolate: 'clamp',
  });

  return { scrollY, isScrolled };
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AppColors.background,
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.borderLight,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: layoutPadding,
    paddingBottom: 12,
  },
  leftSlot: {
    flexShrink: 0,
    width: 44,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  title: {
    ...Typography.screenTitle,
    color: AppColors.text,
    position: 'absolute',
    bottom: 8,
  },
  largeTitle: {
    fontSize: LARGE_TITLE_MAX_SIZE,
    fontWeight: '800',
    color: AppColors.text,
    letterSpacing: -0.8,
    position: 'absolute',
    bottom: 4,
  },
  rightSlot: {
    flexShrink: 0,
    width: 88,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2D3748',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.borderLight,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingTop: HEADER_MAX_HEIGHT,
  },
});
