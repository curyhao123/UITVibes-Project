/**
 * message/chat/[id].tsx — Chat detail screen.
 *
 * Lives inside message/_layout.tsx (a nested Stack inside the Tabs navigator).
 * Because expo-router nests navigators, pushing this screen automatically
 * hides the parent Tabs navigator's tab bar — no manual hiding needed.
 */
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AddMemberModal,
  ChatActionsModal,
  ChatHeader,
  ChatInputBar,
  ConfirmationModal,
  EditMessageModal,
  GroupSettingsModal,
  MessageBubble,
  MessageContextMenu,
} from '../../../components';
import { AppColors, layoutPadding } from '../../../constants/theme';
import { Typography } from '../../../constants/typography';
import { useApp } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import * as api from '../../../services/api';
import {
  blockUser,
  getBlockStatus,
  unblockUser,
  type BlockStatusDto,
} from '../../../services/blockService';
import {
  addMemberToGroup,
  getConversationById,
  leaveGroup,
  removeMemberFromGroup,
} from '../../../services/messageService';
import { invokeHub } from '../../../services/signalrService';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    conversations,
    messages,
    isLoadingMessages,
    loadMessages,
    sendMessage,
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
    | { type: 'deleteMessage'; messageId: string }
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

  const performRemoveMember = useCallback(
    async (member: any) => {
      if (!conversation) return;
      setRemovingMemberId(member.id);
      try {
        await removeMemberFromGroup(conversation.id, member.id);
        await refreshConversations();
        const updated = await getConversationById(conversation.id);
        if (updated) {
          setConvMembers(updated.members);
        }
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

  const performLeaveGroup = useCallback(async () => {
    if (!conversation) return;
    setIsLeavingGroup(true);
    try {
      await leaveGroup(conversation.id);
      await refreshConversations();
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

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'deleteMessage') {
      void performDeleteMessage(confirmAction.messageId);
    }
  };

  const handleEditSave = async (text: string) => {
    await editMessage(conversation!.id, editModal.messageId, text);
    setEditModal({ visible: false, messageId: '', text: '' });
  };

  const handleMessageTextChange = (text: string) => {
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
  };

  if (!conversation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centerState}>
          <Text style={[styles.emptyChatTitle, { color: colors.textMuted }]}>Conversation not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.emptyChatSubtitle, { color: colors.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {/* Chat Header */}
        <ChatHeader
          title={headerName}
          isGroup={isGroup}
          otherUser={otherUser}
          memberCount={convMembers.length}
          isOnline={otherUser ? isUserOnline(otherUser.id) : false}
          isAdmin={isAdmin}
          onBack={() => router.back()}
          onUserPress={() => {
            if (otherUser) {
              router.back();
              router.push(`/profile/${otherUser.id}` as any);
            }
          }}
          onActionPress={handleHeaderAction}
        />

        {/* Messages */}
        {isLoadingMessages ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => (
              <MessageBubble
                item={item}
                index={index}
                previousMessage={messages[index - 1]}
                nextMessage={messages[index + 1]}
                isMine={isCurrentUser(item.senderId)}
                sender={getSenderFromMembers(item.senderId) ?? item.sender}
                isOnline={isUserOnline(item.senderId)}
                isSelected={selectedMessageId === item.id}
                onPress={() => {
                  setSelectedMessageId((current) => (current === item.id ? null : item.id));
                }}
                onLongPress={() => {
                  if (isCurrentUser(item.senderId)) {
                    setContextMenu({ visible: true, messageId: item.id, text: item.text ?? '' });
                  }
                }}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onScroll={handleMessagesScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Feather name="message-circle" size={48} color={colors.iconMuted} strokeWidth={1.5} />
                <Text style={[styles.emptyChatTitle, { color: colors.text }]}>No messages yet</Text>
                <Text style={[styles.emptyChatSubtitle, { color: colors.textMuted }]}>
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
            <Text style={[styles.typingText, { color: colors.textMuted }]}>
              {otherUser ? otherUser.displayName : 'Someone'} is typing...
            </Text>
          </View>
        )}

        {showScrollToBottomButton && (
          <TouchableOpacity
            style={[
              styles.scrollToBottomButton,
              { bottom: Math.max(insets.bottom, 10) + 74, backgroundColor: colors.surfaceElevated },
            ]}
            onPress={handleScrollToBottomPress}
            activeOpacity={0.8}
          >
            <Feather name="arrow-down" size={20} color={colors.text} strokeWidth={2.4} />
          </TouchableOpacity>
        )}

        {/* Message Input */}
        <ChatInputBar
          isChatBlocked={isChatBlocked}
          blockedNoticeTitle={blockedNoticeTitle}
          blockedNoticeMessage={blockedNoticeMessage}
          messageText={messageText}
          onChangeText={handleMessageTextChange}
          selectedImage={selectedImage}
          isUploadingImage={isUploadingImage}
          isLoadingMessages={isLoadingMessages}
          insetsBottom={insets.bottom}
          onPickImage={pickImage}
          onRemoveImage={removeSelectedImage}
          onSend={handleSend}
        />
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
        <ChatActionsModal
          visible={showChatActions}
          blockedByMe={!!blockStatus?.blockedByMe}
          onBlockAction={handleBlockUserAction}
          onClose={() => setShowChatActions(false)}
        />
      )}

      {conversation && (
        <GroupSettingsModal
          visible={showGroupSettings}
          groupName={headerName}
          members={convMembers}
          adminIds={conversation.adminIds}
          currentUserId={currentUser?.id}
          isLeavingGroup={isLeavingGroup}
          removingMemberId={removingMemberId}
          isUserOnline={isUserOnline}
          onClose={() => setShowGroupSettings(false)}
          onOpenAddMember={() => setShowAddMember(true)}
          onConfirmRemoveMember={performRemoveMember}
          onConfirmLeaveGroup={performLeaveGroup}
        />
      )}

      {conversation && !showGroupSettings && (
        <AddMemberModal
          visible={showAddMember}
          friends={addableFriends}
          friendSearch={friendSearch}
          onChangeFriendSearch={setFriendSearch}
          isLoadingFriends={isLoadingFriends}
          addingMemberId={addingMemberId}
          isUserOnline={isUserOnline}
          onAddMember={handleAddMember}
          onClose={() => setShowAddMember(false)}
        />
      )}

      <ConfirmationModal
        visible={confirmAction != null}
        title="Delete message?"
        message="This message will be permanently deleted."
        icon="trash-2"
        variant="danger"
        confirmLabel="Delete"
        busy={deletingMessageId != null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
    position: 'relative',
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
});
