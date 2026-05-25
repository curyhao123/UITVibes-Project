/**
 * ShareSheet — Bottom sheet for sharing reels.
 * Instagram-style share options with messaging apps and copy link.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppColors } from '../constants/theme';
import { SPRING_SOFT, TIMING_FAST } from '../animations/spring';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 320;

interface ShareOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  reelId: string;
  caption: string;
  username: string;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  visible,
  onClose,
  reelId,
  caption,
  username,
}) => {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_SOFT);
      backdropOpacity.value = withTiming(1, TIMING_FAST);
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, SPRING_SOFT);
      backdropOpacity.value = withTiming(0, TIMING_FAST);
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleNativeShare = useCallback(async () => {
    try {
      const result = await Share.share({
        message: `Check out this reel by @${username} on UITVibes!\n\n"${caption}"\n\nhttps://uitvibes.com/reels/${reelId}`,
        title: `Reel by @${username}`,
      });
      if (result.action === Share.sharedAction) {
        onClose();
      }
    } catch (error) {
      console.log('Share error:', error);
    }
  }, [username, caption, reelId, onClose]);

  const handleCopyLink = useCallback(() => {
    // In a real app, you'd copy the link to clipboard
    // For now, we'll just close the sheet
    onClose();
  }, [onClose]);

  const handleMessage = useCallback(() => {
    const url = Platform.select({
      ios: 'sms:',
      android: 'sms:?',
    });
    Linking.openURL(
      `${url}body=Check out this reel by @${username} on UITVibes! https://uitvibes.com/reels/${reelId}`,
    );
    onClose();
  }, [username, reelId, onClose]);

  const handleWhatsApp = useCallback(() => {
    const message = encodeURIComponent(
      `Check out this reel by @${username} on UITVibes!\n\n"${caption}"\n\nhttps://uitvibes.com/reels/${reelId}`,
    );
    Linking.openURL(`whatsapp://send?text=${message}`);
    onClose();
  }, [username, caption, reelId, onClose]);

  const handleTelegram = useCallback(() => {
    const message = encodeURIComponent(
      `Check out this reel by @${username} on UITVibes!\n\n"${caption}"\n\nhttps://uitvibes.com/reels/${reelId}`,
    );
    Linking.openURL(`tg://msg?text=${message}`);
    onClose();
  }, [username, caption, reelId, onClose]);

  const handleFacebook = useCallback(() => {
    Linking.openURL(
      `https://www.facebook.com/sharer/sharer.php?u=https://uitvibes.com/reels/${reelId}`,
    );
    onClose();
  }, [reelId, onClose]);

  const handleTwitter = useCallback(() => {
    const text = encodeURIComponent(
      `Check out this reel by @${username} on UITVibes! "${caption}"`,
    );
    const url = encodeURIComponent(`https://uitvibes.com/reels/${reelId}`);
    Linking.openURL(`https://twitter.com/intent/tweet?text=${text}&url=${url}`);
    onClose();
  }, [username, caption, reelId, onClose]);

  const shareOptions: ShareOption[] = [
    {
      id: 'message',
      name: 'Message',
      icon: 'message-circle',
      color: '#0084FF',
      onPress: handleMessage,
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'share-2',
      color: '#25D366',
      onPress: handleWhatsApp,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'send',
      color: '#0088cc',
      onPress: handleTelegram,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      onPress: handleFacebook,
    },
    {
      id: 'twitter',
      name: 'X',
      icon: 'twitter',
      color: '#000000',
      onPress: handleTwitter,
    },
    {
      id: 'copy',
      name: 'Copy Link',
      icon: 'link',
      color: AppColors.textMuted,
      onPress: handleCopyLink,
    },
  ];

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={AppColors.text} />
          </TouchableOpacity>
        </View>

        {/* Share options grid */}
        <View style={styles.optionsGrid}>
          {shareOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[styles.optionIconContainer, { backgroundColor: option.color }]}
              >
                <Feather
                  name={option.icon as any}
                  size={22}
                  color="white"
                  strokeWidth={2}
                />
              </View>
              <Text style={styles.optionName}>{option.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Native share button */}
        <TouchableOpacity
          style={styles.nativeShareButton}
          onPress={handleNativeShare}
          activeOpacity={0.7}
        >
          <Feather name="share" size={20} color={AppColors.text} />
          <Text style={styles.nativeShareText}>Share to...</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
  },
  closeButton: {
    padding: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  optionItem: {
    alignItems: 'center',
    width: 70,
    marginBottom: 20,
  },
  optionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionName: {
    fontSize: 12,
    color: AppColors.text,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.borderLight,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  nativeShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    backgroundColor: AppColors.borderLight,
    borderRadius: 12,
  },
  nativeShareText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
    marginLeft: 8,
  },
});
