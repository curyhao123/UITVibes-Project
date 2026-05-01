import {
  Conversation,
  Message,
  User,
} from "../data/mockData";
import apiClient from "./httpClient";
import { getCurrentUser, getCurrentUserId } from "./session";
import { BE_ConversationResponse, BE_MessageResponse } from "./backendTypes";

function transformBEConversation(c: BE_ConversationResponse): Conversation {
  return {
    id: c.id,
    type: c.type === "Private" ? "private" : "group",
    name: c.name,
    avatar: c.avatarUrl,
    members: c.members.map((m) => ({
      id: m.id,
      username: m.username,
      displayName: m.displayName,
      avatar: m.avatarUrl,
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    })),
    lastMessage: c.lastMessageContent
      ? {
          id: "",
          conversationId: c.id,
          senderId: c.lastMessageSenderId,
          sender: {} as User,
          text: c.lastMessageContent,
          createdAt: c.lastMessageAt,
          isRead: false,
        }
      : undefined,
    unreadCount: c.unreadCount,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isGroup: c.type === "Group",
    isMuted: c.isMuted,
    isPinned: c.isPinned,
    adminIds: c.adminIds,
  };
}

function transformBEMessage(m: BE_MessageResponse): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    sender: { id: m.senderId } as User,
    text: m.isDeleted ? "" : m.content,
    image: m.mediaUrl || undefined,
    createdAt: m.createdAt,
    isRead: m.readBy.length > 0,
    editedAt: m.isEdited ? m.editedAt : undefined,
  };
}

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await apiClient.get<BE_ConversationResponse[]>(
    "/message/conversations",
    {
      params: { skip: 0, take: 20 },
    },
  );
  return data.map(transformBEConversation);
}

export async function getConversationById(
  id: string,
): Promise<Conversation | undefined> {
  const { data } = await apiClient.get<BE_ConversationResponse>(
    `/message/conversation/${id}`,
  );
  return transformBEConversation(data);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data } = await apiClient.get<BE_MessageResponse[]>(
    `/message/conversation/${conversationId}/messages`,
    { params: { skip: 0, take: 50 } },
  );
  return data.map(transformBEMessage);
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<Message> {
  const { data } = await apiClient.post<BE_MessageResponse>(
    `/message/conversation/${conversationId}/send`,
    { content: text, type: 0 },
  );
  return transformBEMessage(data);
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  await apiClient.delete(
    `/message/conversation/${conversationId}/message/${messageId}`,
  );
  return true;
}

export async function markMessagesRead(conversationId: string): Promise<void> {
  await apiClient.post(`/message/conversation/${conversationId}/read`, {});
}

export async function createConversation(
  userId: string,
): Promise<Conversation> {
  const { data } = await apiClient.post<BE_ConversationResponse>(
    "/message/conversation",
    { participantId: userId },
  );
  return transformBEConversation(data);
}
