import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CreateGroupSheet,
  MessageListItem,
  NewMessageSheet,
  OnlineFriendsList,
  StaticPremiumHeader,
} from "../../components";
import { TAB_BAR_BOTTOM_OFFSET } from "../../components/ModernTabBar";
import { AppColors, layoutPadding } from "../../constants/theme";
import { Typography } from "../../constants/typography";
import { useApp } from "../../context/AppContext";
import { Conversation, User } from "../../data/mockData";
import * as api from "../../services/api";
import { deleteConversation } from "../../services/messageService";

export default function MessageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetContentBottomPadding = TAB_BAR_BOTTOM_OFFSET + Math.max(insets.bottom, 0) + 20;

  const {
    currentUser,
    conversations,
    isLoadingConversations,
    conversationError,
    refreshConversations,
    setActiveConversation,
    markConversationAsRead,
    startConversation,
    createGroup,
    suggestedUsers,
    fetchSuggestedUsers,
    isUserOnline,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [newMsgSearch, setNewMsgSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupFriends, setGroupFriends] = useState<User[]>([]);
  const [groupFriendSearch, setGroupFriendSearch] = useState("");
  const [isLoadingGroupFriends, setIsLoadingGroupFriends] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [startingConvUserId, setStartingConvUserId] = useState<string | null>(null);

  // Load conversation list on mount
  useEffect(() => {
    refreshConversations().catch(() =>
      Alert.alert("Error", "Failed to load conversations. Pull to retry.")
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    setStartingConvUserId(user.id);
    setShowNewMsg(false);

    try {
      const conv = await startConversation(user.id);
      if (!conv) {
        console.warn("[MessageScreen] startConversation returned null unexpectedly");
        Alert.alert("Error", "Unable to create conversation at this time.");
        return;
      }

      router.push(`/message/chat/${conv.id}`);
      setNewMsgSearch("");
      setSearchResults([]);
    } catch (err: any) {
      console.error("[MessageScreen] startConversation FAILED:", err?.response?.data ?? err?.message ?? err);
      Alert.alert(
        "Error",
        err?.response?.data?.message ?? err?.message ?? "Unable to create conversation at this time."
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

  const loadGroupFriends = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingGroupFriends(true);
    try {
      const friends = await api.getFriends(currentUser.id, 200);
      setGroupFriends(friends.filter((friend) => friend.id !== currentUser.id));
    } catch {
      setGroupFriends([]);
    } finally {
      setIsLoadingGroupFriends(false);
    }
  }, [currentUser?.id]);

  const groupFriendResults = groupFriends.filter((friend) => {
    const query = groupFriendSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      friend.username?.toLowerCase().includes(query) ||
      friend.displayName?.toLowerCase().includes(query)
    );
  });

  const handleConversationPress = useCallback(
    async (conv: Conversation) => {
      await markConversationAsRead(conv.id);
      router.push(`/message/chat/${conv.id}`);
    },
    [markConversationAsRead, router]
  );

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      try {
        await deleteConversation(convId);
        await refreshConversations();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        Alert.alert("Error", "Failed to delete conversation");
      }
    },
    [refreshConversations]
  );

  // ─── Group Chat ────────────────────────────────────────────────────────────
  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      Alert.alert("Error", "Please enter a group name.");
      return;
    }
    if (selectedMembers.length < 2) {
      Alert.alert("Error", "Please select at least two friends.");
      return;
    }
    setIsCreatingGroup(true);
    try {
      const newConv = await createGroup(
        groupName.trim(),
        selectedMembers.map((m) => m.id)
      );
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMembers([]);
      setGroupFriendSearch("");
      await refreshConversations();
      setActiveConversation(newConv);
      router.push(`/message/chat/${newConv.id}`);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message ?? "Failed to create group."
      );
    } finally {
      setIsCreatingGroup(false);
    }
  }, [createGroup, groupName, router, selectedMembers, refreshConversations, setActiveConversation]);

  const handleToggleMember = useCallback((user: User) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === user.id)
        ? prev.filter((m) => m.id !== user.id)
        : [...prev, user]
    );
  }, []);

  const renderLoadingItem = () => (
    <View style={styles.skeletonItem}>
      <View style={[styles.avatarSkeleton, styles.skeleton]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: "50%", height: 14, marginBottom: 6 }]} />
        <View style={[styles.skeletonLine, { width: "75%", height: 12 }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StaticPremiumHeader
        title="Messages"
        largeTitle
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
              <Feather name="edit-2" size={25} color={AppColors.text} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                setSelectedMembers([]);
                setGroupName("");
                setGroupFriendSearch("");
                loadGroupFriends();
                setShowCreateGroup(true);
              }}
            >
              <Feather name="users" size={25} color={AppColors.text} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.headerAction}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => router.back()}
            >
              <Feather name="arrow-right" size={25} color={AppColors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Search Bar */}
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

      {/* Online Friends Strip */}
      <OnlineFriendsList
        onFriendPress={(friend: { userId: string; displayName: string; avatarUrl?: string | null }) =>
          handleSelectUser({
            id: friend.userId,
            username: friend.displayName,
            displayName: friend.displayName,
            avatar: friend.avatarUrl ?? "",
            bio: "",
            coverImage: "",
            followers: 0,
            following: 0,
            posts: 0,
            isVerified: false,
          } as User)
        }
      />

      {/* Conversation List */}
      <FlatList
        data={filteredConversations}
        renderItem={({ item }) => (
          <MessageListItem
            conversation={item}
            currentUserId={currentUser?.id ?? ""}
            isUserOnline={isUserOnline}
            onConversationPress={handleConversationPress}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.convList}
        refreshing={isLoadingConversations}
        onRefresh={() =>
          refreshConversations().catch(() =>
            Alert.alert("Error", "Failed to refresh conversations.")
          )
        }
        extraData={filteredConversations}
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

      {/* New Message Sheet */}
      <NewMessageSheet
        visible={showNewMsg}
        searchQuery={newMsgSearch}
        onChangeSearch={setNewMsgSearch}
        searchResults={searchResults}
        suggestedUsers={suggestedUsers}
        isSearching={isSearching}
        startingUserId={startingConvUserId}
        bottomPadding={sheetContentBottomPadding}
        isUserOnline={isUserOnline}
        onSelectUser={handleSelectUser}
        onClose={() => {
          setShowNewMsg(false);
          setNewMsgSearch("");
          setSearchResults([]);
        }}
      />

      {/* Create Group Sheet */}
      <CreateGroupSheet
        visible={showCreateGroup}
        groupName={groupName}
        onChangeGroupName={setGroupName}
        friendSearch={groupFriendSearch}
        onChangeFriendSearch={setGroupFriendSearch}
        friends={groupFriendResults}
        selectedMembers={selectedMembers}
        onToggleMember={handleToggleMember}
        isLoadingFriends={isLoadingGroupFriends}
        isCreatingGroup={isCreatingGroup}
        bottomPadding={sheetContentBottomPadding}
        isUserOnline={isUserOnline}
        onRefreshFriends={loadGroupFriends}
        onSubmit={handleCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerAction: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: layoutPadding,
    marginTop: 15,
  },
  searchInput: {
    ...Typography.caption,
    flex: 1,
    marginLeft: 8,
    color: AppColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  convList: {
    paddingBottom: 100,
  },
  skeletonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layoutPadding,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  avatarSkeleton: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeleton: {
    backgroundColor: AppColors.borderLight,
  },
  skeletonLine: {
    backgroundColor: AppColors.borderLight,
    borderRadius: 4,
  },
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
});
