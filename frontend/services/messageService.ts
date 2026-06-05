import {
  Conversation,
  Message,
  User,
} from "../data/mockData";
import apiClient from "./httpClient";
import { uploadMedia } from "./postService";
import { BE_ConversationResponse, BE_MessageResponse } from "./backendTypes";

/** YARP gateway: /message/{**catch-all} → message-service:5240/api/{**catch-all} */
const GW = "/message";

type RawConversationMember = {
  userId?: string;
  UserId?: string;
  username?: string;
  displayName?: string | null;
  DisplayName?: string | null;
  nickname?: string | null;
  Nickname?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  AvatarUrl?: string | null;
  role?: string;
  Role?: string;
};

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

  // Backend returns members array of ConversationMemberDto, including role.
  const memberArr = (c.members ?? raw.Members ?? []) as RawConversationMember[];
  const adminIds =
    c.adminIds ??
    (raw.AdminIds as string[] | undefined) ??
    memberArr
      .filter((m) => (m.role ?? m.Role) === "Admin")
      .map((m) => m.userId ?? m.UserId)
      .filter((id): id is string => Boolean(id));

  return {
    id: c.id,
    type: c.type === "Private" ? "private" : "group",
    name: name ?? undefined,
    avatar: avatarUrl ?? undefined,
    members: memberArr.map((m) => ({
      id: m.userId ?? m.UserId ?? "",
      username: m.username ?? m.UserId ?? "",
      displayName: m.displayName ?? m.nickname ?? m.Nickname ?? m.UserId ?? "User",
      fullName: m.displayName ?? m.nickname ?? m.Nickname ?? "",
      avatar: m.avatarUrl ?? m.AvatarUrl ?? "",
      coverImage: "",
      bio: "",
      gender: "",
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
    adminIds,
  };
}

export function transformBEMessage(m: BE_MessageResponse, members: Conversation["members"] = []): Message {
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
  const rawType = (m.type ?? raw.Type ?? "Text") as string;
  const normalizedType = rawType.toLowerCase();
  const messageType: Message["messageType"] =
    normalizedType === "image"
      ? "image"
      : normalizedType === "video"
        ? "video"
        : normalizedType === "file"
          ? "file"
          : normalizedType === "system"
            ? "system"
            : "text";

  const sender = members.find((mem) => mem.id === senderId);
  return {
    id: m.id ?? raw.Id,
    conversationId,
    senderId,
    sender: {
      id: senderId,
      username: sender?.username ?? senderId,
      displayName: sender?.displayName ?? sender?.username ?? "User",
      fullName: sender?.fullName ?? sender?.displayName ?? "",
      avatar: sender?.avatar ?? "",
      coverImage: "",
      bio: "",
      gender: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    },
    text: isDeleted ? "" : (content ?? ""),
    image: mediaUrl || undefined,
    messageType,
    fileName: m.fileName ?? raw.FileName ?? undefined,
    fileSize: m.fileSize ?? raw.FileSize ?? undefined,
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
  const rawMembers = (convRes.data.members ?? convRaw.Members ?? []) as RawConversationMember[];
  const members: Conversation["members"] = rawMembers.map((m) => ({
    id: m.userId ?? m.UserId ?? "",
    username: "username" in m && typeof m.username === "string"
      ? m.username
      : m.UserId ?? m.userId ?? "",
    displayName: "displayName" in m && typeof m.displayName === "string"
      ? m.displayName
      : m.nickname ?? m.Nickname ?? m.UserId ?? m.userId ?? m.name ?? "User",
    fullName: "displayName" in m && typeof m.displayName === "string"
      ? m.displayName
      : m.nickname ?? m.Nickname ?? "",
    avatar:
      "avatarUrl" in m && typeof m.avatarUrl === "string"
        ? m.avatarUrl
        : "AvatarUrl" in m && typeof (m as Record<string, any>).AvatarUrl === "string"
        ? (m as Record<string, any>).AvatarUrl
        : "",
    coverImage: "",
    bio: "",
    gender: "",
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

type SendMessagePayload = {
  content?: string;
  mediaUri?: string;
  mediaUrl?: string;
  mediaPublicId?: string;
  fileName?: string;
  fileSize?: number;
  type?: 0 | 1 | 2 | 3;
};

/** POST /conversations/{id}/message — send a message */
export async function sendMessage(
  conversationId: string,
  payload: string | SendMessagePayload,
  members: Conversation["members"] = [],
): Promise<Message> {
  const request = typeof payload === "string"
    ? { content: payload, type: 0 as const }
    : payload;

  let mediaUrl = request.mediaUrl;
  let mediaPublicId = request.mediaPublicId;
  let type = request.type ?? 0;

  if (request.mediaUri) {
    const uploaded = await uploadMedia(request.mediaUri, "image");
    mediaUrl = uploaded.url;
    mediaPublicId = uploaded.publicId;
    type = 1;
  }

  const { data } = await apiClient.post<BE_MessageResponse>(
    `${GW}/conversations/${conversationId}/message`,
    {
      content: request.content ?? "",
      mediaUrl: mediaUrl ?? null,
      mediaPublicId: mediaPublicId ?? null,
      fileName: request.fileName ?? null,
      fileSize: request.fileSize ?? null,
      type,
    },
  );
  return transformBEMessage(data, members);
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

/** DELETE /conversations/{id} — delete (soft-delete) a conversation */
export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`${GW}/conversations/${conversationId}`);
}
