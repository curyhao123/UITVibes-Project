import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useApp } from "../../context/AppContext";
import * as api from "../../services/api";
import { Conversation, Message, User } from "../../data/mockData";
import { AppColors, layoutPadding } from "../../constants/theme";
import { Typography } from "../../constants/typography";
import { Header } from "../../components";
import { Avatar } from "../../components/Avatar";
import { OnlineIndicator } from "../../components/OnlineIndicator";
import { formatDistanceToNow } from "../../utils/time";

export default function MessageScreen() {
  const router = useRouter();
  const {
    currentUser,
    conversations,
    activeConversation,
    messages,
    conversationMembers,
    isLoadingConversations,
    isLoadingMessages,
    conversationError,
    refreshConversations,
    loadMessages,
    sendMessage,
    setActiveConversation,
    setMessages,
    markMessagesRead,
    startConversation,
    suggestedUsers,
    fetchSuggestedUsers,
    isUserOnline,
    onlineSignalRConnected,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const isSendingRef = useRef(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [startingConvUserId, setStartingConvUserId] = useState<string | null>(null);
  const [groupMemberToRemove, setGroupMemberToRemove] = useState<User | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const messagesEndRef = useRef<View>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [convMembers, setConvMembers] = useState<Conversation["members"]>([]);

  // Load conversation list on mount
  useEffect(() => {
    refreshConversations().catch((err) =>
      Alert.alert("Error", "Failed to load conversations. Pull to retry.")
    );
  }, []);

  // Load messages when entering a conversation — load + mark-as-read in one atomic flow
  useEffect(() => {
    if (activeConversation) {
      setConvMembers(activeConversation.members);
      loadMessages(activeConversation.id)
        .then(async () => {
          // Give a tick for messages state to settle, then mark as read
          await new Promise((r) => setTimeout(r, 0));
          await markMessagesRead(activeConversation.id);
        })
        .catch(() => {
          // error surfaced via messageError in context
        });
    } else {
      setConvMembers([]);
      setMessages([]);
    }
  }, [activeConversation?.id]);

  // Scroll to bottom when messages change — old messages go to top, new messages go to bottom
  useEffect(() => {
    if (messages.length > 0 && activeConversation) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length, activeConversation?.id]);

  // Debounced user search when typing in New Message sheet
  useEffect(() => {
    if (!showNewMsg) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!newMsgSearch.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(newMsgSearch.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [newMsgSearch, showNewMsg]);

  // ── Start conversation from New Message sheet ─────────────────────────────────
  const handleSelectUser = async (user: User) => {
    console.log("[MessageScreen] handleSelectUser called — user:", user.displayName, user.id);

    // 1. Set loading — disable the item immediately
    setStartingConvUserId(user.id);
    setShowNewMsg(false);

    try {
      // 2. Call API to create/get private conversation
      console.log("[MessageScreen] Calling startConversation for userId:", user.id);
      const conv = await startConversation(user.id);
      console.log("[MessageScreen] startConversation returned:", conv);

      if (!conv) {
        // startConversation returned null — this should not happen if we throw on error
        console.warn("[MessageScreen] startConversation returned null unexpectedly");
        Alert.alert("Error", "Không thể tạo cuộc trò chuyện lúc này.");
        return;
      }

      // 3. Set active conversation
      console.log("[MessageScreen] Setting activeConversation:", conv.id, conv.name ?? "private");
      setActiveConversation(conv);

      // 4. Refresh conversations list
      console.log("[MessageScreen] Refreshing conversations...");
      await refreshConversations();
      console.log("[MessageScreen] Conversations refreshed.");

      // 5. Clear search state
      setNewMsgSearch("");
      setSearchResults([]);

      console.log("[MessageScreen] Done — chat should be open now.");
    } catch (err: any) {
      // 3b. Handle error — show alert
      console.error("[MessageScreen] startConversation FAILED:", err?.response?.data ?? err?.message ?? err);
      Alert.alert(
        "Lỗi",
        err?.response?.data?.message ?? err?.message ?? "Không thể tạo cuộc trò chuyện lúc này."
      );
    } finally {
      setStartingConvUserId(null);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    if (conv.isGroup && conv.name) {
      return conv.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    const other = conv.members.find((m) => m.id !== currentUser?.id);
    return (
      other?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      other?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // ── Initial conversation fetch on mount (fallback / double-fetch for reliability) ──
  useEffect(() => {
    console.log("[MessageScreen] useEffect: initial conversation fetch on mount");
    refreshConversations().catch((err) => {
      console.error("[MessageScreen] Initial conversation fetch failed:", err);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send Message ─────────────────────────────────────────────────────────
  const handleSendDirect = useCallback(
    async (text: string) => {
      if (!activeConversation) return;
      isSendingRef.current = true;
      try {
        await sendMessage(activeConversation.id, text);
      } catch (err: any) {
        Alert.alert("Error", err?.message ?? "Failed to send message.");
        setMessageText(text); // restore on failure
      } finally {
        isSendingRef.current = false;
        setIsTyping(false);
      }
    },
    [activeConversation, sendMessage],
  );

  const handleSend = useCallback(async () => {
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessageText("");
    setIsTyping(false);
    try {
      if (!activeConversation) {
        Alert.alert("Error", "No conversation selected.");
        return;
      }
      await sendMessage(activeConversation.id, text);
    } catch (err: any) {
      setMessageText(text);
      Alert.alert("Error", err?.message ?? "Failed to send message.");
    }
  }, [messageText, activeConversation, sendMessage]);

  const handleBack = useCallback(() => {
    setActiveConversation(null);
    setMessageText("");
    setConvMembers([]);
    refreshConversations().catch(() => {});
  }, [setActiveConversation, refreshConversations]);

  const handleConversationPress = useCallback(
    async (conv: Conversation) => {
      setActiveConversation(conv);
    },
    [setActiveConversation]
  );

  // ─── Group Chat ────────────────────────────────────────────────────────────
  const { createGroupConversation, addMemberToGroup, removeMemberFromGroup, leaveGroup } =
    require("../../services/api");

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name.");
      return;
    }
    if (selectedMembers.length === 0) {
      Alert.alert("Error", "Please select at least one member.");
      return;
    }
    setIsCreatingGroup(true);
    try {
      const newConv = await createGroupConversation(
        groupName.trim(),
        selectedMembers.map((m) => m.id)
      );
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      await refreshConversations();
      setActiveConversation(newConv);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ?? "Failed to create group."
      );
    } finally {
      setIsCreatingGroup(false);
    }
  }, [groupName, selectedMembers, refreshConversations, setActiveConversation]);

  const handleRemoveMember = useCallback(
    async (member: User) => {
      if (!activeConversation) return;
      Alert.alert(
        "Remove Member",
        `Remove ${member.displayName || member.username} from the group?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              setIsRemovingMember(true);
              try {
                await removeMemberFromGroup(activeConversation.id, member.id);
                setConvMembers((prev) => prev.filter((m) => m.id !== member.id));
              } catch (err: any) {
                Alert.alert(
                  "Error",
                  err?.response?.data?.message ?? "Failed to remove member."
                );
              } finally {
                setIsRemovingMember(false);
                setGroupMemberToRemove(null);
              }
            },
          },
        ]
      );
    },
    [activeConversation, removeMemberFromGroup]
  );

  const handleAddMember = useCallback(
    async (user: User) => {
      if (!activeConversation) return;
      setIsAddingMember(true);
      try {
        await addMemberToGroup(activeConversation.id, user.id);
        setConvMembers((prev) => [...prev, user]);
        setShowAddMember(false);
        setAddMemberSearch("");
      } catch (err: any) {
        Alert.alert(
          "Error",
          err?.response?.data?.message ?? "Failed to add member."
        );
      } finally {
        setIsAddingMember(false);
      }
    },
    [activeConversation, addMemberToGroup]
  );

  const handleLeaveGroup = useCallback(async () => {
    if (!activeConversation) return;
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveGroup(activeConversation.id);
            handleBack();
          } catch (err: any) {
            Alert.alert(
              "Error",
              err?.response?.data?.message ?? "Failed to leave group."
            );
          }
        },
      },
    ]);
  }, [activeConversation, handleBack, leaveGroup]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getOtherMember = useCallback(
    (conv: Conversation): User | undefined => {
      return conv.members.find((m) => m.id !== currentUser?.id);
    },
    [currentUser?.id]
  );

  const isCurrentUser = useCallback(
    (senderId: string): boolean => {
      return senderId === currentUser?.id;
    },
    [currentUser?.id]
  );

  const getSenderFromMembers = useCallback(
    (senderId: string): User | undefined => {
      return convMembers.find((m) => m.id === senderId);
    },
    [convMembers]
  );

  // ─── Render: Conversation Item ─────────────────────────────────────────────
  const renderConversationItem = ({
    item,
  }: {
    item: Conversation;
  }): React.JSX.Element => {
    const other = getOtherMember(item);
    const hasUnread = item.unreadCount > 0;
    const isGroup = item.isGroup;
    const displayName = item.name || other?.displayName || "Chat";
    const avatarUri = other?.avatar || item.avatar;

    return (
      <TouchableOpacity
        style={[styles.convItem, hasUnread && styles.convItemUnread]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        {isGroup ? (
          <View style={styles.groupAvatar}>
            <Feather name="users" size={22} color={AppColors.iconMuted} strokeWidth={2} />
          </View>
        ) : (
          <View style={styles.avatarContainer}>
            <Avatar
              user={other ?? ({ id: '', username: '', displayName: '', avatar: '', bio: '', followers: 0, following: 0, posts: 0, isVerified: false } as User)}
              size="medium"
              showOnlineIndicator={true}
              isOnline={isUserOnline(other?.id ?? '')}
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
              {item.lastMessage?.createdAt &&
                formatDistanceToNow(new Date(item.lastMessage.createdAt))}
            </Text>
          </View>
          <View style={styles.convBottom}>
            <Text
              style={[styles.convLastMessage, hasUnread && styles.convLastMessageBold]}
              numberOfLines={1}
            >
              {isCurrentUser(item.lastMessage?.senderId ?? "")
                ? "You: "
                : ""}
              {item.lastMessage?.text || "No messages yet"}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render: Message Bubble ────────────────────────────────────────────────
  const renderMessageBubble = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }): React.JSX.Element => {
    const mine = isCurrentUser(item.senderId);
    const senderFromMembers = getSenderFromMembers(item.senderId);
    const sender = senderFromMembers ?? item.sender;
    const showAvatar =
      !mine &&
      (index === 0 || messages[index - 1]?.senderId !== item.senderId);

    return (
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
        {!mine && (
          <View style={styles.msgAvatarContainer}>
            {showAvatar ? (
              <Avatar
                user={sender ?? ({ id: item.senderId, username: '', displayName: '', avatar: '', bio: '', followers: 0, following: 0, posts: 0, isVerified: false } as User)}
                size="tiny"
                showOnlineIndicator={true}
                isOnline={isUserOnline(item.senderId)}
              />
            ) : (
              <View style={styles.msgAvatarPlaceholder} />
            )}
          </View>
        )}
        <View
          style={[
            styles.bubbleContainer,
            mine ? styles.bubbleContainerMine : styles.bubbleContainerTheirs,
          ]}
        >
          {!mine && showAvatar && (
            <Text style={styles.senderName}>
              {sender?.displayName || sender?.username || "User"}
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
            {mine && (
              <Feather
                name={item.isRead ? "check-circle" : "check"}
                size={12}
                color={item.isRead ? AppColors.primary : AppColors.iconMuted}
              />
            )}
            {item.editedAt && (
              <Text style={styles.editedTag}>edited</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ─── Render: Loading Skeleton ─────────────────────────────────────────────
  const renderLoadingItem = () => (
    <View style={styles.convItem}>
      <View style={[styles.avatar, styles.skeleton]} />
      <View style={styles.convContent}>
        <View style={[styles.skeletonLine, { width: "50%", height: 14, marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: "75%", height: 12 }]} />
      </View>
    </View>
  );

  // ─── Chat View ────────────────────────────────────────────────────────────
  if (activeConversation) {
    const other = getOtherMember(activeConversation);
    const isGroup = activeConversation.isGroup;
    const headerName = activeConversation.name || other?.displayName || "Chat";
    const headerAvatar = other?.avatar || activeConversation.avatar;
    const otherUser = !isGroup ? other : null;
    const isAdmin =
      activeConversation.adminIds?.includes(currentUser?.id ?? "") ?? false;

    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
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
            onPress={() => setShowGroupSettings(isGroup && isAdmin)}
          >
            <Feather
              name={isGroup && isAdmin ? "settings" : "info"}
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
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>
              {otherUser ? otherUser.displayName : "Someone"} is typing...
            </Text>
          </View>
        )}

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                // Detect Enter without Shift → send immediately
                if (!isSendingRef.current && text.endsWith('\n') && !text.endsWith('\n\n')) {
                  const trimmed = text.trimEnd();
                  setMessageText('');
                  // handleSend uses messageText from closure — call with the trimmed text directly
                  if (trimmed.length > 0) {
                    handleSendDirect(trimmed);
                  }
                  return;
                }
                setMessageText(text);
                if (text.length > 0 && !isTyping) {
                  setIsTyping(true);
                  if (typingTimeoutRef.current)
                    clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    setIsTyping(false);
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

        {/* ─── Group Settings Modal ─────────────────────────────────────── */}
        {showGroupSettings && (
          <GroupSettingsModal
            conversation={activeConversation}
            members={convMembers}
            onClose={() => setShowGroupSettings(false)}
            onRemoveMember={(member) => handleRemoveMember(member)}
            onAddMember={() => setShowAddMember(true)}
            onLeaveGroup={handleLeaveGroup}
            isRemovingMember={isRemovingMember}
            isAddingMember={isAddingMember}
          />
        )}

        {/* ─── Add Member Sheet ──────────────────────────────────────────── */}
        {showAddMember && (
          <AddMemberSheet
            conversation={activeConversation}
            currentMembers={convMembers}
            onClose={() => {
              setShowAddMember(false);
              setAddMemberSearch("");
            }}
            onAddMember={handleAddMember}
            isAddingMember={isAddingMember}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── Inbox View ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Header
        title="Messages"
        avatarUser={currentUser}
        rightAction={
          <View style={styles.headerActionsRow}>
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
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                setSelectedMembers([]);
                setGroupName("");
                setShowCreateGroup(true);
              }}
            >
              <Feather name="users" size={20} color={AppColors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
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
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={18} color={AppColors.iconMuted} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
      />

      {/* Error banner */}
      {conversationError && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => refreshConversations()}
          activeOpacity={0.8}
        >
          <Feather name="alert-circle" size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.errorBannerText}>{conversationError}</Text>
          <Text style={styles.errorBannerRetry}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Conversation List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.convList}
        refreshing={isLoadingConversations}
        onRefresh={() =>
          refreshConversations().catch(() =>
            Alert.alert("Error", "Failed to refresh conversations.")
          )
        }
        ListHeaderComponent={
          isLoadingConversations && conversations.length === 0 ? (
            <>{[1, 2, 3, 4, 5].map((i) => <View key={i}>{renderLoadingItem()}</View>)}</>
          ) : null
        }
        ListFooterComponent={
          isLoadingConversations && conversations.length > 0 ? (
            <ActivityIndicator
              style={{ paddingVertical: 12 }}
              color={AppColors.primary}
            />
          ) : null
        }
        ListEmptyComponent={
          conversations.length === 0 && !isLoadingConversations ? (
            <View style={styles.emptyInbox}>
              <View style={styles.emptyInboxIcon}>
                <Feather name="send" size={36} color={AppColors.iconMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyInboxTitle}>Messages</Text>
              <Text style={styles.emptyInboxSubtitle}>
                No messages yet.
                {"\n"}Start a conversation with your friends.
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

      {/* ─── New Message Sheet ─────────────────────────────────────────────── */}
      {showNewMsg && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowNewMsg(false);
              setNewMsgSearch("");
              setSearchResults([]);
            }}
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
                newMsgSearch.trim().length > 0
                  ? searchResults
                  : suggestedUsers
              }
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isStarting = startingConvUserId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.newMsgUserItem, isStarting && styles.newMsgUserItemDisabled]}
                    activeOpacity={isStarting ? 1 : 0.7}
                    onPress={() => {
                      if (isStarting) return;
                      handleSelectUser(item);
                    }}
                    disabled={isStarting}
                  >
                    <View style={styles.newMsgAvatarContainer}>
                      <Avatar
                        user={item}
                        size="small"
                        showOnlineIndicator={true}
                        isOnline={isUserOnline(item.id)}
                      />
                    </View>
                    <View style={styles.newMsgUserInfo}>
                      {isStarting ? (
                        <ActivityIndicator size="small" color={AppColors.primary} />
                      ) : (
                        <>
                          <Text style={styles.newMsgUserName}>{item.username || item.displayName}</Text>
                          <Text style={styles.newMsgUserDisplay}>{item.displayName}</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                isSearching ? (
                  <View style={styles.newMsgEmpty}>
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  </View>
                ) : (
                  <Text style={styles.newMsgEmpty}>
                    {newMsgSearch.trim().length > 0
                      ? "No users found"
                      : "No suggested users"}
                  </Text>
                )
              }
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      )}

      {/* ─── Create Group Sheet ─────────────────────────────────────────────── */}
      {showCreateGroup && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowCreateGroup(false)}
          />
          <View style={styles.newMsgSheet}>
            <View style={styles.newMsgSheetHeader}>
              <Text style={styles.newMsgSheetTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowCreateGroup(false)}>
                <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.groupNameContainer}>
              <TextInput
                style={styles.groupNameInput}
                placeholder="Group name..."
                placeholderTextColor={AppColors.iconMuted}
                value={groupName}
                onChangeText={setGroupName}
                maxLength={100}
              />
            </View>

            <Text style={styles.sectionLabel}>Select members</Text>

            <FlatList
              data={suggestedUsers.filter(
                (u) => u.id !== currentUser?.id
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = selectedMembers.some((m) => m.id === item.id);
                return (
                  <TouchableOpacity
                    style={styles.newMsgUserItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedMembers((prev) =>
                        selected
                          ? prev.filter((m) => m.id !== item.id)
                          : [...prev, item]
                      );
                    }}
                  >
                    <View style={styles.newMsgAvatarContainer}>
                      <Avatar
                        user={item}
                        size="medium"
                        showOnlineIndicator={true}
                        isOnline={isUserOnline(item.id)}
                      />
                    </View>
                    <View style={styles.newMsgUserInfo}>
                      <Text style={styles.newMsgUserName}>{item.username}</Text>
                      <Text style={styles.newMsgUserDisplay}>{item.displayName}</Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxSelected,
                      ]}
                    >
                      {selected && (
                        <Feather name="check" size={14} color="white" strokeWidth={3} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <TouchableOpacity
                  style={styles.newMsgUserItem}
                  onPress={() => {
                    fetchSuggestedUsers();
                  }}
                >
                  <View style={styles.newMsgAvatar}>
                    <Feather name="refresh-cw" size={18} color={AppColors.iconMuted} />
                  </View>
                  <Text style={styles.newMsgUserInfo}>
                    Tap to load suggested users
                  </Text>
                </TouchableOpacity>
              }
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity
              style={[
                styles.createGroupBtn,
                (!groupName.trim() || selectedMembers.length === 0 || isCreatingGroup) &&
                  styles.createGroupBtnDisabled,
              ]}
              onPress={handleCreateGroup}
              disabled={!groupName.trim() || selectedMembers.length === 0 || isCreatingGroup}
            >
              {isCreatingGroup ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.createGroupBtnText}>
                  Create Group ({selectedMembers.length} selected)
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════════════════

// ─── Group Settings Modal ─────────────────────────────────────────────────────
interface GroupSettingsModalProps {
  conversation: Conversation;
  members: Conversation["members"];
  onClose: () => void;
  onRemoveMember: (member: User) => void;
  onAddMember: () => void;
  onLeaveGroup: () => void;
  isRemovingMember: boolean;
  isAddingMember: boolean;
}

function GroupSettingsModal({
  conversation,
  members,
  onClose,
  onRemoveMember,
  onAddMember,
  onLeaveGroup,
  isRemovingMember,
}: GroupSettingsModalProps): React.JSX.Element {
  const { currentUser } = useApp();
  const isAdmin = conversation.adminIds?.includes(currentUser?.id ?? "") ?? false;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.settingsSheet}>
          <View style={styles.settingsSheetHeader}>
            <Text style={styles.settingsSheetTitle}>{conversation.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsContent}>
            <Text style={styles.sectionLabel}>Members ({members.length})</Text>

            {members.map((member) => {
              const isSelf = member.id === currentUser?.id;
              const isGroupAdmin = conversation.adminIds?.includes(member.id) ?? false;
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
                      {member.displayName || member.username}
                      {isSelf && (
                        <Text style={styles.memberSelf}> (You)</Text>
                      )}
                      {isGroupAdmin && (
                        <Text style={styles.memberAdmin}> · Admin</Text>
                      )}
                    </Text>
                  </View>
                  {!isSelf && isAdmin && (
                    <TouchableOpacity
                      style={styles.removeMemberBtn}
                      onPress={() => onRemoveMember(member)}
                      disabled={isRemovingMember}
                    >
                      <Feather name="user-minus" size={18} color="#e74c3c" strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <View style={styles.settingsActions}>
              {isAdmin && (
                <TouchableOpacity style={styles.actionRow} onPress={onAddMember}>
                  <Feather name="user-plus" size={20} color={AppColors.text} strokeWidth={2} />
                  <Text style={styles.actionText}>Add member</Text>
                  <Feather name="chevron-right" size={20} color={AppColors.iconMuted} strokeWidth={2} />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionRow} onPress={onLeaveGroup}>
                <Feather name="log-out" size={20} color="#e74c3c" strokeWidth={2} />
                <Text style={styles.leaveGroupText}>Leave group</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Add Member Sheet ─────────────────────────────────────────────────────────
interface AddMemberSheetProps {
  conversation: Conversation;
  currentMembers: Conversation["members"];
  onClose: () => void;
  onAddMember: (user: User) => void;
  isAddingMember: boolean;
}

function AddMemberSheet({
  conversation,
  currentMembers,
  onClose,
  onAddMember,
  isAddingMember,
}: AddMemberSheetProps): React.JSX.Element {
  const { suggestedUsers, fetchSuggestedUsers } = useApp();
  const [search, setSearch] = useState("");
  const memberIds = currentMembers.map((m) => m.id);

  const availableUsers = suggestedUsers.filter(
    (u) => !memberIds.includes(u.id)
  );

  const filtered = search.length > 0
    ? availableUsers.filter(
        (u) =>
          u.username?.toLowerCase().includes(search.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(search.toLowerCase())
      )
    : availableUsers;

  return (
    <View style={styles.sheetOverlay}>
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.newMsgSheet}>
        <View style={styles.newMsgSheetHeader}>
          <Text style={styles.newMsgSheetTitle}>Add Member</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color={AppColors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.newMsgSearchContainer}>
          <Feather name="search" size={16} color={AppColors.iconMuted} strokeWidth={2} />
          <TextInput
            style={styles.newMsgSearchInput}
            placeholder="Search people..."
            placeholderTextColor={AppColors.iconMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.newMsgUserItem}
              activeOpacity={0.7}
              onPress={() => onAddMember(item)}
              disabled={isAddingMember}
            >
              <View style={styles.newMsgAvatarContainer}>
                <Avatar
                  user={item}
                  size="small"
                  showOnlineIndicator={true}
                  isOnline={isUserOnline(item.id)}
                />
              </View>
              <View style={styles.newMsgUserInfo}>
                <Text style={styles.newMsgUserName}>{item.username}</Text>
                <Text style={styles.newMsgUserDisplay}>{item.displayName}</Text>
              </View>
              {isAddingMember ? (
                <ActivityIndicator size="small" color={AppColors.primary} />
              ) : (
                <Feather name="user-plus" size={20} color={AppColors.primary} strokeWidth={2} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.newMsgEmpty}>
              {availableUsers.length === 0
                ? "No users available to add"
                : "No results"}
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },

  // ─── Header ──────────────────────────────────────────────────────────────
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerAction: {
    padding: 4,
  },

  // ─── Search ─────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
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

  // ─── Conversation List ────────────────────────────────────────────────────
  convList: {
    paddingBottom: 100,
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
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
  avatarContainer: {
    width: 52,
    height: 52,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppColors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  convContent: {
    flex: 1,
    marginLeft: 12,
  },
  convTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  convName: {
    ...Typography.bodyMedium,
    flex: 1,
    color: AppColors.text,
  },
  convNameBold: {
    fontWeight: "700",
  },
  convTime: {
    ...Typography.meta,
    color: AppColors.iconMuted,
    marginLeft: 6,
  },
  convBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  convLastMessage: {
    ...Typography.caption,
    fontSize: 13,
    color: AppColors.iconMuted,
    flex: 1,
  },
  convLastMessageBold: {
    fontWeight: "600",
    color: AppColors.text,
  },
  unreadBadge: {
    backgroundColor: AppColors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },

  // ─── Skeleton Loading ───────────────────────────────────────────────────
  skeleton: {
    backgroundColor: AppColors.borderLight,
  },
  skeletonLine: {
    backgroundColor: AppColors.borderLight,
    borderRadius: 4,
  },

  // ─── Empty States ───────────────────────────────────────────────────────
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyChatTitle: {
    ...Typography.sectionTitle,
    color: AppColors.text,
  },
  emptyChatSubtitle: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    ...Typography.caption,
    color: AppColors.iconMuted,
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
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
    textAlign: "center",
    marginTop: 8,
  },

  // ─── Error Banner ────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: "#dc3545",
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorBannerText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
  },
  errorBannerRetry: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // ─── Empty Inbox ────────────────────────────────────────────────────────
  emptyInbox: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyInboxIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${AppColors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
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
    textAlign: "center",
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
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },

  // ─── Sheet / Overlay ─────────────────────────────────────────────────────
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  // ─── New Message Sheet ─────────────────────────────────────────────────
  newMsgSheet: {
    backgroundColor: AppColors.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "70%",
    paddingBottom: 34,
  },
  newMsgSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  newMsgUserItemDisabled: {
    opacity: 0.5,
  },
  newMsgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppColors.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  newMsgAvatarContainer: {
    width: 44,
    height: 44,
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
    textAlign: "center",
    paddingVertical: 32,
  },

  // ─── Group Creation ────────────────────────────────────────────────────
  sectionLabel: {
    ...Typography.captionSemibold,
    fontSize: 12,
    color: AppColors.iconMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  groupNameContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  groupNameInput: {
    ...Typography.body,
    color: AppColors.text,
    backgroundColor: AppColors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AppColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  createGroupBtn: {
    backgroundColor: AppColors.primary,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  createGroupBtnDisabled: {
    opacity: 0.5,
  },
  createGroupBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },

  // ─── Chat Header ───────────────────────────────────────────────────────
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
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

  // ─── Messages ──────────────────────────────────────────────────────────
  messagesList: {
    paddingHorizontal: layoutPadding,
    paddingTop: 10,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-end",
  },
  messageRowMine: {
    justifyContent: "flex-end",
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
    maxWidth: "75%",
  },
  bubbleContainerMine: {
    alignItems: "flex-end",
  },
  bubbleContainerTheirs: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
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
    color: "white",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  msgMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  msgMetaMine: {
    justifyContent: "flex-end",
  },
  msgTime: {
    ...Typography.meta,
    fontSize: 11,
    color: AppColors.iconMuted,
  },
  editedTag: {
    fontSize: 10,
    color: AppColors.iconMuted,
    fontStyle: "italic",
  },

  // ─── Typing ────────────────────────────────────────────────────────────
  typingContainer: {
    paddingHorizontal: layoutPadding,
    paddingBottom: 4,
  },
  typingText: {
    ...Typography.meta,
    color: AppColors.iconMuted,
    fontStyle: "italic",
  },

  // ─── Input ─────────────────────────────────────────────────────────────
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
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

  // ─── Group Settings Modal ──────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  settingsSheet: {
    backgroundColor: AppColors.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "70%",
  },
  settingsSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  settingsSheetTitle: {
    ...Typography.bodySemibold,
    fontSize: 16,
    color: AppColors.text,
    flex: 1,
  },
  settingsContent: {
    paddingBottom: 34,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...Typography.bodyMedium,
    color: AppColors.text,
  },
  memberSelf: {
    color: AppColors.iconMuted,
    fontWeight: "400",
  },
  memberAdmin: {
    color: AppColors.primary,
    fontWeight: "400",
  },
  removeMemberBtn: {
    padding: 8,
  },
  settingsActions: {
    marginTop: 16,
    paddingHorizontal: 18,
    gap: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
  },
  actionText: {
    ...Typography.body,
    flex: 1,
    color: AppColors.text,
  },
  leaveGroupText: {
    ...Typography.body,
    flex: 1,
    color: "#e74c3c",
  },
});
