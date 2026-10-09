/**
 * notificationHubService — wrapper for NotificationHub SignalR connection.
 *
 * Pattern: each hub has its own connection, managed by signalrService.
 * Lifecycle: start on login, stop on logout.
 *
 * Events emitted by the server:
 *   - NewNotification(notification: Notification)
 *   - UnreadCountChanged(count: number)
 *   - AllNotificationsRead()
 */

import type { Notification } from "./notificationService";
import {
  NOTIFICATION_HUB_URL,
  startHub,
  stopHub,
  getHubConnection,
  addConnectionStateListener,
  getConnectionState,
  type ConnectionState,
} from "./signalrService";
import { getAccessToken } from "./httpClient";
import { createLogger } from "../utils/logger";

const log = createLogger("NotificationHub");

// ─── Event handler types ──────────────────────────────────────────────────────

export type NewNotificationHandler = (notification: Notification) => void;
export type UnreadCountHandler = (count: number) => void;
export type AllReadHandler = () => void;
export type StateChangeHandler = (state: ConnectionState) => void;

const newNotifHandlers = new Set<NewNotificationHandler>();
const unreadCountHandlers = new Set<UnreadCountHandler>();
const allReadHandlers = new Set<AllReadHandler>();
const stateHandlers = new Set<StateChangeHandler>();

let _isStarted = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start NotificationHub connection. Safe to call multiple times.
 * Registers global event listeners that fan-out to all registered handlers.
 */
export async function startNotificationHub(): Promise<void> {
  if (_isStarted) return;
  const token = await getAccessToken();
  if (!token) {
    log.warn("No access token — skipping NotificationHub connect");
    return;
  }

  // Register listeners BEFORE start so we don't miss the first event
  attachEventListeners();

  try {
    await startHub(NOTIFICATION_HUB_URL, token);
    _isStarted = true;
  } catch (err) {
    log.error("Failed to start NotificationHub", err);
    // Don't set _isStarted — caller may retry
  }
}

/**
 * Stop NotificationHub connection. Call on logout.
 */
export async function stopNotificationHub(): Promise<void> {
  detachEventListeners();
  newNotifHandlers.clear();
  unreadCountHandlers.clear();
  allReadHandlers.clear();
  stateHandlers.clear();
  await stopHub(NOTIFICATION_HUB_URL);
  _isStarted = false;
}

export function isNotificationHubConnected(): boolean {
  return getConnectionState(NOTIFICATION_HUB_URL) === "Connected";
}

// ─── Handler registration ─────────────────────────────────────────────────────

export function onNewNotification(handler: NewNotificationHandler): () => void {
  newNotifHandlers.add(handler);
  return () => newNotifHandlers.delete(handler);
}

export function onUnreadCountChanged(handler: UnreadCountHandler): () => void {
  unreadCountHandlers.add(handler);
  return () => unreadCountHandlers.delete(handler);
}

export function onAllRead(handler: AllReadHandler): () => void {
  allReadHandlers.add(handler);
  return () => allReadHandlers.delete(handler);
}

export function onNotificationHubStateChange(handler: StateChangeHandler): () => void {
  stateHandlers.add(handler);
  // Push current state immediately
  handler(getConnectionState(NOTIFICATION_HUB_URL));
  return () => stateHandlers.delete(handler);
}

// ─── Internal: wire up event listeners on the underlying connection ───────────

function attachEventListeners() {
  // Listen to global state changes for this hub
  const removeStateListener = addConnectionStateListener((change) => {
    if (change.hubUrl !== NOTIFICATION_HUB_URL) return;
    stateHandlers.forEach((h) => h(change.next));
  });

  // We register handlers each time. The underlying connection is replaced
  // on reconnect, so we need to re-attach on reconnected events too.
  const conn = getHubConnection(NOTIFICATION_HUB_URL);
  if (conn) {
    wireServerMethods(conn);
  }

  // After start, getHubConnection will return the new connection —
  // we re-attach on every "Connected" state change.
  const reconnectHandler = stateHandlers; // placeholder; we'll add to a set below

  // Listen for next reconnection
  const removeReconnectHandler = addConnectionStateListener((change) => {
    if (change.hubUrl !== NOTIFICATION_HUB_URL) return;
    if (change.next === "Connected") {
      const newConn = getHubConnection(NOTIFICATION_HUB_URL);
      if (newConn) wireServerMethods(newConn);
    }
  });

  // Save for cleanup
  _cleanupFns.push(removeStateListener, removeReconnectHandler);
}

function detachEventListeners() {
  _cleanupFns.forEach((fn) => {
    try { fn(); } catch { /* ignore */ }
  });
  _cleanupFns.length = 0;

  const conn = getHubConnection(NOTIFICATION_HUB_URL);
  if (conn) {
    conn.off("NewNotification");
    conn.off("UnreadCountChanged");
    conn.off("AllNotificationsRead");
  }
}

const _cleanupFns: Array<() => void> = [];

function wireServerMethods(conn: any) {
  // Re-attach handlers — SignalR replaces handlers on reconnect automatically
  // when using the same connection, but if connection is rebuilt we re-bind.
  conn.off("NewNotification");
  conn.off("UnreadCountChanged");
  conn.off("AllNotificationsRead");

  conn.on("NewNotification", (notification: Notification) => {
    log.debug("NewNotification:", notification?.id);
    newNotifHandlers.forEach((h) => {
      try { h(notification); } catch (e) { log.warn("handler err:", e); }
    });
  });

  conn.on("UnreadCountChanged", (count: number) => {
    log.debug("UnreadCountChanged:", count);
    unreadCountHandlers.forEach((h) => {
      try { h(count); } catch (e) { log.warn("handler err:", e); }
    });
  });

  conn.on("AllNotificationsRead", () => {
    log.debug("AllNotificationsRead");
    allReadHandlers.forEach((h) => {
      try { h(); } catch (e) { log.warn("handler err:", e); }
    });
  });
}
