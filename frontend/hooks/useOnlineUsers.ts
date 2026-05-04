/**
 * useOnlineUsers — manages the global set of online user IDs.
 *
 * Features:
 * 1. Maintains a Set<userId> of currently-online users.
 * 2. Fetches initial list via REST API (GET /message/onlinetracking/online-friends).
 * 3. Registers SignalR listeners (UserOnline / UserOffline) and updates the set in real-time.
 * 4. Runs heartbeat (RefreshOnline) every 4.5 minutes to keep the Redis TTL alive.
 * 5. Cleans up all listeners and timers on unmount.
 *
 * Usage:
 *   const { isOnline, onlineCount } = useOnlineUsers();
 *   const isTargetOnline = isOnline(targetUserId);
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addConnectionStateListener,
  getConnectionState,
  invokeHub,
  startConnection,
  stopConnection,
} from "../services/signalrService";
import {
  getOnlineFriends,
  getOnlineUsers,
} from "../services/onlineTrackingService";
import { getAccessToken } from "../services/httpClient";

const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1_000; // 4 minutes — server TTL is 10 min

export interface UseOnlineUsersReturn {
  /** Live Set of online user IDs (as strings) */
  onlineUsers: Set<string>;
  /** True while the initial REST fetch is in progress */
  isLoading: boolean;
  /** True if SignalR connection is active */
  isConnected: boolean;
  /** Total number of online users */
  onlineCount: number;
  /** Convenience helper — returns true if the given userId is online */
  isOnline: (userId: string) => boolean;
  /** Force-refresh from REST API */
  refresh: () => Promise<void>;
  /** Manually start the SignalR connection (called automatically when authenticated) */
  connect: () => Promise<void>;
  /** Manually disconnect SignalR (called automatically on sign out) */
  disconnect: () => Promise<void>;
}

// ─── State container ────────────────────────────────────────────────────────────

/** Normalize any userId to string — handles Number | string | UUID from backend */
const toStringId = (id: string | number): string => String(id);

export function useOnlineUsers(isAuthenticated: boolean): UseOnlineUsersReturn {
  // onlineUsers is a Set for O(1) lookup — we store it as an array internally
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Stable ref to current set so callbacks don't need to be state deps
  const onlineUserIdsRef = useRef<string[]>([]);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const rebuildSet = useCallback((ids: (string | number)[]) => {
    const normalized = ids.map(toStringId);
    onlineUserIdsRef.current = normalized;
    setOnlineUserIds(normalized);
    console.log("[useOnlineUsers] REST fetched → Set:", Array.from(normalized));
  }, []);

  const isOnline = useCallback(
    (userId: string | number): boolean => {
      const normalizedId = toStringId(userId);
      const found = onlineUserIdsRef.current.includes(normalizedId);
      console.log(`[useOnlineUsers] isOnline("${normalizedId}") → ${found} | Set:`, Array.from(onlineUserIdsRef.current));
      return found;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onlineUserIds], // intentional: re-create when the array reference changes
  );

  // ── Heartbeat ────────────────────────────────────────────────────────────────

  const sendHeartbeat = useCallback(async () => {
    try {
      await invokeHub("RefreshOnline");
    } catch {
      // Non-critical — swallow errors so heartbeat doesn't crash
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current != null) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // ── REST fetch ─────────────────────────────────────────────────────────────

  const fetchOnlineFriends = useCallback(async () => {
    setIsLoading(true);
    try {
      // GET /message/onlinetracking/online-friends
      const friends = await getOnlineFriends();
      rebuildSet(friends.filter((f) => f.isOnline).map((f) => f.userId));
    } catch (err) {
      console.warn("[useOnlineUsers] Failed to fetch online friends:", err);
    } finally {
      setIsLoading(false);
    }
  }, [rebuildSet]);

  const refresh = useCallback(async () => {
    await fetchOnlineFriends();
  }, [fetchOnlineFriends]);

  // ── Connect / Disconnect ─────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      console.warn("[useOnlineUsers] No access token — skipping SignalR connect");
      return;
    }

    await startConnection(token);

    // ── Register SignalR event listeners ──
    const conn = (await import("../services/signalrService")).getConnection();
    if (!conn) return;

    // FIX Issue 1: Normalize userId to string before storing
    conn.on("UserOnline", (userId: string | number) => {
      const id = toStringId(userId);
      console.log(`[useOnlineUsers] SignalR UserOnline → "${id}"`);
      setOnlineUserIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        onlineUserIdsRef.current = next;
        console.log("[useOnlineUsers] UserOnline → Set:", Array.from(next));
        return next;
      });
    });

    // FIX Issue 2: Functional update + type normalization already applied above
    conn.on("UserOffline", (userId: string | number) => {
      const id = toStringId(userId);
      console.log(`[useOnlineUsers] SignalR UserOffline → "${id}"`);
      setOnlineUserIds((prev) => {
        const next = prev.filter((existingId) => existingId !== id);
        onlineUserIdsRef.current = next;
        console.log("[useOnlineUsers] UserOffline → Set:", Array.from(next));
        return next;
      });
    });

    // Start heartbeat to keep Redis TTL alive on the server
    startHeartbeat();
  }, [startHeartbeat]);

  const disconnect = useCallback(async () => {
    stopHeartbeat();
    await stopConnection();
  }, [stopHeartbeat]);

  // ── Connection state listener ─────────────────────────────────────────────

  useEffect(() => {
    const removeListener = addConnectionStateListener(({ next }) => {
      setIsConnected(next === "Connected");
    });

    // Set initial state from service
    setIsConnected(getConnectionState() === "Connected");

    return () => {
      removeListener();
      stopHeartbeat();
      stopConnection().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-connect based on auth state ──────────────────────────────────────

  useEffect(() => {
    if (isAuthenticated) {
      fetchOnlineFriends();
      connect().catch((err) => {
        console.warn("[useOnlineUsers] Auto-connect failed:", err);
      });
      return;
    }

    disconnect().catch(() => {});
  }, [isAuthenticated, fetchOnlineFriends, connect, disconnect]);

  return {
    onlineUsers: new Set(onlineUserIds),
    isLoading,
    isConnected,
    onlineCount: onlineUserIds.length,
    isOnline,
    refresh,
    connect,
    disconnect,
  };
}

// ─── Batch lookup helper ───────────────────────────────────────────────────────

/**
 * Returns the subset of the provided userIds that are currently online.
 * Useful for checking multiple users at once (e.g. conversation members).
 */
export async function getOnlineStatusOfUsers(
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return [];
  try {
    return await getOnlineUsers(userIds);
  } catch {
    return [];
  }
}
