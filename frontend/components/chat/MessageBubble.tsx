import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { useTheme } from '../../context/ThemeContext';
import { formatDistanceToNow } from '../../utils/time';
import { Avatar } from '../Avatar';

export interface MessageBubbleProps {
  item: any;
  index: number;
  previousMessage?: any;
  nextMessage?: any;
  isMine: boolean;
  sender?: any;
  isOnline?: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function shouldShowTimeDivider(currentMessage: any, previousMessage?: any): boolean {
  if (!currentMessage?.createdAt) return false;
  const currentTime = new Date(currentMessage.createdAt).getTime();
  if (Number.isNaN(currentTime)) return false;

  if (!previousMessage?.createdAt) return true;

  const previousTime = new Date(previousMessage.createdAt).getTime();
  if (Number.isNaN(previousTime)) return false;

  return currentTime - previousTime >= 30 * 60 * 1000;
}

const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const formatMessageClockTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function formatMessageSectionTime(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameCalendarDay(date, today)) {
    return `Today, ${formatMessageClockTime(date)}`;
  }

  if (isSameCalendarDay(date, yesterday)) {
    return `Yesterday, ${formatMessageClockTime(date)}`;
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${formatMessageClockTime(date)}`;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  item,
  previousMessage,
  nextMessage,
  isMine,
  sender,
  isOnline = false,
  isSelected,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();
  const showTimeDivider = shouldShowTimeDivider(item, previousMessage);
  const nextHasTimeDivider = nextMessage
    ? shouldShowTimeDivider(nextMessage, item)
    : false;
  const groupedWithPrevious =
    !showTimeDivider && previousMessage?.senderId === item.senderId;
  const groupedWithNext =
    !nextHasTimeDivider && nextMessage?.senderId === item.senderId;
  const startsSenderGroup = !groupedWithPrevious;
  const showAvatar = !isMine && startsSenderGroup;
  const isImageMessage = item.messageType === 'image' || !!item.image;
  const hasText = !!item.text;

  const bubbleGroupStyle = isMine
    ? groupedWithPrevious && groupedWithNext
      ? styles.bubbleMineMiddle
      : groupedWithNext
        ? styles.bubbleMineFirst
        : groupedWithPrevious
          ? styles.bubbleMineLast
          : styles.bubbleMineSingle
    : groupedWithPrevious && groupedWithNext
      ? styles.bubbleTheirsMiddle
      : groupedWithNext
        ? styles.bubbleTheirsFirst
        : groupedWithPrevious
          ? styles.bubbleTheirsLast
          : styles.bubbleTheirsSingle;

  return (
    <View>
      {showTimeDivider && (
        <View style={styles.timeDivider}>
          <View style={[styles.timeDividerPill, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.timeDividerText, { color: colors.textMuted }]}>
              {formatMessageSectionTime(item.createdAt)}
            </Text>
          </View>
        </View>
      )}
      <View
        style={[
          styles.messageRow,
          isMine && styles.messageRowMine,
          groupedWithPrevious && styles.messageRowGrouped,
          showTimeDivider && styles.messageRowAfterDivider,
        ]}
      >
        {!isMine && (
          <View style={styles.msgAvatarContainer}>
            {showAvatar ? (
              <Avatar
                user={sender ?? ({ id: item.senderId, username: '', displayName: '', avatar: '', bio: '', followers: 0, following: 0, posts: 0, isVerified: false } as any)}
                size="tiny"
                showOnlineIndicator={true}
                isOnline={isOnline}
              />
            ) : (
              <View style={styles.msgAvatarPlaceholder} />
            )}
          </View>
        )}
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={500}
          style={({ pressed }) => [
            styles.bubbleContainer,
            isMine ? styles.bubbleContainerMine : styles.bubbleContainerTheirs,
            pressed && styles.bubblePressed,
          ]}
        >
          {!isMine && showAvatar && (
            <Text style={[styles.senderName, { color: colors.text }]}>
              {sender?.displayName || sender?.username || 'User'}
            </Text>
          )}
          {isImageMessage ? (
            <View style={styles.messageContentStack}>
              <View
                style={[
                  styles.bubble,
                  styles.bubbleImageOnly,
                  bubbleGroupStyle,
                ]}
              >
                <Image
                  source={{ uri: item.image ?? '' }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </View>
              {hasText ? (
                <View
                  style={[
                    styles.bubble,
                    isMine
                      ? styles.bubbleMine
                      : [styles.bubbleTheirs, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                    bubbleGroupStyle,
                  ]}
                >
                  <Text style={[styles.messageText, { color: colors.text }, isMine && styles.messageTextMine]}>
                    {item.text}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : item.text ? (
            <View
              style={[
                styles.bubble,
                isMine
                  ? styles.bubbleMine
                  : [styles.bubbleTheirs, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }],
                bubbleGroupStyle,
              ]}
            >
              <Text style={[styles.messageText, { color: colors.text }, isMine && styles.messageTextMine]}>
                {item.text}
              </Text>
            </View>
          ) : null}
          {isSelected && (
            <View style={[styles.msgMeta, isMine && styles.msgMetaMine]}>
              <Text style={[styles.msgTime, { color: colors.textMuted }]}>
                {item.editedAt ? 'Edited - ' : ''}
                {formatDistanceToNow(new Date(item.createdAt))}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);
MessageBubble.displayName = 'MessageBubble';

const styles = StyleSheet.create({
  timeDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timeDividerPill: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 6,
  },
  timeDividerText: {
    ...Typography.caption,
    color: AppColors.textMuted,
    fontSize: 14,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-end',
  },
  messageRowGrouped: {
    marginBottom: 1,
  },
  messageRowAfterDivider: {
    marginTop: 2,
  },
  messageRowMine: {
    flexDirection: 'row-reverse',
  },
  msgAvatarContainer: {
    marginRight: 10,
    width: 28,
    height: 30,
    alignItems: 'center',
  },
  msgAvatarPlaceholder: {
    width: 28,
    height: 28,
  },
  bubbleContainer: {
    maxWidth: '75%',
  },
  bubbleContainerMine: {
    alignItems: 'flex-end',
  },
  bubbleContainerTheirs: {
    alignItems: 'flex-start',
  },
  bubblePressed: {
    opacity: 0.7,
  },
  senderName: {
    ...Typography.caption,
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 7,
  },
  messageContentStack: {
    gap: 6,
  },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  bubbleMine: {
    backgroundColor: AppColors.primary,
  },
  bubbleMineSingle: {},
  bubbleMineFirst: {
    borderBottomRightRadius: 4,
  },
  bubbleMineMiddle: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  bubbleMineLast: {
    borderTopRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: AppColors.surfaceElevated,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  bubbleImageOnly: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  bubbleTheirsSingle: {},
  bubbleTheirsFirst: {
    borderBottomLeftRadius: 4,
  },
  bubbleTheirsMiddle: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  bubbleTheirsLast: {
    borderTopLeftRadius: 4,
  },
  messageText: {
    ...Typography.body,
    color: AppColors.text,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  msgMetaMine: {
    justifyContent: 'flex-end',
  },
  msgTime: {
    ...Typography.caption,
    fontSize: 14,
    color: AppColors.textMuted,
  },
});
