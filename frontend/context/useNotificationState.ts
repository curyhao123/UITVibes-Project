import { useCallback, useEffect, useRef, useState } from 'react';
import type { Notification } from '../services/notificationService';
import * as api from '../services/api';
import {
  startNotificationHub,
  stopNotificationHub,
  onNewNotification,
  onUnreadCountChanged,
  onAllRead,
  isNotificationHubConnected,
} from '../services/notificationHubService';

export const useNotificationState = (currentUserId: string | null | undefined) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Track a monotonic version so refresh() can drop stale responses
  const fetchSeqRef = useRef(0);

  const refreshNotifications = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    try {
      const [paged, count] = await Promise.all([
        api.getNotifications(),
        api.getUnreadNotificationCount(),
      ]);
      // Drop response if a newer fetch has started
      if (seq !== fetchSeqRef.current) return;
      setNotifications(paged.items ?? []);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api.markNotificationRead(id);
    } catch (error) {
      console.error('Failed to mark notification read:', error);
      // Roll back optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const prevNotifications = notifications;
    const prevUnread = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.markAllNotificationsRead();
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
    }
  }, [notifications, unreadCount]);

  // ─── Real-time SignalR subscription ────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) {
      // Not authenticated — skip SignalR
      return;
    }

    let cancelled = false;

    // Start hub + register handlers
    (async () => {
      await startNotificationHub();
      if (cancelled) return;
      setIsRealtimeConnected(isNotificationHubConnected());
    })();

    // Handler: append new notification to head of list
    const offNew = onNewNotification((notif) => {
      setNotifications((prev) => {
        // Dedup — server may have re-delivered after reconnect
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    });

    // Handler: update unread count from server-authoritative value
    const offCount = onUnreadCountChanged((count) => {
      setUnreadCount(count);
    });

    // Handler: mark all as read (e.g. from another device)
    const offAllRead = onAllRead(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    });

    return () => {
      cancelled = true;
      offNew();
      offCount();
      offAllRead();
      // NOTE: we don't stopNotificationHub here because:
      // 1. The hub is shared app-wide (singleton)
      // 2. It should only stop on logout
    };
  }, [currentUserId]);

  // Stop hub on logout (signaled by currentUserId becoming null AFTER being set)
  const wasAuthenticatedRef = useRef(false);
  useEffect(() => {
    if (currentUserId) {
      wasAuthenticatedRef.current = true;
    } else if (wasAuthenticatedRef.current) {
      // Was authenticated, now logged out — stop the hub
      wasAuthenticatedRef.current = false;
      stopNotificationHub().catch(() => {});
      setIsRealtimeConnected(false);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [currentUserId]);

  return {
    notifications,
    unreadCount,
    refreshNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    setNotifications,
    setUnreadCount,
    isRealtimeConnected,
  };
};
