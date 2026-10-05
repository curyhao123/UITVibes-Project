/**
 * MessageListItem — Swipeable message conversation item with dynamic dark mode.
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { layoutPadding } from '../constants/theme';
import { Typography } from '../constants/typography';
import { Conversation, User } from '../data/mockData';
import { triggerHaptic } from '../hooks/useMicroInteractions';
import { formatDistanceToNow } from '../utils/time';
import { useTheme } from '../context/ThemeContext';
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
  const { colors, isDark } = useTheme();

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
        backgroundColor: colors.error,
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
        style={[
          styles.convItem,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
          hasUnread && {
            backgroundColor: isDark
              ? `${colors.primary}18`
              : `${colors.primary}0C`,
          },
        ]}
      >
        <View style={styles.convItemInner}>
          {/* Avatar on the left */}
          {isGroup ? (
            <View
              style={[
                styles.groupAvatar,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="users" size={24} color={colors.iconMuted} strokeWidth={2} />
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

          {/* Conversation info */}
          <View style={styles.convContent}>
            <View style={styles.convTop}>
              <Text
                style={[
                  styles.convName,
                  { color: colors.text },
                  hasUnread && styles.convNameBold,
                ]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text style={[styles.convTime, { color: colors.textMuted }]}>
                {conversation.lastMessage?.createdAt &&
                  formatDistanceToNow(new Date(conversation.lastMessage.createdAt))}
              </Text>
            </View>

            <View style={styles.convBottom}>
              <Text
                style={[
                  styles.convLastMessage,
                  { color: colors.textSecondary },
                  hasUnread && { color: colors.text, fontWeight: '600' },
                ]}
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
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
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

const styles = StyleSheet.create({
  convItem: {
    borderBottomWidth: 1.5,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  convNameBold: {
    fontWeight: '700',
  },
  convTime: {
    ...Typography.meta,
    fontSize: 12,
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
    flex: 1,
    letterSpacing: -0.1,
  },
  unreadBadge: {
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
