import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { User } from '../data/mockData';
import { AppColors } from '../constants/theme';

interface AvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large' | 'story';
  showBorder?: boolean;
  isViewed?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  size = 'medium',
  showBorder = false,
  isViewed = false,
}) => {
  const getSize = (): number => {
    switch (size) {
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

  const avatarSize = getSize();

  const getBorderStyle = (): object => {
    if (!showBorder) return {};
    if (size === 'small') {
      return isViewed ? styles.borderSmall : styles.borderSmallActive;
    }
    if (size === 'story') {
      return isViewed ? styles.borderStory : styles.borderStoryActive;
    }
    return isViewed ? styles.border : styles.borderActive;
  };

  return (
    <View style={[styles.container, getBorderStyle()]}>
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      >
        <Image
          source={{ uri: user.avatar }}
          style={[
            styles.image,
            {
              width: avatarSize - 4,
              height: avatarSize - 4,
              borderRadius: (avatarSize - 4) / 2,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 2,
  },
  avatar: {
    backgroundColor: AppColors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    backgroundColor: AppColors.border,
  },
  border: {
    borderWidth: 3,
    borderColor: AppColors.border,
    borderRadius: 45,
  },
  borderActive: {
    borderWidth: 3,
    borderColor: AppColors.primary,
    borderRadius: 45,
  },
  borderSmall: {
    borderWidth: 2,
    borderColor: AppColors.border,
    borderRadius: 18,
  },
  borderSmallActive: {
    borderWidth: 2,
    borderColor: AppColors.primary,
    borderRadius: 18,
  },
  borderStory: {
    borderWidth: 2,
    borderColor: AppColors.border,
    borderRadius: 32,
  },
  borderStoryActive: {
    borderWidth: 2,
    borderColor: AppColors.primary,
    borderRadius: 32,
  },
});
