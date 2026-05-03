import {
  Conversation,
  Message,
  User,
} from "../data/mockData";
import apiClient from "./httpClient";
import { BE_ConversationResponse, BE_MessageResponse } from "./backendTypes";

/** YARP gateway: /message/{**catch-all} → message-service:5240/api/{**catch-all} */
const GW = "/message";

function transformBEConversation(c: BE_ConversationResponse): Conversation {
  const raw = c as unknown as Record<string, any>;
  const name = c.name ?? raw.Name ?? null;
  const avatarUrl = c.avatarUrl ?? raw.AvatarUrl ?? null;
  const lastMessageContent = c.lastMessageContent ?? raw.LastMessageContent ?? null;
  const lastMessageSenderId = c.lastMessageSenderId ?? raw.LastMessageSenderId ?? null;
  const lastMessageAt = c.lastMessageAt ?? raw.LastMessageAt ?? null;
  const unreadCount = c.unreadCount ?? raw.UnreadCount ?? 0;
  const createdAt = c.createdAt ?? raw.CreatedAt;
  const updatedAt = c.updatedAt ?? raw.UpdatedAt ?? createdAt;

  // Backend returns members array of { userId, username?, displayName, avatarUrl }
  // and also a separate members (ConversationMemberDto) array when requesting single conv.
  const memberArr = c.members ?? raw.Members ?? [];
  return {
    id: c.id,
    type: c.type === "Private" ? "private" : "group",
    name: name ?? undefined,
    avatar: avatarUrl ?? undefined,
    members: memberArr.map((m) => ({
      id: m.userId ?? m.UserId,
      username: m.username ?? m.UserId ?? "",
      displayName: m.displayName ?? m.nickname ?? m.Nickname ?? m.UserId ?? "User",
      avatar: m.avatarUrl ?? m.AvatarUrl ?? "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    })),
    lastMessage: lastMessageContent
      ? {
          id: "",
          conversationId: c.id,
          senderId: lastMessageSenderId ?? "",
          sender: { id: lastMessageSenderId ?? "" } as User,
          text: lastMessageContent,
          createdAt: lastMessageAt ?? createdAt,
          isRead: false,
        }
      : undefined,
    unreadCount,
    createdAt,
    updatedAt,
    isGroup: c.type === "Group",
    isMuted: c.isMuted,
    isPinned: c.isPinned,
    adminIds: c.adminIds,
  };
}

function transformBEMessage(m: BE_MessageResponse, members: Conversation["members"] = []): Message {
  const raw = m as unknown as Record<string, any>;
  const senderId = m.senderId ?? raw.SenderId;
  const conversationId = m.conversationId ?? raw.ConversationId;
  const content = m.content ?? raw.Content ?? null;
  const mediaUrl = m.mediaUrl ?? raw.MediaUrl ?? null;
  const createdAt = m.createdAt ?? raw.CreatedAt;
  const isDeleted = m.isDeleted ?? raw.IsDeleted ?? false;
  const isEdited = m.isEdited ?? raw.IsEdited ?? false;
  const editedAt = m.editedAt ?? raw.EditedAt ?? null;
  const readBy = m.readBy ?? raw.ReadBy ?? [];

  const sender = members.find((mem) => mem.id === senderId);
  return {
    id: m.id ?? raw.Id,
    conversationId,
    senderId,
    sender: {
      id: senderId,
      username: sender?.username ?? senderId,
      displayName: sender?.displayName ?? sender?.username ?? "User",
      avatar: sender?.avatar ?? "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    },
    text: isDeleted ? "" : (content ?? ""),
    image: mediaUrl || undefined,
    createdAt,
    isRead: readBy.length > 0,
    editedAt: isEdited ? (editedAt ?? undefined) : undefined,
  };
}

// ─── Conversations ──────────────────────────────────────────────────────────

/** GET /conversations — list user's conversations */
export async function getConversations(): Promise<Conversation[]> {
  const { data } = await apiClient.get<BE_ConversationResponse[]>(
    `${GW}/conversations`,
    { params: { skip: 0, take: 50 } },
  );
  return data.map(transformBEConversation);
}

/** GET /conversations/{id} — get single conversation */
export async function getConversationById(
  id: string,
): Promise<Conversation | undefined> {
  const { data } = await apiClient.get<BE_ConversationResponse>(
    `${GW}/conversations/${id}`,
  );
  return transformBEConversation(data);
}

/** POST /conversations/private — create or get private conversation */
export async function createPrivateConversation(
  otherUserId: string,
): Promise<Conversation> {
  const { data } = await apiClient.post<BE_ConversationResponse>(
    `${GW}/conversations/private`,
    { otherUserId },
  );
  return transformBEConversation(data);
}

/** POST /conversations/group — create group conversation */
export async function createGroupConversation(
  name: string,
  memberUserIds: string[],
): Promise<Conversation> {
  const { data } = await apiClient.post<BE_ConversationResponse>(
    `${GW}/conversations/group`,
    { name, memberUserIds },
  );
  return transformBEConversation(data);
}

/** POST /conversations/{id}/members/{targetUserId} — add member to group */
export async function addMemberToGroup(
  conversationId: string,
  targetUserId: string,
): Promise<void> {
  await apiClient.post(
    `${GW}/conversations/${conversationId}/members/${targetUserId}`,
  );
}

/** DELETE /conversations/{id}/members/{targetUserId} — remove member from group */
export async function removeMemberFromGroup(
  conversationId: string,
  targetUserId: string,
): Promise<void> {
  await apiClient.delete(
    `${GW}/conversations/${conversationId}/members/${targetUserId}`,
  );
}

/** POST /conversations/{id}/leave — leave a group */
export async function leaveGroup(
  conversationId: string,
): Promise<void> {
  await apiClient.post(`${GW}/conversations/${conversationId}/leave`);
}

// ─── Messages ───────────────────────────────────────────────────────────────

/** GET /conversations/{id}/message — get messages for a conversation */
export async function getMessages(
  conversationId: string,
): Promise<{ messages: Message[]; members: Conversation["members"] }> {
  const [msgRes, convRes] = await Promise.all([
    apiClient.get<BE_MessageResponse[]>(
      `${GW}/conversations/${conversationId}/message`,
      { params: { skip: 0, take: 100 } },
    ),
    apiClient.get<BE_ConversationResponse>(
      `${GW}/conversations/${conversationId}`,
    ),
  ]);

  // Members from the conversation list endpoint have { userId, username?, displayName, avatarUrl }
  // Build the member map using whichever shape the backend returned.
  const convRaw = convRes.data as unknown as Record<string, any>;
  const rawMembers = convRes.data.members ?? convRaw.Members ?? [];
  const members: Conversation["members"] = rawMembers.map((m) => ({
    id: m.userId ?? m.UserId,
    username: "username" in m && typeof m.username === "string"
      ? m.username
      : m.UserId ?? m.userId ?? "",
    displayName: "displayName" in m && typeof m.displayName === "string"
      ? m.displayName
      : m.nickname ?? m.Nickname ?? m.UserId ?? m.userId ?? m.name ?? "User",
    avatar:
      "avatarUrl" in m && typeof m.avatarUrl === "string"
        ? m.avatarUrl
        : "AvatarUrl" in m && typeof (m as Record<string, any>).AvatarUrl === "string"
        ? (m as Record<string, any>).AvatarUrl
        : "",
    bio: "",
    followers: 0,
    following: 0,
    posts: 0,
    isVerified: false,
  }));

  return {
    messages: msgRes.data.map((m) => transformBEMessage(m, members)),
    members,
  };
}

/** POST /conversations/{id}/message — send a message */
export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<Message> {
  const { data } = await apiClient.post<BE_MessageResponse>(
    `${GW}/conversations/${conversationId}/message`,
    { content: text, type: 0 },
  );
  return transformBEMessage(data);
}

/** PUT /conversations/{id}/message/{messageId} — edit a message */
export async function editMessage(
  conversationId: string,
  messageId: string,
  content: string,
): Promise<Message> {
  const { data } = await apiClient.put<BE_MessageResponse>(
    `${GW}/conversations/${conversationId}/message/${messageId}`,
    { content },
  );
  return transformBEMessage(data);
}

/** DELETE /conversations/{id}/message/{messageId} — soft-delete a message */
export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  await apiClient.delete(
    `${GW}/conversations/${conversationId}/message/${messageId}`,
  );
}

/** POST /conversations/{id}/message/{messageId}/read — mark message as read */
export async function markMessagesRead(
  conversationId: string,
  messageId: string,
): Promise<void> {
  await apiClient.post(
    `${GW}/conversations/${conversationId}/message/${messageId}/read`,
  );
}
