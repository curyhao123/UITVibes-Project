/**
 * MessageListItem — Swipeable message conversation item.
 *
 * Features:
 * - Swipe left: Delete conversation
 * - Swipe right: Archive conversation (or mute)
 * - Unread indicator with badge
 * - Online status indicator
 * - Smooth animations with haptic feedback
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SwipeableRow } from './SwipeableRow';
import { Avatar } from './Avatar';
import { OnlineIndicator } from './OnlineIndicator';
import { Conversation, User } from '../data/mockData';
import { AppColors, layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { formatDistanceToNow } from '../utils/time';
import { triggerHaptic } from '../hooks/useMicroInteractions';

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
  const router = useRouter();

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
  const avatarUri = other?.avatar || conversation.avatar;
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
        {isGroup ? (
          <View style={styles.groupAvatar}>
            <Feather name="users" size={22} color={AppColors.iconMuted} strokeWidth={2} />
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
      </SwipeableTouchable>
    </SwipeableRow>
  );
};

// ─── Swipeable Touchable ─────────────────────────────────────────────────────

import { TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
    backgroundColor: AppColors.surface,
  },
  convItemUnread: {
    backgroundColor: `${AppColors.primary}08`,
  },
  avatarContainer: {
    width: 52,
    height: 52,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convContent: {
    flex: 1,
    marginLeft: 12,
  },
  convTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  convName: {
    ...Typography.bodyMedium,
    flex: 1,
    color: AppColors.text,
  },
  convNameBold: {
    fontWeight: '700',
  },
  convTime: {
    ...Typography.meta,
    color: AppColors.iconMuted,
    marginLeft: 6,
  },
  convBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convLastMessage: {
    ...Typography.caption,
    fontSize: 13,
    color: AppColors.iconMuted,
    flex: 1,
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
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
});
