import {
  Conversation,
  Message,
  User,
  mockConversations,
  mockMessagesMap,
} from "../data/mockData";
import apiClient, { delay } from "./httpClient";
import { getCurrentAccount, getCurrentUser, getCurrentUserId } from "./session";
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
  try {
    const { data } = await apiClient.get<BE_ConversationResponse[]>(
      "/message/conversations",
      {
        params: { skip: 0, take: 20 },
      },
    );
    return data.map(transformBEConversation);
  } catch {
    await delay(300);
    if (getCurrentAccount() === "newUser") return [];
    return [...mockConversations].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }
}

export async function getConversationById(
  id: string,
): Promise<Conversation | undefined> {
  try {
    const { data } = await apiClient.get<BE_ConversationResponse>(
      `/message/conversation/${id}`,
    );
    return transformBEConversation(data);
  } catch {
    await delay(200);
    return mockConversations.find((c) => c.id === id);
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const { data } = await apiClient.get<BE_MessageResponse[]>(
      `/message/conversation/${conversationId}/messages`,
      { params: { skip: 0, take: 50 } },
    );
    return data.map(transformBEMessage);
  } catch {
    await delay(300);
    return mockMessagesMap[conversationId] || [];
  }
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<Message> {
  try {
    const { data } = await apiClient.post<BE_MessageResponse>(
      `/message/conversation/${conversationId}/send`,
      { content: text, type: 0 },
    );
    return transformBEMessage(data);
  } catch {
    await delay(200);
    const newMessage: Message = {
      id: `msg${Date.now()}`,
      conversationId,
      senderId: getCurrentUserId(),
      sender: getCurrentUser() || ({} as User),
      text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    if (!mockMessagesMap[conversationId]) {
      mockMessagesMap[conversationId] = [];
    }
    mockMessagesMap[conversationId].push(newMessage);

    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.lastMessage = newMessage;
      conv.updatedAt = newMessage.createdAt;
    }

    return newMessage;
  }
}

export async function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  try {
    await apiClient.delete(
      `/message/conversation/${conversationId}/message/${messageId}`,
    );
    return true;
  } catch {
    await delay(200);
    const messages = mockMessagesMap[conversationId];
    if (messages) {
      const idx = messages.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        messages.splice(idx, 1);
        return true;
      }
    }
    return false;
  }
}

export async function markMessagesRead(conversationId: string): Promise<void> {
  try {
    await apiClient.post(`/message/conversation/${conversationId}/read`, {});
  } catch {
    await delay(100);
    const conv = mockConversations.find((c) => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    const messages = mockMessagesMap[conversationId];
    if (messages) {
      messages.forEach((m) => {
        if (m.senderId !== getCurrentUserId()) m.isRead = true;
      });
    }
  }
}

export async function createConversation(
  userId: string,
): Promise<Conversation> {
  try {
    const { data } = await apiClient.post<BE_ConversationResponse>(
      "/message/conversation",
      { participantId: userId },
    );
    return transformBEConversation(data);
  } catch {
    await delay(300);
    const user = mockConversations
      .flatMap((c) => c.members)
      .find((u) => u.id === userId) as User | undefined;
    if (!user) throw new Error("User not found");

    const existing = mockConversations.find(
      (c) => !c.isGroup && c.members.some((m) => m.id === userId),
    );
    if (existing) return existing;

    const newConv: Conversation = {
      id: `conv${Date.now()}`,
      type: "private",
      members: [getCurrentUser() || ({ id: getCurrentUserId() } as User), user],
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockConversations.push(newConv);
    return newConv;
  }
}
