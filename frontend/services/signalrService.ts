/**
 * SignalR Service — manages multiple Hub connections.
 *
 * Each hub has its own HubConnection (because SignalR doesn't support
 * multiplexing on the same connection). Examples:
 *   - ChatHub       → /hubs/chat
 *   - NotificationHub → /hubs/notification
 *
 * Architecture notes:
 * - Hub connections are kept in a Map keyed by hub URL.
 * - startHub(url) is idempotent — returns the same promise if already starting.
 * - Each hub tracks its own connection state independently.
 * - React Native / Expo handles WebSocket reconnection via withAutomaticReconnect.
 * - All event callbacks are plain functions; callers are responsible for
 *   registering/unregistering handlers in useEffect with proper cleanup.
 */

import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "./httpClient";
import { createLogger } from "../utils/logger";

const log = createLogger("SignalR");

// ─── Hub registry ──────────────────────────────────────────────────────────────

interface HubEntry {
  connection: signalR.HubConnection;
  state: ConnectionState;
  startPromise: Promise<void> | null;
}

const _hubs = new Map<string, HubEntry>();

export const CHAT_HUB_URL = `${API_BASE_URL}/hubs/chat`;
export const NOTIFICATION_HUB_URL = `${API_BASE_URL}/hubs/notification`;

// ─── Connection state helpers ──────────────────────────────────────────────────

export type ConnectionState =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Disconnecting"
  | "Error";

interface ConnectionStateChange {
  readonly hubUrl: string;
  readonly prev: ConnectionState;
  readonly next: ConnectionState;
}

type ConnectionStateListener = (change: ConnectionStateChange) => void;

let _stateListeners: ConnectionStateListener[] = [];

function setState(hubUrl: string, next: ConnectionState) {
  const entry = _hubs.get(hubUrl);
  if (!entry) return;
  const prev = entry.state;
  if (prev === next) return;
  entry.state = next;
  _stateListeners.forEach((l) => l({ hubUrl, prev, next }));
}

export function addConnectionStateListener(listener: ConnectionStateListener): () => void {
  _stateListeners.push(listener);
  return () => {
    _stateListeners = _stateListeners.filter((l) => l !== listener);
  };
}

export function getConnectionState(hubUrl: string = CHAT_HUB_URL): ConnectionState {
  return _hubs.get(hubUrl)?.state ?? "Disconnected";
}

// ─── Build connection options ──────────────────────────────────────────────────

function buildOptions(accessToken: string): signalR.IHttpConnectionOptions {
  return {
    accessTokenFactory: () => accessToken,
    timeout: 30_000,
  };
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

/**
 * Starts a SignalR connection to the given hub URL.
 * Idempotent — returns the same promise if already starting/connected.
 *
 * @param hubUrl       Full URL to the hub endpoint (e.g. CHAT_HUB_URL)
 * @param accessToken  JWT from storage / context
 */
export async function startHub(hubUrl: string, accessToken: string): Promise<void> {
  const existing = _hubs.get(hubUrl);
  if (existing) {
    if (existing.connection.state === signalR.HubConnectionState.Connected) return;
    if (existing.startPromise) {
      await existing.startPromise.catch(() => {});
      return;
    }
    // Disconnected/Reconnecting — tear down and rebuild
    existing.connection.stop().catch(() => {});
    _hubs.delete(hubUrl);
  }

  setState(hubUrl, "Connecting");

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, buildOptions(accessToken))
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        if (retryContext.previousRetryCount < 5) {
          return Math.pow(2, retryContext.previousRetryCount) * 1_000;
        }
        return 30_000;
      },
    })
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  const entry: HubEntry = { connection, state: "Connecting", startPromise: null };
  _hubs.set(hubUrl, entry);

  connection.onclose((error) => {
    if (error != null) {
      log.warn(`[${hubUrl}] closed with error:`, error.message);
      setState(hubUrl, "Error");
    } else {
      setState(hubUrl, "Disconnected");
    }
  });

  connection.onreconnecting((error) => {
    log.warn(`[${hubUrl}] reconnecting:`, error?.message);
    setState(hubUrl, "Connecting");
  });

  connection.onreconnected((connectionId) => {
    log.info(`[${hubUrl}] reconnected:`, connectionId);
    setState(hubUrl, "Connected");
  });

  const startPromise = (async () => {
    try {
      await connection.start();
      setState(hubUrl, "Connected");
      log.info(`[${hubUrl}] connected:`, connection.connectionId);
    } catch (err) {
      log.error(`[${hubUrl}] connect failed:`, err);
      setState(hubUrl, "Error");
      _hubs.delete(hubUrl);
      throw err;
    } finally {
      entry.startPromise = null;
    }
  })();

  entry.startPromise = startPromise;
  await startPromise;
}

/**
 * Stops a specific hub connection. No-op if never started.
 */
export async function stopHub(hubUrl: string): Promise<void> {
  const entry = _hubs.get(hubUrl);
  if (!entry) return;
  setState(hubUrl, "Disconnecting");
  try {
    await entry.connection.stop();
  } catch (err) {
    log.warn(`[${hubUrl}] disconnect error:`, err);
  } finally {
    _hubs.delete(hubUrl);
    setState(hubUrl, "Disconnected");
  }
}

// ─── Backward-compat aliases (for ChatHub callers) ────────────────────────────

const CHAT_HUB_LEGACY = CHAT_HUB_URL;

/** @deprecated Use startHub(CHAT_HUB_URL, token) instead. */
export async function startConnection(accessToken: string): Promise<void> {
  return startHub(CHAT_HUB_LEGACY, accessToken);
}

/** @deprecated Use stopHub(CHAT_HUB_URL) instead. */
export async function stopConnection(): Promise<void> {
  return stopHub(CHAT_HUB_LEGACY);
}

/** @deprecated Use getConnection(CHAT_HUB_URL) instead. */
export function getConnection(): signalR.HubConnection | null {
  return _hubs.get(CHAT_HUB_LEGACY)?.connection ?? null;
}

/** @deprecated Kept for chat callers. */
export const SIGNALR_HUB_URL = CHAT_HUB_URL;

/** @deprecated Use invokeHubMethod(CHAT_HUB_URL, ...) instead. */
export async function invokeHub<T = unknown>(
  methodName: string,
  ...args: unknown[]
): Promise<T | null> {
  return invokeHubMethod<T>(CHAT_HUB_LEGACY, methodName, ...args);
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Returns the connection for a specific hub URL (or null if never started).
 */
export function getHubConnection(hubUrl: string): signalR.HubConnection | null {
  return _hubs.get(hubUrl)?.connection ?? null;
}

/**
 * Invokes a hub method on the given hub connection.
 * Silently no-ops when disconnected.
 */
export async function invokeHubMethod<T = unknown>(
  hubUrl: string,
  methodName: string,
  ...args: unknown[]
): Promise<T | null> {
  const entry = _hubs.get(hubUrl);
  if (entry?.connection.state !== signalR.HubConnectionState.Connected) {
    log.warn(`[${hubUrl}] cannot invoke "${methodName}" — not connected`);
    return null;
  }
  try {
    return await entry.connection.invoke<T>(methodName, ...args);
  } catch (err) {
    log.error(`[${hubUrl}] invoke("${methodName}") failed:`, err);
    throw err;
  }
}
