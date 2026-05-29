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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../context/AppContext';
import * as api from '../../../services/api';
import {
  addMemberToGroup,
  removeMemberFromGroup,
  leaveGroup,
  getConversationById,
} from '../../../services/messageService';
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
  const [showAddMember, setShowAddMember] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
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
      .then(async () => {
        await new Promise((r) => setTimeout(r, 0));
        await markMessagesRead(conversation.id);
      })
      .catch(() => {});
  }, [id, conversation?.id]);

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

  const scrollToBottom = useCallback((animated = true) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated });
    }
  }, []);

  useEffect(() => {
    userScrolledUpRef.current = false;
    initialScrollDoneRef.current = false;
  }, [id]);

  useEffect(() => {
    if (messages.length > 0 && !initialScrollDoneRef.current) {
      scrollToBottom(false);
      initialScrollDoneRef.current = true;
    }
  }, [messages.length, scrollToBottom, id]);

  // ── Send ───────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !conversation || isSendingRef.current) return;
    isSendingRef.current = true;
    const text = messageText.trim();
    setMessageText('');
    try {
      await sendMessage(conversation.id, text);
    } catch (err: any) {
      setMessageText(text);
      Alert.alert('Error', err?.message ?? 'Failed to send message.');
    } finally {
      isSendingRef.current = false;
    }
  }, [messageText, conversation, sendMessage]);

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

  const handleSendDirect = useCallback(
    async (text: string) => {
      if (!conversation || isSendingRef.current) return;
      isSendingRef.current = true;
      try {
        await sendMessage(conversation.id, text);
      } catch (err: any) {
        Alert.alert('Error', err?.message ?? 'Failed to send message.');
      } finally {
        isSendingRef.current = false;
      }
    },
    [conversation, sendMessage],
  );

  // ── Helpers ─────────────────────────────────────────────────────────────
  const isCurrentUser = (senderId: string) => senderId === currentUser?.id;

  const getSenderFromMembers = (senderId: string) => {
    if (!conversation) return undefined;
    return conversation.members.find((m: any) => m.id === senderId);
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
    const senderFromMembers = getSenderFromMembers(item.senderId);
    const sender = senderFromMembers ?? item.sender;
    const showAvatar =
      !mine &&
      (index === 0 || messages[index - 1]?.senderId !== item.senderId);

    const handleLongPress = () => {
      if (mine) {
        setContextMenu({ visible: true, messageId: item.id, text: item.text ?? '' });
      }
    };

    return (
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
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
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {item.text ? (
              <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                {item.text}
              </Text>
            ) : item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : null}
          </View>
          <View style={[styles.msgMeta, mine && styles.msgMetaMine]}>
            <Text style={styles.msgTime}>
              {item.editedAt ? 'Edited - ' : ''}
              {formatDistanceToNow(new Date(item.createdAt))}
            </Text>
          </View>
        </Pressable>
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
            onPress={() => {
              if (isGroup) setShowGroupSettings(true);
            }}
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
            onScrollBeginDrag={() => {
              userScrolledUpRef.current = true;
            }}
            onContentSizeChange={() => {
              if (!userScrolledUpRef.current) {
                scrollToBottom(true);
              }
            }}
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

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          style={styles.keyboardAvoid}
        >
          <View
            style={[
              styles.inputContainer,
              { paddingBottom: Math.max(insets.bottom, 10) },
            ]}
          >
            <TouchableOpacity style={styles.attachBtn}>
              <Feather name="smile" size={22} color={AppColors.iconMuted} strokeWidth={2} />
            </TouchableOpacity>
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
            {messageText.length > 0 ? (
              <TouchableOpacity
                onPress={handleSend}
                style={styles.sendBtn}
                disabled={isLoadingMessages}
              >
                <Feather name="send" size={22} color={AppColors.primary} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.attachBtn}>
                <Feather name="camera" size={22} color={AppColors.iconMuted} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
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
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
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
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: AppColors.surfaceElevated,
    borderBottomLeftRadius: 4,
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
    marginTop: 2,
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
