import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { User } from '../data/mockData';
import { AppColors } from '../constants/theme';
import defaultAvatar from '../assets/images/default-avatar.png';

interface AvatarProps {
  user: User;
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'story';
  showBorder?: boolean;
  isViewed?: boolean;
  /** When true, renders a green dot if the user is online. */
  showOnlineIndicator?: boolean;
  /** Override online status — if provided, uses this instead of global state. */
  isOnline?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'medium',
  showBorder = false,
  isViewed = false,
  showOnlineIndicator = false,
  isOnline: isOnlineOverride,
}) => {
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    setLoadFailed(false);
  }, [user.avatar]);

  const getSize = (): number => {
    switch (size) {
      case 'tiny':
        return 28;
      case 'small':
        return 32;
      case 'story':
        return 60;
      case 'large':
        return 80;
      default:
        return 44;
    }
  };

  const getBorderColor = (): string => {
    if (!showBorder) return 'transparent';
    return isViewed ? AppColors.border : AppColors.primary;
  };

  const getBorderWidth = (): number => {
    if (!showBorder) return 0;
    switch (size) {
      case 'tiny':
      case 'small':
        return 2;
      case 'story':
        return 2;
      case 'large':
        return 3;
      default:
        return 3;
    }
  };

  const avatarSize = getSize();
  const borderWidth = getBorderWidth();
  const borderColor = getBorderColor();
  const uri = user.avatar?.trim();
  const showRemote = Boolean(uri) && !loadFailed;

  // Border + circular container wraps the Image
  const outerSize = avatarSize + borderWidth * 2;

  // Online indicator dot: positioned at bottom-right corner of the avatar
  const dotSize = Math.max(10, Math.round(avatarSize * 0.28));
  const dotOffset = Math.max(1, Math.round(avatarSize * 0.06));

  return (
    <View
      style={[
        styles.borderWrap,
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          borderWidth,
          borderColor,
        },
      ]}
    >
      <Image
        source={showRemote ? { uri: uri! } : defaultAvatar}
        onError={() => setLoadFailed(true)}
        style={[
          styles.avatarImage,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
        contentFit="cover"
      />

      {/* Online indicator dot — only shown when explicitly online */}
      {showOnlineIndicator && isOnlineOverride && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              bottom: dotOffset - borderWidth,
              right: dotOffset - borderWidth,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  borderWrap: {
    overflow: 'visible',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatarImage: {
    backgroundColor: AppColors.border,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: AppColors.surfaceElevated,
  },
});
