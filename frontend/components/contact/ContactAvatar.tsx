import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors, borderRadius } from '../../constants/theme';
import { Typography } from '../../constants/typography';

interface ContactAvatarProps {
  initials: string;
  avatarBg: string;
  size?: number;
}

/**
 * Clean avatar placeholder using initials + tinted background.
 * Fallback when no real avatar URL is available.
 *
 * Design rationale:
 * - Initials in a soft-tinted circle — professional and friendly
 * - Size is flexible via prop (default 52px for modal use)
 * - Background color is admin-specific (passed from config)
 * - Uses Typography statNumber for a bold, centered initial display
 */
export const ContactAvatar = memo(function ContactAvatar({
  initials,
  avatarBg,
  size = 52,
}: ContactAvatarProps) {
  const innerSize = size;

  return (
    <View
      style={[
        styles.container,
        {
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: avatarBg,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize: Math.round(innerSize * 0.34) },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  initials: {
    ...Typography.statNumber,
    color: AppColors.text,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
});
