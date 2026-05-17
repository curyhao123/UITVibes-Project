import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AppColors, borderRadius, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import defaultAvatar from '../../assets/images/default-avatar.png';
import { formatRelativeTime } from '../../utils/time';

export interface BlockedUserItemData {
  blockedId: string;
  blockedAt: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
}

interface BlockedUserItemProps {
  item: BlockedUserItemData;
  onUnblock: (item: BlockedUserItemData) => void;
  isUnblocking?: boolean;
  isLast?: boolean;
}

export const BlockedUserItem = memo(function BlockedUserItem({
  item,
  onUnblock,
  isUnblocking = false,
  isLast = false,
}: BlockedUserItemProps) {
  const handleUnblock = useCallback(() => {
    onUnblock(item);
  }, [item, onUnblock]);

  const relativeTime = formatRelativeTime(item.blockedAt);

  return (
    <View style={[styles.container, !isLast && styles.separator]}>
      {/* Avatar */}
      <Image
        source={item.avatarUrl ? { uri: item.avatarUrl } : defaultAvatar}
        style={styles.avatar}
        contentFit="cover"
        placeholder={defaultAvatar}
        transition={200}
      />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{item.username}
        </Text>
        {relativeTime ? (
          <Text style={styles.blockedTime}>{relativeTime}</Text>
        ) : null}
      </View>

      {/* Unblock button */}
      <TouchableOpacity
        style={[styles.unblockBtn, isUnblocking && styles.unblockBtnLoading]}
        activeOpacity={0.7}
        onPress={handleUnblock}
        disabled={isUnblocking}
      >
        {isUnblocking ? (
          <Text style={styles.unblockBtnLoadingText}>...</Text>
        ) : (
          <Text style={styles.unblockBtnText}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    backgroundColor: AppColors.surface,
    gap: 12,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.border,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  displayName: {
    ...Typography.bodySemibold,
    color: AppColors.text,
  },
  username: {
    ...Typography.meta,
    color: AppColors.textMuted,
  },
  blockedTime: {
    ...Typography.caption,
    color: AppColors.textMuted,
    marginTop: 2,
  },
  unblockBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
    flexShrink: 0,
  },
  unblockBtnLoading: {
    opacity: 0.5,
  },
  unblockBtnText: {
    ...Typography.captionSemibold,
    color: AppColors.text,
  },
  unblockBtnLoadingText: {
    ...Typography.captionSemibold,
    color: AppColors.textMuted,
  },
});
