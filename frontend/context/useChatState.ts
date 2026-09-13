import { useCallback, useEffect, useRef, useState } from 'react';
import { User, Conversation, Message } from '../data/mockData';
import * as api from '../services/api';
import { getConnection } from '../services/signalrService';
import type { BE_MessageResponse } from '../services/backendTypes';
import { transformBEMessage } from '../services/messageService';

export const useChatState = (currentUser: User | null, onlineSignalRConnected: boolean) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationMembers, setConversationMembers] = useState<Conversation['members']>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const conversationMembersRef = useRef<Conversation['members']>([]);
  const locallyReadConversationIdsRef = useRef<Set<string>>(new Set());
  const activeConversationRef = useRef<Conversation | null>(null);
  activeConversationRef.current = activeConversation;

  const refreshConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setConversationError(null);
    try {
      const data = await api.getConversations();
      setConversations((prev) => {
        const previousIds = new Set(prev.map((c) => c.id));
        return data.map((conv) => ({
          ...conv,
          unreadCount:
            previousIds.has(conv.id) &&
            locallyReadConversationIdsRef.current.has(conv.id)
              ? 0
              : conv.unreadCount,
        }));
      });
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'Failed to load conversations.';
      console.error('[AppContext] refreshConversations: FAILED —', msg, error);
      setConversationError(msg);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    setMessageError(null);
    setMessages([]);
    try {
      const { messages: msgs, members } = await api.getMessages(conversationId);
      const orderedMessages = [...msgs].reverse();
      setMessages(orderedMessages);
      setConversationMembers(members);
      return orderedMessages;
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? 'Failed to load messages.';
      setMessageError(msg);
      console.error('[AppContext] loadMessages:', msg, error);
      return [];
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      payload: string | {
        content?: string;
        mediaUri?: string;
        mediaUrl?: string;
        mediaPublicId?: string;
        fileName?: string;
        fileSize?: number;
        type?: 0 | 1 | 2 | 3;
      },
    ) => {
      try {
        const newMsg = await api.sendMessage(conversationId, payload, conversationMembersRef.current);
        if (newMsg.senderId === currentUser?.id && !newMsg.sender?.displayName) {
          newMsg.sender = currentUser;
        }
        setMessages((prev) => {
          const isDuplicate = prev.some((m) => m.id === newMsg.id);
          if (isDuplicate) {
            return prev;
          }
          return [...prev, newMsg];
        });
        await refreshConversations();
      } catch (error: any) {
        const msg = error?.response?.data?.message ?? 'Failed to send message.';
        console.error('[AppContext] sendMessage:', msg, error);
        throw new Error(msg);
      }
    },
    [currentUser, refreshConversations],
  );

  const editMessage = useCallback(
    async (conversationId: string, messageId: string, text: string) => {
      try {
        await api.editMessage(conversationId, messageId, text);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, text, editedAt: new Date().toISOString() }
              : m,
          ),
        );
      } catch (error: any) {
        const msg = error?.response?.data?.message ?? 'Failed to edit message.';
        console.error('[AppContext] editMessage:', msg, error);
        throw new Error(msg);
      }
    },
    [],
  );

  const deleteMessage = useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        await api.deleteMessage(conversationId, messageId);
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } catch (error: any) {
        const msg = error?.response?.data?.message ?? 'Failed to delete message.';
        console.error('[AppContext] deleteMessage:', msg, error);
        throw new Error(msg);
      }
    },
    [],
  );

  const markMessagesRead = useCallback(
    async (conversationId: string, lastMessageId?: string) => {
      try {
        const fallbackLastMsg = messages[messages.length - 1];
        const messageIdToRead = lastMessageId ?? fallbackLastMsg?.id;
        if (messageIdToRead) {
          await api.markMessagesRead(conversationId, messageIdToRead);
        }
        locallyReadConversationIdsRef.current.add(conversationId);
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
          ),
        );
      } catch (error) {
        console.error('[AppContext] markMessagesRead:', error);
      }
    },
    [messages],
  );

  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      locallyReadConversationIdsRef.current.add(conversationId);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
        ),
      );
      try {
        const conv = conversations.find((c) => c.id === conversationId);
        const lastMsgId = conv?.lastMessage?.id;
        if (lastMsgId) {
          await api.markMessagesRead(conversationId, lastMsgId);
        }
      } catch (error) {
        console.error('[AppContext] markConversationAsRead: API call failed:', error);
      }
    },
    [conversations],
  );

  const startConversation = useCallback(
    async (userId: string) => {
      let conv;
      try {
        conv = await api.createPrivateConversation(userId);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to start conversation.';
        console.error('[AppContext] startConversation: API FAILED —', msg, err);
        throw new Error(msg);
      }
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        if (exists) return prev;
        return [conv, ...prev];
      });
      return conv;
    },
    [],
  );

  const createGroup = useCallback(
    async (name: string, memberUserIds: string[]) => {
      const conv = await api.createGroupConversation(name, memberUserIds);
      setConversations((prev) => {
        const withoutExisting = prev.filter((c) => c.id !== conv.id);
        return [conv, ...withoutExisting];
      });
      setActiveConversation(conv);
      return conv;
    },
    [],
  );

  const addGroupMember = useCallback(
    async (conversationId: string, targetUserId: string) => {
      await api.addMemberToGroup(conversationId, targetUserId);
      const updated = await api.getConversationById(conversationId);
      if (!updated) return null;

      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversationId ? updated : conv)),
      );
      setActiveConversation((prev) =>
        prev?.id === conversationId ? updated : prev,
      );
      setConversationMembers(updated.members);
      return updated;
    },
    [],
  );

  const removeGroupMember = useCallback(
    async (conversationId: string, targetUserId: string) => {
      await api.removeMemberFromGroup(conversationId, targetUserId);
      const updated = await api.getConversationById(conversationId);
      if (!updated) return null;

      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversationId ? updated : conv)),
      );
      setActiveConversation((prev) =>
        prev?.id === conversationId ? updated : prev,
      );
      setConversationMembers(updated.members);
      return updated;
    },
    [],
  );

  const leaveGroupConversation = useCallback(
    async (conversationId: string) => {
      await api.leaveGroup(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      setActiveConversation((prev) => (prev?.id === conversationId ? null : prev));
      setConversationMembers([]);
      setMessages([]);
    },
    [],
  );

  useEffect(() => {
    conversationMembersRef.current = conversationMembers;
  }, [conversationMembers]);

  useEffect(() => {
    if (!activeConversation) return;
    if (!onlineSignalRConnected) return;

    const connection = getConnection();
    if (!connection) {
      console.warn('[AppContext] SignalR connection not available for message listener');
      return;
    }

    const messageHandler = (messageData: BE_MessageResponse) => {
      const messageConvId = messageData.conversationId ?? (messageData as any).ConversationId;
      if (messageConvId !== activeConversation.id) {
        return;
      }

      const newMessage = transformBEMessage(messageData, conversationMembersRef.current);
      setMessages((prev) => {
        const isDuplicate = prev.some((m) => m.id === newMessage.id);
        if (isDuplicate) {
          return prev;
        }
        return [...prev, newMessage];
      });
    };

    connection.on('ReceiveMessage', messageHandler);
    return () => {
      connection.off('ReceiveMessage', messageHandler);
    };
  }, [activeConversation, onlineSignalRConnected]);

  useEffect(() => {
    if (!onlineSignalRConnected) return;

    const connection = getConnection();
    if (!connection) return;

    const convListHandler = (messageData: BE_MessageResponse) => {
      const messageConvId = messageData.conversationId ?? (messageData as any).ConversationId;
      const senderId = messageData.senderId ?? (messageData as any).SenderId;
      const content = messageData.content ?? (messageData as any).Content ?? '';
      const mediaUrl = messageData.mediaUrl ?? (messageData as any).MediaUrl ?? null;
      const rawType = messageData.type ?? (messageData as any).Type ?? 'Text';
      const normalizedType = (rawType as string).toLowerCase();
      const messageType: Message['messageType'] =
        normalizedType === 'image' ? 'image'
        : normalizedType === 'video' ? 'video'
        : normalizedType === 'file' ? 'file'
        : normalizedType === 'system' ? 'system'
        : 'text';
      const createdAt = messageData.createdAt ?? (messageData as any).CreatedAt;
      if (!messageConvId) return;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === messageConvId);
        if (idx === -1) return prev;

        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = {
          id: messageData.id ?? (messageData as any).Id ?? '',
          conversationId: messageConvId,
          senderId,
          sender: { id: senderId } as User,
          text: content,
          image: mediaUrl || undefined,
          messageType,
          createdAt: createdAt ?? new Date().toISOString(),
          isRead: false,
        };

        const isActive = activeConversationRef.current?.id === messageConvId;
        conv.unreadCount = isActive ? 0 : (conv.unreadCount ?? 0) + 1;
        if (!isActive) {
          locallyReadConversationIdsRef.current.delete(messageConvId);
        }

        updated.splice(idx, 1);
        return [conv, ...updated];
      });

      const isMsgFromPartner = senderId !== currentUser?.id;
      if (isMsgFromPartner) {
        setPartnerTyping(false);
      }
    };

    connection.on('ReceiveMessage', convListHandler);
    return () => {
      connection.off('ReceiveMessage', convListHandler);
    };
  }, [currentUser, onlineSignalRConnected]);

  useEffect(() => {
    if (!onlineSignalRConnected) return;

    const connection = getConnection();
    if (!connection) return;

    const editedHandler = (messageData: BE_MessageResponse) => {
      const messageConvId = messageData.conversationId ?? (messageData as any).ConversationId;
      const messageId = messageData.id ?? (messageData as any).Id;
      const content = messageData.content ?? (messageData as any).Content ?? '';
      const editedAt =
        messageData.editedAt ?? (messageData as any).EditedAt ?? new Date().toISOString();

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, text: content, editedAt } : message,
        ),
      );

      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== messageConvId) return conversation;
          if (conversation.lastMessage?.id !== messageId) return conversation;
          return {
            ...conversation,
            lastMessage: conversation.lastMessage
              ? { ...conversation.lastMessage, text: content, editedAt }
              : conversation.lastMessage,
          };
        }),
      );
    };

    const deletedHandler = (data: {
      conversationId?: string;
      ConversationId?: string;
      messageId?: string;
      MessageId?: string;
    }) => {
      const conversationId = data.conversationId ?? data.ConversationId;
      const messageId = data.messageId ?? data.MessageId;
      if (!messageId) return;

      setMessages((prev) => prev.filter((message) => message.id !== messageId));

      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          if (conversation.lastMessage?.id !== messageId) return conversation;
          return { ...conversation, lastMessage: undefined };
        }),
      );
    };

    const readHandler = (data: {
      conversationId?: string;
      ConversationId?: string;
      userId?: string;
      UserId?: string;
      messageId?: string;
      MessageId?: string;
    }) => {
      const conversationId = data.conversationId ?? data.ConversationId;
      const readerId = data.userId ?? data.UserId;
      const messageId = data.messageId ?? data.MessageId;
      if (!conversationId || !readerId || !messageId) return;

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId && readerId === currentUser?.id
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
      if (readerId === currentUser?.id) {
        locallyReadConversationIdsRef.current.add(conversationId);
      }

      if (readerId === currentUser?.id) return;

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId && message.senderId === currentUser?.id
            ? { ...message, isRead: true }
            : message,
        ),
      );
    };

    connection.on('MessageEdited', editedHandler);
    connection.on('MessageDeleted', deletedHandler);
    connection.on('MessagesRead', readHandler);

    return () => {
      connection.off('MessageEdited', editedHandler);
      connection.off('MessageDeleted', deletedHandler);
      connection.off('MessagesRead', readHandler);
    };
  }, [currentUser?.id, onlineSignalRConnected]);

  useEffect(() => {
    if (!onlineSignalRConnected) return;

    const connection = getConnection();
    if (!connection) return;

    const typingHandler = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      const typingConvId = data.conversationId;
      const typingUserId = data.userId;
      const isTyping = data.isTyping;

      if (typingConvId !== activeConversation?.id) return;
      if (typingUserId === currentUser?.id) return;

      setPartnerTyping(isTyping);
    };

    connection.on('UserTyping', typingHandler);
    return () => {
      connection.off('UserTyping', typingHandler);
    };
  }, [activeConversation, currentUser, onlineSignalRConnected]);

  return {
    conversations,
    setConversations,
    activeConversation,
    setActiveConversation,
    messages,
    setMessages,
    conversationMembers,
    setConversationMembers,
    isLoadingConversations,
    isLoadingMessages,
    conversationError,
    messageError,
    refreshConversations,
    loadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    markMessagesRead,
    markConversationAsRead,
    startConversation,
    createGroup,
    addGroupMember,
    removeGroupMember,
    leaveGroupConversation,
    partnerTyping,
    setPartnerTyping,
  };
};
