import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { Conversation, Message, User } from '../../data/mockData';
import { AppColors, layoutPadding } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { Header } from '../../components';
import { formatDistanceToNow } from '../../utils/time';

export default function MessageScreen() {
  const router = useRouter();
  const {
    conversations,
    activeConversation,
    messages,
    refreshConversations,
    loadMessages,
    sendMessage,
    setActiveConversation,
    markMessagesRead,
    startConversation,
    suggestedUsers,
    fetchSuggestedUsers,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
      markMessagesRead(activeConversation.id);
    }
  }, [activeConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && activeConversation) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, activeConversation]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    if (conv.isGroup && conv.name) {
      return conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const other = conv.members.find((m) => m.id !== 'current');
    return other?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      other?.displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSend = async () => {
    if (!messageText.trim() || !activeConversation) return;
    const text = messageText.trim();
    setMessageText('');
    setIsTyping(false);
    await sendMessage(activeConversation.id, text);
  };

  const handleBack = () => {
    setActiveConversation(null);
    setMessageText('');
    refreshConversations();
  };

  const handleConversationPress = async (conv: Conversation) => {
    setActiveConversation(conv);
  };

  const getOtherMember = (conv: Conversation): User | undefined => {
    return conv.members.find((m) => m.id !== 'current');
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const other = getOtherMember(item);
    const hasUnread = item.unreadCount > 0;
    const isGroup = item.isGroup;

    return (
      <TouchableOpacity
        style={[styles.convItem, hasUnread && styles.convItemUnread]}
        onPress={() => handleConversationPress(item)}
      >
        {isGroup ? (
          <View style={styles.groupAvatar}>
            <Feather name="users" size={22} color={AppColors.iconMuted} strokeWidth={2} />
          </View>
        ) : (
          <Image
            source={{ uri: other?.avatar }}
            style={styles.avatar}
          />
        )}
        <View style={styles.convContent}>
          <View style={styles.convTop}>
            <Text
              style={[styles.convName, hasUnread && styles.convNameBold]}
              numberOfLines={1}
            >
              {isGroup ? item.name : other?.displayName}
            </Text>
            <Text style={styles.convTime}>
              {item.lastMessage &&
                formatDistanceToNow(new Date(item.lastMessage.createdAt))}
            </Text>
          </View>
          <View style={styles.convBottom}>
            <Text
              style={[styles.convLastMessage, hasUnread && styles.convLastMessageBold]}
              numberOfLines={1}
            >
              {item.lastMessage?.senderId === 'current' ? 'You: ' : ''}
              {item.lastMessage?.text || 'No messages yet'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageBubble = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.senderId === 'current';
    const showAvatar =
      !isMine &&
      (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const sender = item.sender;

    return (
      <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
        {!isMine && (
          <View style={styles.msgAvatarContainer}>
            {showAvatar ? (
              <Image source={{ uri: sender.avatar }} style={styles.msgAvatar} />
            ) : (
              <View style={styles.msgAvatarPlaceholder} />
            )}
          </View>
        )}
        <View
          style={[
            styles.bubbleContainer,
            isMine ? styles.bubbleContainerMine : styles.bubbleContainerTheirs,
          ]}
        >
          {!isMine && showAvatar && (
            <Text style={styles.senderName}>{sender.displayName}</Text>
          )}
          <View
            style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
          >
            <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
              {item.text}
            </Text>
          </View>
          <View style={[styles.msgMeta, isMine && styles.msgMetaMine]}>
            <Text style={styles.msgTime}>
              {formatDistanceToNow(new Date(item.createdAt))}
            </Text>
            {isMine && (
              <Feather
                name={item.isRead ? 'check-circle' : 'check'}
                size={12}
                color={item.isRead ? AppColors.primary : AppColors.iconMuted}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  // ─── Chat View ─────────────────────────────────────────────
  if (activeConversation) {
    const other = getOtherMember(activeConversation);
    const isGroup = activeConversation.isGroup;
    const otherUser = !isGroup ? other : null;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatHeaderUser}
            onPress={() => {
              if (otherUser) {
                setActiveConversation(null);
                router.push(`/profile/${otherUser.id}` as any);
              }
            }}
          >
            {otherUser ? (
              <Image source={{ uri: otherUser.avatar }} style={styles.chatAvatar} />
            ) : (
              <View style={styles.chatAvatarGroup}>
                <Feather name="users" size={18} color="white" />
              </View>
            )}
            <View>
              <Text style={styles.chatName} numberOfLines={1}>
                {isGroup ? activeConversation.name : otherUser?.displayName}
              </Text>
              {isGroup && (
                <Text style={styles.chatSubtitle}>
                  {activeConversation.members.length} members
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <Feather name="phone" size={22} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <Feather name="video" size={22} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageBubble}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>
              {otherUser ? otherUser.displayName : 'Someone'} is typing...
            </Text>
          </View>
        )}

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachBtn}>
              <Feather name="smile" size={22} color={AppColors.iconMuted} strokeWidth={2} />
            </TouchableOpacity>
            <TextInput
              style={styles.messageInput}
              placeholder="Message..."
              placeholderTextColor={AppColors.iconMuted}
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                // Simulate typing indicator when other party types back
                if (text.length > 0 && !isTyping) {
                  setIsTyping(true);
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
                  }, 2000);
                }
              }}
              multiline
              maxLength={1000}
            />
            {messageText.length > 0 ? (
              <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
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
    );
  }

  // ─── Inbox View ───────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Messages"
        showAvatar={false}
        rightAction={
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.headerAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              fetchSuggestedUsers();
              setShowNewMsg(true);
            }}
          >
            <Feather name="edit-2" size={20} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
        }
        bottomContent={
          <View>
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color={AppColors.iconMuted} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search messages"
                placeholderTextColor={AppColors.iconMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={18} color={AppColors.iconMuted} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.requestsBanner}>
              <Feather name="user-plus" size={20} color={AppColors.primary} strokeWidth={2} />
              <Text style={styles.requestsText}>Message Requests</Text>
              <View style={styles.requestsBadge}>
                <Text style={styles.requestsBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Conversation List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.convList}
        ListEmptyComponent={
          conversations.length === 0 ? (
            <View style={styles.emptyInbox}>
              <View style={styles.emptyInboxIcon}>
                <Feather name="send" size={36} color={AppColors.iconMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyInboxTitle}>Messages</Text>
              <Text style={styles.emptyInboxSubtitle}>
                No messages yet.{'\n'}Start a conversation with your friends.
              </Text>
              <TouchableOpacity
                style={styles.emptyInboxBtn}
                activeOpacity={0.8}
                onPress={() => {
                  fetchSuggestedUsers();
                  setShowNewMsg(true);
                }}
              >
                <Text style={styles.emptyInboxBtnText}>Send Message</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="search" size={40} color={AppColors.iconMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySubtitle}>
                Try searching for someone by name or username
              </Text>
            </View>
          )
        }
      />

      {/* ─── New Message Sheet ─────────────────────────────── */}
      {showNewMsg && (
        <View style={styles.newMsgOverlay}>
          <TouchableOpacity
            style={styles.newMsgBackdrop}
            activeOpacity={1}
            onPress={() => setShowNewMsg(false)}
          />
          <View style={styles.newMsgSheet}>
            <View style={styles.newMsgSheetHeader}>
              <Text style={styles.newMsgSheetTitle}>New Message</Text>
              <TouchableOpacity onPress={() => setShowNewMsg(false)}>
                <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.newMsgSearchContainer}>
              <Feather name="search" size={16} color={AppColors.iconMuted} strokeWidth={2} />
              <TextInput
                style={styles.newMsgSearchInput}
                placeholder="Search people..."
                placeholderTextColor={AppColors.iconMuted}
                value={newMsgSearch}
                onChangeText={setNewMsgSearch}
                autoFocus
              />
            </View>

            <FlatList
              data={
                newMsgSearch.length > 0
                  ? suggestedUsers.filter(
                      (u) =>
                        u.username.toLowerCase().includes(newMsgSearch.toLowerCase()) ||
                        u.displayName.toLowerCase().includes(newMsgSearch.toLowerCase())
                    )
                  : suggestedUsers
              }
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.newMsgUserItem}
                  activeOpacity={0.7}
                  onPress={async () => {
                    await startConversation(item.id);
                    setShowNewMsg(false);
                    setNewMsgSearch('');
                    refreshConversations();
                  }}
                >
                  <Image source={{ uri: item.avatar }} style={styles.newMsgAvatar} />
                  <View style={styles.newMsgUserInfo}>
                    <Text style={styles.newMsgUserName}>{item.username}</Text>
                    <Text style={styles.newMsgUserDisplay}>{item.displayName}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.newMsgEmpty}>
                  {newMsgSearch.length > 0
                    ? 'No users found'
                    : 'No suggested users'}
                </Text>
              }
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },

  // ─── Header ───────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
  },
  headerTitle: {
    ...Typography.screenTitle,
    color: AppColors.text,
  },
  headerAction: {
    padding: 4,
  },

  // ─── Search ──────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: layoutPadding,
    marginTop: 12,
  },
  searchInput: {
    ...Typography.caption,
    flex: 1,
    marginLeft: 8,
    color: AppColors.text,
  },

  // ─── Requests Banner ──────────────────────────────────────
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
    gap: 10,
  },
  requestsText: {
    ...Typography.captionSemibold,
    flex: 1,
    color: AppColors.text,
  },
  requestsBadge: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  requestsBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Conversation List ────────────────────────────────────
  convList: {
    paddingBottom: 100,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  convItemUnread: {
    backgroundColor: `${AppColors.primary}08`,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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

  // ─── Empty State ──────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...Typography.sectionTitle,
    marginTop: 16,
    color: AppColors.text,
  },
  emptySubtitle: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    textAlign: 'center',
    marginTop: 8,
  },

  // ─── Empty Inbox (No Conversations) ───────────────────────
  emptyInbox: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyInboxIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${AppColors.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyInboxTitle: {
    ...Typography.screenTitle,
    color: AppColors.text,
    marginBottom: 8,
  },
  emptyInboxSubtitle: {
    ...Typography.body,
    color: AppColors.iconMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyInboxBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyInboxBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },

  // ─── New Message Sheet ───────────────────────────────────
  newMsgOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  newMsgBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  newMsgSheet: {
    backgroundColor: AppColors.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  newMsgSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  newMsgSheetTitle: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.text,
  },
  newMsgSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  newMsgSearchInput: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
    padding: 0,
  },
  newMsgUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  newMsgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  newMsgUserInfo: {
    flex: 1,
  },
  newMsgUserName: {
    ...Typography.bodySemibold,
    fontSize: 15,
    color: AppColors.text,
  },
  newMsgUserDisplay: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    marginTop: 2,
  },
  newMsgEmpty: {
    ...Typography.body,
    color: AppColors.iconMuted,
    textAlign: 'center',
    paddingVertical: 32,
  },

  // ─── Chat Header ──────────────────────────────────────────
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layoutPadding,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
    gap: 4,
  },
  backBtn: {
    padding: 6,
  },
  chatHeaderUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 4,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  chatAvatarGroup: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatName: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.text,
  },
  chatSubtitle: {
    ...Typography.meta,
    color: AppColors.iconMuted,
  },

  // ─── Messages ─────────────────────────────────────────────
  messagesList: {
    paddingHorizontal: layoutPadding,
    paddingTop: 10,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  msgAvatarContainer: {
    width: 32,
    marginRight: 6,
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: AppColors.primary,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: AppColors.borderLight,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...Typography.body,
    lineHeight: 20,
    color: AppColors.text,
  },
  messageTextMine: {
    color: 'white',
  },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  msgMetaMine: {
    justifyContent: 'flex-end',
  },
  msgTime: {
    ...Typography.meta,
    fontSize: 11,
    color: AppColors.iconMuted,
  },

  // ─── Typing ───────────────────────────────────────────────
  typingContainer: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 4,
  },
  typingText: {
    ...Typography.meta,
    color: AppColors.iconMuted,
    fontStyle: 'italic',
  },

  // ─── Input ────────────────────────────────────────────────
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
  messageInput: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
    backgroundColor: AppColors.borderLight,
    borderRadius: 20,
    paddingHorizontal: layoutPadding,
    paddingVertical: 9,
    maxHeight: 120,
  },
  sendBtn: {
    padding: 4,
  },
});
