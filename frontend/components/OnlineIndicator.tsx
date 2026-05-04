/**
 * OnlineIndicator — a small green dot that overlays an avatar.
 *
 * Usage:
 *   <View style={styles.avatarWrapper}>
 *     <Image source={...} style={styles.avatar} />
 *     <OnlineIndicator size={avatarSize} isOnline={isOnline} />
 *   </View>
 *
 * The dot is positioned at the bottom-right corner, with a white border
 * so it is visible on any background.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppColors } from '../constants/theme';

interface OnlineIndicatorProps {
  /** Size of the parent avatar (used to scale the dot proportionally) */
  avatarSize: number;
  /** Whether the user is currently online */
  isOnline: boolean;
  /** Small offset from the edge of the avatar */
  offset?: number;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  avatarSize,
  isOnline,
  offset,
}) => {
  if (!isOnline) return null;

  const dotSize = Math.max(10, Math.round(avatarSize * 0.28));
  const margin = offset ?? Math.max(1, Math.round(avatarSize * 0.04));

  return (
    <View
      style={[
        styles.dot,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          bottom: margin,
          right: margin,
        },
      ]}
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: AppColors.surfaceElevated,
  },
});
