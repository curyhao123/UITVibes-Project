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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../context/AppContext';
import * as api from '../../../services/api';
import { invokeHub } from '../../../services/signalrService';
import { Avatar } from '../../../components/Avatar';
import { OnlineIndicator } from '../../../components/OnlineIndicator';
import { MessageContextMenu } from '../../../components/MessageContextMenu';
import { EditMessageModal } from '../../../components/EditMessageModal';
import { formatDistanceToNow } from '../../../utils/time';
import { AppColors, layoutPadding } from '../../../constants/theme';
import { Typography } from '../../../constants/typography';

const { createGroupConversation, addMemberToGroup, removeMemberFromGroup, leaveGroup } = api;

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
    Alert.alert(
      'Delete message?',
      'This message will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMessage(conversation!.id, msgId);
          },
        },
      ],
    );
  };

  const handleEditSave = async (text: string) => {
    await editMessage(conversation!.id, editModal.messageId, text);
    setEditModal({ visible: false, messageId: '', text: '' });
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
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
      <Stack.Screen options={{ headerShown: false }} />
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
          <TouchableOpacity style={styles.headerAction}>
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surface,
    gap: 10,
  },
  backBtn: {
    padding: 4,
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
    ...Typography.subhead,
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
    ...Typography.subhead,
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
