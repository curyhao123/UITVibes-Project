/**
 * MessageListItem — Swipeable message conversation item.
 *
 * Features:
 * - Avatar on the left with live online status indicator
 * - Conversation name & last message clearly laid out to the right of the avatar
 * - High-contrast, easy-to-read typography for last message
 * - Emphasized separator border between items
 * - Swipe left: Delete conversation
 * - Swipe right: Archive conversation (or mute)
 * - Unread indicator with badge
 * - Smooth animations with haptic feedback
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { Conversation, User } from '../data/mockData';
import { triggerHaptic } from '../hooks/useMicroInteractions';
import { formatDistanceToNow } from '../utils/time';
import { Avatar } from './Avatar';
import { SwipeableRow } from './SwipeableRow';

interface MessageListItemProps {
  conversation: Conversation;
  currentUserId: string;
  isUserOnline: (userId: string) => boolean;
  onConversationPress: (conv: Conversation) => void;
  onDeleteConversation?: (convId: string) => void;
  onArchiveConversation?: (convId: string) => void;
  onMuteConversation?: (convId: string) => void;
}

export const MessageListItem: React.FC<MessageListItemProps> = ({
  conversation,
  currentUserId,
  isUserOnline,
  onConversationPress,
  onDeleteConversation,
  onArchiveConversation,
  onMuteConversation,
}) => {
  const getOtherMember = useCallback(
    (conv: Conversation): User | undefined => {
      return conv.members.find((m) => m.id !== currentUserId);
    },
    [currentUserId]
  );

  const other = getOtherMember(conversation);
  const hasUnread = conversation.unreadCount > 0;
  const isGroup = conversation.isGroup;
  const displayName = conversation.name || other?.displayName || 'Chat';
  const isOnline = other ? isUserOnline(other.id) : false;

  const isCurrentUser = (senderId: string): boolean => {
    return senderId === currentUserId;
  };

  const handlePress = useCallback(() => {
    triggerHaptic('light');
    onConversationPress(conversation);
  }, [conversation, onConversationPress]);

  const handleDelete = useCallback(() => {
    triggerHaptic('medium');
    Alert.alert(
      'Delete Conversation',
      `Delete conversation with ${displayName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteConversation?.(conversation.id),
        },
      ]
    );
  }, [conversation.id, displayName, onDeleteConversation]);

  const handleArchive = useCallback(() => {
    triggerHaptic('light');
    if (onArchiveConversation) {
      onArchiveConversation(conversation.id);
    } else if (onMuteConversation) {
      onMuteConversation(conversation.id);
    }
  }, [conversation.id, onArchiveConversation, onMuteConversation]);

  return (
    <SwipeableRow
      rightAction={{
        icon: 'trash-2',
        color: '#FFFFFF',
        backgroundColor: AppColors.error,
        label: 'Delete',
        onPress: handleDelete,
      }}
      leftAction={{
        icon: 'archive',
        color: '#FFFFFF',
        backgroundColor: '#8B7355',
        label: 'Archive',
        onPress: handleArchive,
      }}
      testID={`message-item-${conversation.id}`}
    >
      <SwipeableTouchable
        onPress={handlePress}
        style={[styles.convItem, hasUnread && styles.convItemUnread]}
      >
        <View style={styles.convItemInner}>
          {/* Avatar on the left */}
          {isGroup ? (
            <View style={styles.groupAvatar}>
              <Feather name="users" size={24} color={AppColors.iconMuted} strokeWidth={2} />
            </View>
          ) : (
            <View style={styles.avatarContainer}>
              <Avatar
                user={
                  other ??
                  ({
                    id: '',
                    username: '',
                    displayName: '',
                    avatar: '',
                    bio: '',
                    followers: 0,
                    following: 0,
                    posts: 0,
                    isVerified: false,
                  } as User)
                }
                size="medium"
                showOnlineIndicator={true}
                isOnline={isOnline}
              />
            </View>
          )}

          {/* Conversation info strictly to the right of the avatar */}
          <View style={styles.convContent}>
            <View style={styles.convTop}>
              <Text
                style={[styles.convName, hasUnread && styles.convNameBold]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text style={styles.convTime}>
                {conversation.lastMessage?.createdAt &&
                  formatDistanceToNow(new Date(conversation.lastMessage.createdAt))}
              </Text>
            </View>

            <View style={styles.convBottom}>
              <Text
                style={[styles.convLastMessage, hasUnread && styles.convLastMessageBold]}
                numberOfLines={1}
              >
                {isCurrentUser(conversation.lastMessage?.senderId ?? '')
                  ? 'You: '
                  : ''}
                {(() => {
                  if (conversation.lastMessage?.image) return '📷 Photo';
                  if (conversation.lastMessage?.messageType === 'image') return '📷 Photo';
                  return conversation.lastMessage?.text || 'No messages yet';
                })()}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {conversation.unreadCount > 99
                      ? '99+'
                      : conversation.unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </SwipeableTouchable>
    </SwipeableRow>
  );
};

interface SwipeableTouchableProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}

const SwipeableTouchable: React.FC<SwipeableTouchableProps> = ({
  children,
  onPress,
  style,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={style}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </TouchableOpacity>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  convItem: {
    backgroundColor: AppColors.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: AppColors.border,
  },
  convItemUnread: {
    backgroundColor: `${AppColors.primary}0C`,
  },
  convItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    width: '100%',
  },
  avatarContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  convContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  convTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  convName: {
    ...Typography.bodyMedium,
    flex: 1,
    color: AppColors.text,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  convNameBold: {
    fontWeight: '700',
    color: AppColors.text,
  },
  convTime: {
    ...Typography.meta,
    fontSize: 12,
    color: AppColors.textMuted,
    marginLeft: 8,
  },
  convBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convLastMessage: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.textSecondary,
    flex: 1,
    letterSpacing: -0.1,
  },
  convLastMessageBold: {
    fontWeight: '600',
    color: AppColors.text,
  },
  unreadBadge: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
