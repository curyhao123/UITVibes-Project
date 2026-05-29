/**
 * ReelCard — Full-screen single reel with Instagram-style UI.
 *
 * Features:
 * - Double-tap to like (animated heart overlay)
 * - Single tap to pause/resume
 * - Right-side action buttons (like, comment, share, bookmark, volume)
 * - User avatar + follow button
 * - Caption with "more" expand
 * - Music track info with marquee
 * - Progress bar at bottom
 * - Verified badge support
 *
 * Supports both:
 * - Mock Reel type (with nested user object)
 * - API Reel type (with userId, ownerDisplayName, ownerAvatarUrl fields)
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '../constants/theme';
import { SPRING_BOUNCE, SPRING_SOFT, SPRING_PRESS } from '../animations/spring';
import { User } from '../data/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Unified Reel Interface ────────────────────────────────────────────────────

export interface ReelDisplayData {
  id: string;
  userId: string;
  user: User;
  videoUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  music?: string;
  musicArtist?: string;
  likes: number;
  comments: number;
  views?: number;
  shares?: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  createdAt?: string;
}

// ─── Animated Heart Overlay (double-tap like) ──────────────────────────────────

interface AnimatedHeartOverlayProps {
  visible: boolean;
}

export const AnimatedHeartOverlay: React.FC<AnimatedHeartOverlayProps> = ({ visible }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = 1;
      scale.value = withSequence(
        withSpring(1.4, SPRING_BOUNCE),
        withSpring(1.0, SPRING_BOUNCE),
      );
      opacity.value = withDelay(600, withTiming(0, { duration: 300 }));
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.heartOverlay, animatedStyle]} pointerEvents="none">
      <Feather name="heart" size={100} color={AppColors.primary} fill={AppColors.primary} />
    </Animated.View>
  );
};

// ─── Mini Like Counter (shows on double-tap) ───────────────────────────────────

interface MiniLikeCounterProps {
  visible: boolean;
}

export const MiniLikeCounter: React.FC<MiniLikeCounterProps> = ({ visible }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSequence(
        withSpring(0, SPRING_SOFT),
        withDelay(800, withTiming(0, { duration: 300 })),
      );
      opacity.value = withDelay(600, withTiming(0, { duration: 300 }));
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.miniLikeCounter, animatedStyle]} pointerEvents="none">
      <Feather name="heart" size={16} color="white" fill={AppColors.primary} />
      <Text style={styles.miniLikeText}>+1</Text>
    </Animated.View>
  );
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ReelProgressBarProps {
  isPlaying: boolean;
  progress: number;
}

export const ReelProgressBar: React.FC<ReelProgressBarProps> = ({
  isPlaying,
  progress,
}) => {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

// ─── Action Button ────────────────────────────────────────────────────────────

interface ActionButtonProps {
  icon: string;
  label: string;
  filled?: boolean;
  activeColor?: string;
  onPress: () => void;
  onPressIn?: () => void;
  isActive?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  filled = false,
  activeColor = AppColors.primary,
  onPress,
  onPressIn,
  isActive = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={(e) => {
        e.stopPropagation?.();
        onPressIn?.();
        onPress();
      }}
      style={styles.actionButton}
    >
      <Feather
        name={icon as any}
        size={28}
        color={isActive ? activeColor : 'white'}
        fill={filled || isActive ? activeColor : undefined}
        strokeWidth={1.5}
      />
      {label ? <Text style={styles.actionLabel}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

// ─── User Avatar with Follow Button ───────────────────────────────────────────

interface UserAvatarProps {
  user: User;
  onUserPress: () => void;
  onFollowPress: () => void;
  onPressIn?: () => void;
  isCurrentUser?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  onUserPress,
  onFollowPress,
  onPressIn,
  isCurrentUser = false,
}) => {
  const showFollowButton = user.isFollowing === false && !isCurrentUser;

  // Animation values
  const buttonScale = useSharedValue(1);
  const buttonOpacity = useSharedValue(1);
  const avatarBounce = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const handleFollowPress = (e: any) => {
    e?.stopPropagation?.();
    onPressIn?.();

    // Ripple animation
    rippleScale.value = 0;
    rippleOpacity.value = 0.6;
    rippleScale.value = withTiming(2, { duration: 400 });
    rippleOpacity.value = withTiming(0, { duration: 400 });

    // Button scale down + fade out
    buttonScale.value = withSequence(
      withSpring(0.6, { damping: 15, stiffness: 400 }),
      withTiming(0, { duration: 200 })
    );
    buttonOpacity.value = withTiming(0, { duration: 200 });

    // Avatar bounce
    avatarBounce.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    // Call the actual follow handler
    onFollowPress();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: buttonOpacity.value,
  }));

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarBounce.value }],
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  return (
    <View style={styles.userAvatarContainer}>
      {/* Ripple effect behind button */}
      <Animated.View
        style={[
          styles.followRipple,
          rippleAnimatedStyle,
        ]}
        pointerEvents="none"
      />

      <Animated.View style={avatarAnimatedStyle}>
        <TouchableOpacity
          onPress={(e) => {
            e?.stopPropagation?.();
            onPressIn?.();
            onUserPress();
          }}
          activeOpacity={0.8}
        >
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
              style={styles.avatar}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {showFollowButton && (
        <Animated.View style={buttonAnimatedStyle}>
          <TouchableOpacity
            style={styles.followBtn}
            onPress={handleFollowPress}
            activeOpacity={1}
          >
            <View style={styles.followBtnInner}>
              <Feather name="plus" size={12} color="white" strokeWidth={3} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

// ─── Caption Component ─────────────────────────────────────────────────────────

interface CaptionProps {
  username: string;
  caption: string;
  isVerified?: boolean;
}

export const Caption: React.FC<CaptionProps> = ({
  username,
  caption,
  isVerified = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = caption.length > 80;

  return (
    <View style={styles.captionContainer}>
      <Text style={styles.captionUsername}>
        @{username}
        {isVerified && (
          <Feather
            name="check-circle"
            size={14}
            color={AppColors.primary}
            style={styles.verifiedBadge}
          />
        )}
      </Text>
      <Text style={styles.captionText} numberOfLines={expanded ? undefined : 2}>
        {caption}
      </Text>
      {shouldTruncate && (
        <Pressable onPress={() => setExpanded(!expanded)}>
          <Text style={styles.moreText}>
            {expanded ? 'less' : 'more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

// ─── Music Track ─────────────────────────────────────────────────────────────

interface MusicTrackProps {
  music?: string;
  artist?: string;
}

export const MusicTrack: React.FC<MusicTrackProps> = ({ music, artist }) => {
  return (
    <View style={styles.musicContainer}>
      <Feather name="music" size={14} color="white" style={styles.musicIcon} />
      <View style={styles.musicTextContainer}>
        <Text style={styles.musicText} numberOfLines={1}>
          {music || 'Original audio'}
          {artist && ` - ${artist}`}
        </Text>
      </View>
    </View>
  );
};

// ─── Play/Pause Indicator ─────────────────────────────────────────────────────

interface PlayPauseIndicatorProps {
  visible: boolean;
  isPaused?: boolean;
}

export const PlayPauseIndicator: React.FC<PlayPauseIndicatorProps> = ({ visible, isPaused = false }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withDelay(400, withTiming(0, { duration: 200 })),
      );
      scale.value = withSequence(
        withSpring(1.2, SPRING_BOUNCE),
        withSpring(1.0, SPRING_SOFT),
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.playPauseContainer, animatedStyle]} pointerEvents="none">
      <View style={styles.playPauseBg}>
        <Feather name={isPaused ? 'play' : 'pause'} size={40} color="white" />
      </View>
    </Animated.View>
  );
};

// ─── Main Reel Card ───────────────────────────────────────────────────────────

interface ReelCardProps {
  item: ReelDisplayData;
  isActive: boolean;
  isPaused: boolean;
  itemHeight: number;
  bottomPadding?: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onUserPress: () => void;
  onFollow: () => void;
  isCurrentUser?: boolean;
}

export const ReelCard: React.FC<ReelCardProps> = ({
  item,
  isActive,
  isPaused,
  itemHeight,
  bottomPadding = 0,
  onLike,
  onComment,
  onShare,
  onUserPress,
  onFollow,
  isCurrentUser = false,
}) => {
  const insets = useSafeAreaInsets();
  const [showHeart, setShowHeart] = useState(false);
  const [isLiked, setIsLiked] = useState(item.isLiked);
  const [showPlayPause, setShowPlayPause] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastTap = useRef<number>(0);
  const videoRef = useRef<Video>(null);
  const buttonPressedRef = useRef(false);

  // Set flag to prevent card's onPress from triggering when button is pressed
  // Must stay true long enough to cover the entire touch sequence (touchstart → touchend)
  // iOS can delay touch events, so use 500ms to safely cover the double-tap threshold
  const handleButtonPress = useCallback(() => {
    buttonPressedRef.current = true;
    setTimeout(() => {
      buttonPressedRef.current = false;
    }, 500);
  }, []);

  // Determine if video should play: active AND not paused globally
  const shouldPlay = isActive && !isPaused;

  // Control video playback
  useEffect(() => {
    if (!videoRef.current) return;

    if (shouldPlay) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
    }
  }, [shouldPlay]);

  // Seek to beginning when becoming active
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.setPositionAsync(0);
    }
  }, [isActive]);

  const handlePress = useCallback(() => {
    if (buttonPressedRef.current) {
      buttonPressedRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap - like
      setShowHeart(true);
      if (!isLiked) {
        setIsLiked(true);
        onLike();
      }
      setTimeout(() => setShowHeart(false), 1000);
    } else {
      // Single tap - toggle play/pause (only when not globally paused)
      if (!isPaused) {
        videoRef.current?.pauseAsync();
      } else {
        videoRef.current?.playAsync();
      }
      setShowPlayPause(true);
      setTimeout(() => setShowPlayPause(false), 600);
    }
    lastTap.current = now;
  }, [isLiked, isPaused, onLike]);

  const handleLike = useCallback(() => {
    setIsLiked(!isLiked);
    onLike();
  }, [isLiked, onLike]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Determine background image URL
  const backgroundUrl = item.thumbnailUrl || `https://picsum.photos/seed/${item.id}/400/800`;

  return (
    <Pressable style={[styles.card, { height: itemHeight }]} onPress={handlePress}>
      {/* Background Video - extends edge-to-edge, full height */}
      {item.videoUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          style={[styles.background, { height: itemHeight }]}
          resizeMode="cover"
          isLooping
          shouldPlay={shouldPlay}
          isMuted={false}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded) {
              const duration = status.duration || 1;
              const position = status.positionMillis || 0;
              setProgress(position / (duration * 1000));
            }
          }}
        />
      ) : (
        <Image
          source={{ uri: backgroundUrl }}
          style={[styles.background, { height: itemHeight }]}
          resizeMode="cover"
        />
      )}

      {/* Dark gradient overlay */}
      <View style={styles.gradient} />

      {/* Play/Pause indicator */}
      <PlayPauseIndicator visible={showPlayPause} isPaused={isPaused} />

      {/* Heart overlay (double-tap) */}
      <AnimatedHeartOverlay visible={showHeart} />

      {/* Bottom gradient for text readability - positioned above tab bar */}
      <View style={[styles.bottomGradient, { bottom: bottomPadding }]} />

      {/* Right side actions - positioned above tab bar */}
      <View 
        style={[styles.rightActions, { bottom: bottomPadding + 60 }]}
        pointerEvents="box-none"
      >
        <View pointerEvents="auto">
          <UserAvatar
            user={item.user}
            onUserPress={onUserPress}
            onFollowPress={onFollow}
            onPressIn={handleButtonPress}
            isCurrentUser={isCurrentUser}
          />
        </View>

        <View pointerEvents="auto">
          <ActionButton
            icon="heart"
            label={formatCount(item.likes)}
            filled={isLiked}
            onPress={handleLike}
            onPressIn={handleButtonPress}
            isActive={isLiked}
          />
        </View>

        <View pointerEvents="auto">
          <ActionButton
            icon="message-circle"
            label={formatCount(item.comments)}
            onPress={onComment}
            onPressIn={handleButtonPress}
          />
        </View>

        <View pointerEvents="auto">
          <ActionButton
            icon="send"
            label=""
            onPress={onShare}
            onPressIn={handleButtonPress}
          />
        </View>

        {/* Music disc */}
        <View style={styles.musicDisc} pointerEvents="auto">
          <View style={styles.musicDiscInner}>
            <Image
              source={{ uri: item.user.avatar || 'https://i.pravatar.cc/150' }}
              style={styles.musicDiscCover}
            />
          </View>
        </View>
      </View>

      {/* Bottom content - positioned above tab bar */}
      <View 
        style={[styles.bottomContent, { paddingBottom: bottomPadding + 16 }]}
        pointerEvents="none"
      >
        {item.caption && (
          <Caption
            username={item.user.username}
            caption={item.caption}
            isVerified={item.user.isVerified}
          />
        )}

        <MusicTrack music={item.music} artist={item.musicArtist} />
      </View>

      {/* Progress bar - positioned above tab bar */}
      <View 
        style={[styles.progressWrapper, { paddingBottom: bottomPadding }]}
        pointerEvents="none"
      >
        <ReelProgressBar isPlaying={isActive} progress={progress} />
      </View>
    </Pressable>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
  },
  background: {
    width: SCREEN_WIDTH,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  miniLikeCounter: {
    position: 'absolute',
    top: '40%',
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  miniLikeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  playPauseContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playPauseBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 8,
    bottom: 140,
    alignItems: 'center',
  },
  userAvatarContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
    padding: 2,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  followBtn: {
    marginTop: -12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  followBtnInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  followRipple: {
    position: 'absolute',
    top: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppColors.primary,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 18,
  },
  actionLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  musicDisc: {
    marginTop: 10,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  musicDiscInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  musicDiscCover: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  bottomContent: {
    position: 'absolute',
    left: 12,
    right: 70,
    bottom: 40,
  },
  captionContainer: {
    marginBottom: 8,
  },
  captionUsername: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  captionText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    lineHeight: 18,
  },
  moreText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  musicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  musicIcon: {
    marginRight: 6,
  },
  musicTextContainer: {
    maxWidth: 180,
  },
  musicText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 1,
  },
});
