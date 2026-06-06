/**
 * message/chat/[id].tsx — Chat detail screen.
 *
 * Lives inside message/_layout.tsx (a nested Stack inside the Tabs navigator).
 * Because expo-router nests navigators, pushing this screen automatically
 * hides the parent Tabs navigator's tab bar — no manual hiding needed.
 *
 * Architecture:
 *   Root Stack
 *   └── (tabs)                    ← ModernTabBar renders here
 *       └── message               ← nested Stack (hides parent tab bar)
 *           ├── index              ← Inbox
 *           └── chat/[id]         ← This screen (tab bar hidden ✅)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../context/AppContext';
import * as api from '../../../services/api';
import {
  addMemberToGroup,
  removeMemberFromGroup,
  leaveGroup,
  getConversationById,
} from '../../../services/messageService';
import {
  blockUser,
  getBlockStatus,
  unblockUser,
  type BlockStatusDto,
} from '../../../services/blockService';
import { invokeHub } from '../../../services/signalrService';
import { Avatar } from '../../../components/Avatar';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { OnlineIndicator } from '../../../components/OnlineIndicator';
import { MessageContextMenu } from '../../../components/MessageContextMenu';
import { EditMessageModal } from '../../../components/EditMessageModal';
import { formatDistanceToNow } from '../../../utils/time';
import { AppColors, layoutPadding } from '../../../constants/theme';
import { Typography } from '../../../constants/typography';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    conversations,
    messages,
    conversationMembers,
    isLoadingMessages,
    loadMessages,
    sendMessage,
    setMessages,
    setActiveConversation,
    markMessagesRead,
    partnerTyping,
    isUserOnline,
    editMessage,
    deleteMessage,
    refreshConversations,
  } = useApp();

  const [messageText, setMessageText] = useState('');
  const isSendingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const messagesEndRef = useRef<View>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const iStartedTypingRef = useRef(false);
  const [convMembers, setConvMembers] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; messageId: string; text: string }>({
    visible: false,
    messageId: '',
    text: '',
  });
  const [editModal, setEditModal] = useState<{ visible: boolean; messageId: string; text: string }>({
    visible: false,
    messageId: '',
    text: '',
  });
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showChatActions, setShowChatActions] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const [blockStatus, setBlockStatus] = useState<BlockStatusDto | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'remove'; member: any }
    | { type: 'leave' }
    | { type: 'deleteMessage'; messageId: string }
    | null
  >(null);
  const [localConfirmAction, setLocalConfirmAction] = useState<
    | { type: 'remove'; member: any }
    | { type: 'leave' }
    | null
  >(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Find the conversation from the global list by id
  const conversation = conversations.find((c) => c.id === id) ?? null;

  // ── Set activeConversation so AppContext SignalR listeners fire ─────
  useEffect(() => {
    if (conversation) {
      setActiveConversation(conversation);
    }
    return () => {
      setActiveConversation(null);
    };
  }, [id, conversation?.id]);

  // ── Derived state ──────────────────────────────────────────────────────
  const other = conversation
    ? conversation.members.find((m: any) => m.id !== currentUser?.id)
    : null;
  const isGroup = conversation?.isGroup ?? false;
  const headerName = conversation?.name || other?.displayName || 'Chat';
  const otherUser = !isGroup ? other : null;
  const isChatBlocked = !isGroup && !!(blockStatus?.blockedByMe || blockStatus?.blockedMe);
  const blockedNoticeTitle = blockStatus?.blockedByMe
    ? 'You blocked this user'
    : 'Messaging unavailable';
  const blockedNoticeMessage = blockStatus?.blockedByMe
    ? 'Go to Settings > Blocked Accounts to unblock them before sending messages.'
    : 'This user has blocked you, so you cannot send messages in this chat.';
  const chatActionLabel = blockStatus?.blockedByMe ? 'Unblock user' : 'Block user';
  const chatActionIcon = blockStatus?.blockedByMe ? 'user-check' : 'user-x';
  const isAdmin =
    conversation?.adminIds?.includes(currentUser?.id ?? '') ?? false;
  const memberIds = new Set(convMembers.map((member) => member.id));
  const addableFriends = friends.filter((friend) => {
    if (friend.id === currentUser?.id || memberIds.has(friend.id)) return false;
    const query = friendSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      friend.username?.toLowerCase().includes(query) ||
      friend.displayName?.toLowerCase().includes(query)
    );
  });

  // ── Load messages on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!conversation) return;
    setConvMembers(conversation.members);
    loadMessages(conversation.id)
      .then(async (loadedMessages) => {
        const lastMessage = loadedMessages[loadedMessages.length - 1];
        await markMessagesRead(conversation.id, lastMessage?.id);
      })
      .catch(() => {});
  }, [id, conversation?.id]);

  const refreshBlockStatus = useCallback(async () => {
    if (isGroup || !otherUser?.id) {
      setBlockStatus(null);
      return;
    }

    try {
      const status = await getBlockStatus(otherUser.id);
      setBlockStatus(status);
      if (status.blockedByMe || status.blockedMe) {
        setMessageText('');
      }
    } catch {
      setBlockStatus(null);
    }
  }, [isGroup, otherUser?.id]);

  useEffect(() => {
    void refreshBlockStatus();
  }, [refreshBlockStatus]);

  useFocusEffect(
    useCallback(() => {
      void refreshBlockStatus();
    }, [refreshBlockStatus]),
  );

  const handleBlockUserAction = useCallback(() => {
    if (!otherUser?.id) return;

    const displayName = otherUser.displayName || otherUser.username || 'this user';
    const shouldUnblock = !!blockStatus?.blockedByMe;

    Alert.alert(
      shouldUnblock ? 'Unblock user?' : 'Block user?',
      shouldUnblock
        ? `You will be able to send messages to ${displayName} again.`
        : `${displayName} will not be able to message, follow, or interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: shouldUnblock ? 'Unblock' : 'Block',
          style: shouldUnblock ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (shouldUnblock) {
                await unblockUser(otherUser.id);
              } else {
                await blockUser(otherUser.id);
                setMessageText('');
              }
              await refreshBlockStatus();
              await refreshConversations();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.message ??
                  err?.message ??
                  (shouldUnblock
                    ? 'Failed to unblock this user.'
                    : 'Failed to block this user.'),
              );
            }
          },
        },
      ],
    );
  }, [
    blockStatus?.blockedByMe,
    isGroup,
    otherUser?.displayName,
    otherUser?.id,
    otherUser?.username,
    refreshBlockStatus,
    refreshConversations,
  ]);

  const handleHeaderAction = useCallback(() => {
    if (isGroup) {
      setShowGroupSettings(true);
      return;
    }

    if (otherUser?.id) {
      setShowChatActions(true);
    }
  }, [isGroup, otherUser?.id]);

  useEffect(() => {
    if (!showAddMember || !currentUser?.id) return;
    let cancelled = false;
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const data = await api.getFriends(currentUser.id, 200);
        if (!cancelled) setFriends(data);
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setIsLoadingFriends(false);
      }
    };
    loadFriends();
    return () => {
      cancelled = true;
    };
  }, [showAddMember, currentUser?.id]);

  // ── Scroll helpers ─────────────────────────────────────────────────────
  const userScrolledUpRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const pendingOwnMessageScrollRef = useRef(false);
  const lastMessageIdRef = useRef<string | null>(null);
  const scrollToBottomThreshold = 240;

  const scrollToBottom = useCallback((animated = true) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated });
    }
  }, []);

  const markAtBottom = useCallback(() => {
    userScrolledUpRef.current = false;
    setShowScrollToBottomButton(false);
  }, []);

  const scheduleScrollToBottom = useCallback(
    (animated = true) => {
      requestAnimationFrame(() => {
        scrollToBottom(animated);
        markAtBottom();
      });
    },
    [markAtBottom, scrollToBottom],
  );

  useEffect(() => {
    userScrolledUpRef.current = false;
    initialScrollDoneRef.current = false;
    pendingOwnMessageScrollRef.current = false;
    lastMessageIdRef.current = null;
    setShowScrollToBottomButton(false);
  }, [id]);

  useEffect(() => {
    if (messages.length > 0 && !initialScrollDoneRef.current) {
      scrollToBottom(false);
      initialScrollDoneRef.current = true;
      markAtBottom();
    }
  }, [messages.length, markAtBottom, scrollToBottom, id]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const isNewLastMessage = lastMessage.id !== lastMessageIdRef.current;
    lastMessageIdRef.current = lastMessage.id;

    if (
      isNewLastMessage &&
      pendingOwnMessageScrollRef.current &&
      lastMessage.senderId === currentUser?.id
    ) {
      pendingOwnMessageScrollRef.current = false;
      scheduleScrollToBottom(true);
    }
  }, [currentUser?.id, messages, scheduleScrollToBottom]);

  const handleMessagesScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const shouldShowButton = distanceFromBottom > scrollToBottomThreshold;

    userScrolledUpRef.current = shouldShowButton;
    setShowScrollToBottomButton((current) =>
      current === shouldShowButton ? current : shouldShowButton,
    );
  }, [scrollToBottomThreshold]);

  const handleScrollToBottomPress = useCallback(() => {
    scheduleScrollToBottom(true);
  }, [scheduleScrollToBottom]);

  // ── Image picker ────────────────────────────────────────────────────
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to send images.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const removeSelectedImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  // ── Send ───────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!conversation || isSendingRef.current || isChatBlocked) return;

    const hasText = messageText.trim().length > 0;
    const hasImage = !!selectedImage;

    if (!hasText && !hasImage) return;

    isSendingRef.current = true;
    pendingOwnMessageScrollRef.current = true;

    if (hasImage && !hasText) {
      setIsUploadingImage(true);
    }

    const text = messageText.trim();
    setMessageText('');
    if (hasImage) {
      setSelectedImage(null);
    }

    try {
      if (hasImage) {
        await sendMessage(conversation.id, {
          content: text,
          mediaUri: selectedImage,
        });
      } else {
        await sendMessage(conversation.id, text);
      }
    } catch (err: any) {
      pendingOwnMessageScrollRef.current = false;
      if (hasImage) {
        setSelectedImage(selectedImage);
      }
      if (!hasImage) {
        setMessageText(text);
      }
      Alert.alert('Error', err?.message ?? 'Failed to send message.');
    } finally {
      isSendingRef.current = false;
      setIsUploadingImage(false);
    }
  }, [messageText, selectedImage, conversation, sendMessage, isChatBlocked]);

  const handleSendDirect = useCallback(
    async (text: string) => {
      if (!conversation || isSendingRef.current || isChatBlocked) return;
      isSendingRef.current = true;
      pendingOwnMessageScrollRef.current = true;
      try {
        await sendMessage(conversation.id, text);
      } catch (err: any) {
        pendingOwnMessageScrollRef.current = false;
        Alert.alert('Error', err?.message ?? 'Failed to send message.');
      } finally {
        isSendingRef.current = false;
      }
    },
    [conversation, sendMessage, isChatBlocked],
  );

  const handleAddMember = useCallback(
    async (userId: string) => {
      if (!conversation) return;
      setAddingMemberId(userId);
      try {
        await addMemberToGroup(conversation.id, userId);
        await refreshConversations();
        // Reload conversation to get updated members list
        const updated = await getConversationById(conversation.id);
        if (updated) {
          setConvMembers(updated.members);
        }
        setShowAddMember(false);
        setFriendSearch('');
      } catch (err: any) {
        Alert.alert(
          'Error',
          err?.response?.data?.message ?? err?.message ?? 'Failed to add member.',
        );
      } finally {
        setAddingMemberId(null);
      }
    },
    [conversation, refreshConversations],
  );

  const handleRemoveMember = useCallback(
    (member: any) => {
      setLocalConfirmAction({ type: 'remove', member });
    },
    [],
  );

  const performRemoveMember = useCallback(
    async (member: any) => {
      if (!conversation) return;
      setRemovingMemberId(member.id);
      try {
        await removeMemberFromGroup(conversation.id, member.id);
        await refreshConversations();
        // Reload conversation to get updated members list
        const updated = await getConversationById(conversation.id);
        if (updated) {
          setConvMembers(updated.members);
        }
        setLocalConfirmAction(null);
      } catch (err: any) {
        Alert.alert(
          'Error',
          err?.response?.data?.message ?? err?.message ?? 'Failed to remove member.',
        );
      } finally {
        setRemovingMemberId(null);
      }
    },
    [conversation, refreshConversations],
  );

  const handleLeaveGroup = useCallback(() => {
    setLocalConfirmAction({ type: 'leave' });
  }, []);

  const performLeaveGroup = useCallback(async () => {
    if (!conversation) return;
    setIsLeavingGroup(true);
    try {
      await leaveGroup(conversation.id);
      await refreshConversations();
      setLocalConfirmAction(null);
      setShowGroupSettings(false);
      router.back();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message ?? err?.message ?? 'Failed to leave group.',
      );
    } finally {
      setIsLeavingGroup(false);
    }
  }, [conversation, refreshConversations, router]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const isCurrentUser = (senderId: string) => senderId === currentUser?.id;

  const getSenderFromMembers = (senderId: string) => {
    if (!conversation) return undefined;
    return conversation.members.find((m: any) => m.id === senderId);
  };

  const shouldShowTimeDivider = (currentMessage: any, previousMessage?: any) => {
    if (!currentMessage?.createdAt) return false;
    const currentTime = new Date(currentMessage.createdAt).getTime();
    if (Number.isNaN(currentTime)) return false;

    if (!previousMessage?.createdAt) return true;

    const previousTime = new Date(previousMessage.createdAt).getTime();

    if (Number.isNaN(previousTime)) return false;

    return currentTime - previousTime >= 30 * 60 * 1000;
  };

  const isSameCalendarDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const formatMessageClockTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatMessageSectionTime = (createdAt: string) => {
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
  };

  // ── Render: Message Bubble ────────────────────────────────────────────────
  const renderMessageBubble = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }): React.JSX.Element => {
    const mine = isCurrentUser(item.senderId);
    const previousMessage = messages[index - 1];
    const nextMessage = messages[index + 1];
    const showTimeDivider = shouldShowTimeDivider(item, previousMessage);
    const nextHasTimeDivider = nextMessage
      ? shouldShowTimeDivider(nextMessage, item)
      : false;
    const groupedWithPrevious =
      !showTimeDivider && previousMessage?.senderId === item.senderId;
    const groupedWithNext =
      !nextHasTimeDivider && nextMessage?.senderId === item.senderId;
    const startsSenderGroup = !groupedWithPrevious;
    const showMessageTime = selectedMessageId === item.id;
    const senderFromMembers = getSenderFromMembers(item.senderId);
    const sender = senderFromMembers ?? item.sender;
    const showAvatar = !mine && startsSenderGroup;
    const isImageMessage = item.messageType === 'image' || !!item.image;
    const hasText = !!item.text;
    const imageOnlyMessage = isImageMessage && !hasText;
    const bubbleGroupStyle = mine
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

    const handleLongPress = () => {
      if (mine) {
        setContextMenu({ visible: true, messageId: item.id, text: item.text ?? '' });
      }
    };

    return (
      <View>
        {showTimeDivider && (
          <View style={styles.timeDivider}>
            <View style={styles.timeDividerPill}>
              <Text style={styles.timeDividerText}>
                {formatMessageSectionTime(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        <View
          style={[
            styles.messageRow,
            mine && styles.messageRowMine,
            groupedWithPrevious && styles.messageRowGrouped,
            showTimeDivider && styles.messageRowAfterDivider,
          ]}
        >
          {!mine && (
            <View style={styles.msgAvatarContainer}>
              {showAvatar ? (
                <Avatar
                  user={sender ?? ({ id: item.senderId, username: '', displayName: '', avatar: '', bio: '', followers: 0, following: 0, posts: 0, isVerified: false } as any)}
                  size="tiny"
                  showOnlineIndicator={true}
                  isOnline={isUserOnline(item.senderId)}
                />
              ) : (
                <View style={styles.msgAvatarPlaceholder} />
              )}
            </View>
          )}
          <Pressable
            onPress={() => {
              setSelectedMessageId((current) => (current === item.id ? null : item.id));
            }}
            onLongPress={handleLongPress}
            delayLongPress={500}
            style={({ pressed }) => [
              styles.bubbleContainer,
              mine ? styles.bubbleContainerMine : styles.bubbleContainerTheirs,
              pressed && styles.bubblePressed,
            ]}
          >
            {!mine && showAvatar && (
              <Text style={styles.senderName}>
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
                      mine ? styles.bubbleMine : styles.bubbleTheirs,
                      bubbleGroupStyle,
                    ]}
                  >
                    <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                      {item.text}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : item.text ? (
              <View
                style={[
                  styles.bubble,
                  mine ? styles.bubbleMine : styles.bubbleTheirs,
                  bubbleGroupStyle,
                ]}
              >
                <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                  {item.text}
                </Text>
              </View>
            ) : null}
            {showMessageTime && (
              <View style={[styles.msgMeta, mine && styles.msgMetaMine]}>
                <Text style={styles.msgTime}>
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

  const handleContextEdit = () => {
    setEditModal({ visible: true, messageId: contextMenu.messageId, text: contextMenu.text });
  };

  const handleContextDelete = () => {
    const msgId = contextMenu.messageId;
    setContextMenu((p) => ({ ...p, visible: false }));
    setConfirmAction({ type: 'deleteMessage', messageId: msgId });
  };

  const performDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversation) return;
      setDeletingMessageId(messageId);
      try {
        await deleteMessage(conversation.id, messageId);
        setConfirmAction(null);
      } catch (err: any) {
        Alert.alert(
          'Error',
          err?.response?.data?.message ?? err?.message ?? 'Failed to delete message.',
        );
      } finally {
        setDeletingMessageId(null);
      }
    },
    [conversation, deleteMessage],
  );

  const confirmTitle = 'Delete message?';
  const confirmMessage = 'This message will be permanently deleted.';
  const confirmIcon = 'trash-2';
  const confirmLabel = 'Delete';
  const confirmationBusy = deletingMessageId != null;

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'deleteMessage') {
      void performDeleteMessage(confirmAction.messageId);
      return;
    }
  };

  const handleEditSave = async (text: string) => {
    await editMessage(conversation!.id, editModal.messageId, text);
    setEditModal({ visible: false, messageId: '', text: '' });
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerState}>
          <Text style={styles.emptyChatTitle}>Conversation not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.emptyChatSubtitle}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatHeaderUser}
            onPress={() => {
              if (otherUser) {
                router.back();
                router.push(`/profile/${otherUser.id}` as any);
              }
            }}
          >
            {otherUser ? (
              <Avatar
                user={otherUser}
                size="small"
                showOnlineIndicator={true}
                isOnline={isUserOnline(otherUser.id)}
              />
            ) : (
              <View style={styles.chatAvatarGroup}>
                <Feather name="users" size={18} color="white" />
              </View>
            )}
            <View>
              <Text style={styles.chatName} numberOfLines={1}>
                {headerName}
              </Text>
              {isGroup && (
                <Text style={styles.chatSubtitle}>
                  {convMembers.length} members
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={handleHeaderAction}
          >
            <Feather
              name={isGroup && isAdmin ? 'settings' : 'info'}
              size={22}
              color={AppColors.text}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {isLoadingMessages ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageBubble}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScroll={handleMessagesScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Feather name="message-circle" size={48} color={AppColors.iconMuted} strokeWidth={1.5} />
                <Text style={styles.emptyChatTitle}>No messages yet</Text>
                <Text style={styles.emptyChatSubtitle}>
                  Send the first message to start the conversation
                </Text>
              </View>
            }
            ListFooterComponent={<View ref={messagesEndRef} />}
          />
        )}

        {/* Typing Indicator */}
        {partnerTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>
              {otherUser ? otherUser.displayName : 'Someone'} is typing...
            </Text>
          </View>
        )}

        {showScrollToBottomButton && (
          <TouchableOpacity
            style={[
              styles.scrollToBottomButton,
              { bottom: Math.max(insets.bottom, 10) + 74 },
            ]}
            onPress={handleScrollToBottomPress}
            activeOpacity={0.8}
          >
            <Feather name="arrow-down" size={20} color={AppColors.text} strokeWidth={2.4} />
          </TouchableOpacity>
        )}

        {/* Message Input */}
        {isChatBlocked ? (
          <View
            style={[
              styles.blockedInputNotice,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <Feather name="slash" size={18} color={AppColors.textMuted} strokeWidth={2} />
            <View style={styles.blockedInputTextWrap}>
              <Text style={styles.blockedInputTitle}>{blockedNoticeTitle}</Text>
              <Text style={styles.blockedInputMessage}>{blockedNoticeMessage}</Text>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
            style={styles.keyboardAvoid}
          >
            {/* Image preview strip */}
            {selectedImage && (
              <View style={styles.imagePreviewStrip}>
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreviewThumb} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.imagePreviewRemove}
                    onPress={removeSelectedImage}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x-circle" size={22} color="#fff" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View
              style={[
                styles.inputContainer,
                { paddingBottom: Math.max(insets.bottom, 10) },
              ]}
            >
              <TextInput
                style={styles.messageInput}
                placeholder="Message..."
                placeholderTextColor={AppColors.iconMuted}
                value={messageText}
                onChangeText={(text) => {
                  if (!isSendingRef.current && text.endsWith('\n') && !text.endsWith('\n\n')) {
                    const trimmed = text.trimEnd();
                    setMessageText('');
                    if (trimmed.length > 0) {
                      handleSendDirect(trimmed);
                    }
                    return;
                  }
                  setMessageText(text);
                  if (conversation && text.length > 0) {
                    if (!iStartedTypingRef.current) {
                      iStartedTypingRef.current = true;
                      invokeHub('StartTyping', conversation.id).catch(() => {});
                    }
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      iStartedTypingRef.current = false;
                      invokeHub('StopTyping', conversation.id).catch(() => {});
                    }, 2000);
                  }
                }}
                multiline
                maxLength={4000}
              />
              {!selectedImage && (
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.attachBtn}
                  disabled={isUploadingImage}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  ) : (
                    <Feather
                      name="camera"
                      size={20}
                      color={AppColors.iconMuted}
                    />
                  )}
                </TouchableOpacity>
              )}
              {(messageText.length > 0 || !!selectedImage) && (
                <TouchableOpacity
                  onPress={handleSend}
                  style={styles.sendBtn}
                  disabled={isLoadingMessages || isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  ) : (
                    <Feather name="send" size={22} color={AppColors.primary} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      <MessageContextMenu
        visible={contextMenu.visible}
        actions={{ onEdit: handleContextEdit, onDelete: handleContextDelete }}
        onClose={() => setContextMenu((p) => ({ ...p, visible: false }))}
      />

      <EditMessageModal
        visible={editModal.visible}
        initialText={editModal.text}
        onSave={handleEditSave}
        onCancel={() => setEditModal({ visible: false, messageId: '', text: '' })}
      />

      {conversation && !isGroup && (
        <Modal
          visible={showChatActions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowChatActions(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowChatActions(false)}
          >
            <View
              style={styles.chatActionsSheet}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.settingsSheetHeader}>
                <Text style={styles.settingsSheetTitle}>Chat actions</Text>
                <TouchableOpacity onPress={() => setShowChatActions(false)}>
                  <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.7}
                onPress={() => {
                  setShowChatActions(false);
                  setTimeout(handleBlockUserAction, 120);
                }}
              >
                <Feather
                  name={chatActionIcon}
                  size={20}
                  color={blockStatus?.blockedByMe ? AppColors.text : AppColors.error}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.actionText,
                    !blockStatus?.blockedByMe && styles.dangerActionText,
                  ]}
                >
                  {chatActionLabel}
                </Text>
                <Feather name="chevron-right" size={20} color={AppColors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {conversation && (
        <Modal
          visible={showGroupSettings}
          transparent
          animationType="slide"
          onRequestClose={() => setShowGroupSettings(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowGroupSettings(false)}
          >
            <View
              style={styles.settingsSheet}
              onStartShouldSetResponder={() => true}
            >
              <TouchableOpacity
                style={styles.settingsSheetHeader}
                onPress={() => setShowGroupSettings(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.settingsSheetTitle}>{headerName}</Text>
                <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
              </TouchableOpacity>

              <ScrollView
                style={styles.settingsContent}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.settingsContentContainer}
              >
                <Text style={styles.sectionLabel}>Members ({convMembers.length})</Text>
                {convMembers.map((member) => {
                  const memberIsAdmin = conversation.adminIds?.includes(member.id) ?? false;
                  const isSelf = member.id === currentUser?.id;
                  const canRemoveMember = isAdmin && !isSelf;
                  const isRemoving = removingMemberId === member.id;
                  return (
                    <View key={member.id} style={styles.memberRow}>
                      <Avatar
                        user={member}
                        size="small"
                        showOnlineIndicator={true}
                        isOnline={isUserOnline(member.id)}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {member.displayName || member.username || 'User'}
                          {isSelf ? <Text style={styles.memberMeta}> (You)</Text> : null}
                          {memberIsAdmin ? <Text style={styles.memberAdmin}> - Admin</Text> : null}
                        </Text>
                      </View>
                      {canRemoveMember && (
                        <TouchableOpacity
                          style={styles.removeMemberBtn}
                          onPress={() => handleRemoveMember(member)}
                          disabled={removingMemberId != null || isLeavingGroup}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {isRemoving ? (
                            <ActivityIndicator size="small" color="#dc3545" />
                          ) : (
                            <Feather name="user-minus" size={20} color="#dc3545" strokeWidth={2} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.settingsActions}>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => {
                      setFriendSearch('');
                      setShowGroupSettings(false);
                      setTimeout(() => setShowAddMember(true), 50);
                    }}
                    disabled={isLeavingGroup}
                    activeOpacity={0.7}
                  >
                    <Feather name="user-plus" size={20} color={AppColors.text} strokeWidth={2} />
                    <Text style={styles.actionText}>Add member</Text>
                    <Feather name="chevron-right" size={20} color={AppColors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={handleLeaveGroup}
                  disabled={isLeavingGroup || removingMemberId != null}
                  activeOpacity={0.7}
                >
                  {isLeavingGroup ? (
                    <ActivityIndicator size="small" color="#dc3545" />
                  ) : (
                    <Feather name="log-out" size={20} color="#dc3545" strokeWidth={2} />
                  )}
                  <Text style={styles.leaveGroupText}>Leave group</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>

          {/* Local confirmation modal for remove member / leave group — rendered at Modal root level */}
          {localConfirmAction && (
            <ConfirmationModal
              visible={localConfirmAction != null}
              title={localConfirmAction.type === 'remove' ? 'Remove member?' : 'Leave group?'}
              message={
                localConfirmAction.type === 'remove'
                  ? `Remove ${
                      localConfirmAction.member.displayName ||
                      localConfirmAction.member.username ||
                      'this member'
                    } from this group?`
                  : 'You will stop receiving messages from this group.'
              }
              icon={localConfirmAction.type === 'remove' ? 'user-minus' : 'log-out'}
              variant="danger"
              confirmLabel={localConfirmAction.type === 'remove' ? 'Remove' : 'Leave'}
              busy={removingMemberId != null || isLeavingGroup}
              onCancel={() => setLocalConfirmAction(null)}
              onConfirm={() => {
                if (localConfirmAction.type === 'remove') {
                  void performRemoveMember(localConfirmAction.member);
                } else {
                  void performLeaveGroup();
                }
              }}
            />
          )}
        </Modal>
      )}

      {conversation && !showGroupSettings && (
        <Modal
          visible={showAddMember}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddMember(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.settingsSheet}>
              <View style={styles.settingsSheetHeader}>
                <Text style={styles.settingsSheetTitle}>Add Member</Text>
                <TouchableOpacity onPress={() => setShowAddMember(false)}>
                  <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <View style={styles.friendSearchContainer}>
                <Feather name="search" size={16} color={AppColors.textMuted} strokeWidth={2} />
                <TextInput
                  style={styles.friendSearchInput}
                  placeholder="Search friends..."
                  placeholderTextColor={AppColors.textMuted}
                  value={friendSearch}
                  onChangeText={setFriendSearch}
                  autoFocus
                />
              </View>
              <FlatList
                data={addableFriends}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isAdding = addingMemberId === item.id;
                  return (
                    <TouchableOpacity
                      style={styles.memberRow}
                      activeOpacity={0.7}
                      onPress={() => handleAddMember(item.id)}
                      disabled={addingMemberId != null}
                    >
                      <Avatar
                        user={item}
                        size="small"
                        showOnlineIndicator={true}
                        isOnline={isUserOnline(item.id)}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {item.displayName || item.username || 'User'}
                        </Text>
                      </View>
                      {isAdding ? (
                        <ActivityIndicator size="small" color={AppColors.primary} />
                      ) : (
                        <Feather name="user-plus" size={20} color={AppColors.primary} strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  isLoadingFriends ? (
                    <View style={styles.emptyFriends}>
                      <ActivityIndicator size="small" color={AppColors.primary} />
                    </View>
                  ) : (
                    <Text style={styles.emptyFriends}>
                      {friendSearch.trim() ? 'No friends found' : 'No friends available to add'}
                    </Text>
                  )
                }
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      <ConfirmationModal
        visible={confirmAction != null}
        title={confirmTitle}
        message={confirmMessage}
        icon={confirmIcon}
        variant="danger"
        confirmLabel={confirmLabel}
        busy={confirmationBusy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Re-using styles from message.tsx would be ideal via a shared module,
// but for simplicity these mirror the original message.tsx styles.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    position: 'relative',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    backgroundColor: AppColors.background,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: AppColors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatAvatarGroup: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatName: {
    ...Typography.bodySemibold,
    fontWeight: '600',
    color: AppColors.text,
  },
  chatSubtitle: {
    ...Typography.caption,
    color: AppColors.textMuted,
  },
  headerAction: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '85%',
  },
  chatActionsSheet: {
    backgroundColor: AppColors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 20,
  },
  settingsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layoutPadding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  settingsSheetTitle: {
    ...Typography.bodySemibold,
    fontWeight: '600',
    color: AppColors.text,
    flex: 1,
  },
  settingsContent: {
    flexGrow: 1,
  },
  settingsContentContainer: {
    paddingBottom: 8,
  },
  sectionLabel: {
    ...Typography.caption,
    color: AppColors.textMuted,
    fontWeight: '600',
    paddingHorizontal: layoutPadding,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 11,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...Typography.body,
    color: AppColors.text,
    fontWeight: '500',
  },
  memberMeta: {
    color: AppColors.textMuted,
    fontWeight: '400',
  },
  memberAdmin: {
    color: AppColors.primary,
    fontWeight: '400',
  },
  removeMemberBtn: {
    padding: 8,
  },
  settingsActions: {
    marginTop: 12,
    paddingBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layoutPadding,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    minHeight: 50,
  },
  actionText: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
  },
  dangerActionText: {
    color: AppColors.error,
  },
  leaveGroupText: {
    ...Typography.body,
    flex: 1,
    color: '#dc3545',
  },
  friendSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: layoutPadding,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 10,
    gap: 8,
  },
  friendSearchInput: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
    padding: 0,
  },
  emptyFriends: {
    ...Typography.body,
    color: AppColors.textMuted,
    textAlign: 'center',
    paddingVertical: 32,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  loadingText: {
    ...Typography.caption,
    color: AppColors.textMuted,
    marginTop: 8,
  },
  emptyChatTitle: {
    ...Typography.bodySemibold,
    color: AppColors.textMuted,
  },
  emptyChatSubtitle: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 8,
    flexGrow: 1,
  },
  timeDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timeDividerPill: {
    backgroundColor: AppColors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeDividerText: {
    ...Typography.caption,
    color: AppColors.textMuted,
    fontSize: 11,
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
    marginRight: 6,
    width: 28,
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
    color: AppColors.textMuted,
    marginBottom: 2,
    marginLeft: 4,
  },
  messageContentStack: {
    gap: 6,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
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
    fontSize: 10,
    color: AppColors.textMuted,
  },
  typingContainer: {
    paddingHorizontal: layoutPadding,
    paddingVertical: 4,
  },
  typingText: {
    ...Typography.caption,
    color: AppColors.textMuted,
    fontStyle: 'italic',
  },
  scrollToBottomButton: {
    position: 'absolute',
    left: '50%',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.background,
    transform: [{ translateX: -21 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
  },
  blockedInputNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: layoutPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  blockedInputTextWrap: {
    flex: 1,
    gap: 2,
  },
  blockedInputTitle: {
    ...Typography.bodySemibold,
    color: AppColors.text,
  },
  blockedInputMessage: {
    ...Typography.caption,
    color: AppColors.textMuted,
    lineHeight: 18,
  },
  keyboardAvoid: {
    // Wraps input so it sits flush against the keyboard
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: layoutPadding,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
    gap: 8,
  },
  attachBtn: {
    padding: 4,
  },
  imagePreviewStrip: {
    paddingHorizontal: layoutPadding,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: AppColors.surfaceElevated,
  },
  imagePreviewContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreviewThumb: {
    width: '100%',
    height: '100%',
  },
  imagePreviewRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 11,
  },
  sendBtn: {
    padding: 4,
  },
  messageInput: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
    backgroundColor: AppColors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
});
