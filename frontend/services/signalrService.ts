/**
 * SignalR Service — manages the ChatHub connection lifecycle.
 *
 * Responsibilities:
 * - Create / start the WebSocket connection to /hubs/chat
 * - Forward access token via query param (as required by backend ChatHub)
 * - Register real-time event handlers (UserOnline, UserOffline, ReceiveMessage, etc.)
 * - Expose a simple "started" promise so callers can await connection before sending
 * - Expose a disconnect() function for cleanup
 *
 * Architecture notes:
 * - Singleton: we want ONE connection shared across the entire app.
 * - The connection is started once and stays open until explicitly disconnected
 *   (e.g. on logout). React Native / Expo handles WebSocket reconnection automatically.
 * - All event callbacks are plain functions; callers (hooks / context) are responsible
 *   for registering/unregistering their handlers in useEffect with proper cleanup.
 */

import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "./httpClient";

export const SIGNALR_HUB_URL = `${API_BASE_URL}/hubs/chat`;

// ─── Connection state helpers ──────────────────────────────────────────────────

export type ConnectionState =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Disconnecting"
  | "Error";

interface ConnectionStateChange {
  readonly prev: ConnectionState;
  readonly next: ConnectionState;
}

type ConnectionStateListener = (change: ConnectionStateChange) => void;

let _connection: signalR.HubConnection | null = null;
let _stateListeners: ConnectionStateListener[] = [];
let _currentState: ConnectionState = "Disconnected";

function setState(next: ConnectionState) {
  const prev = _currentState;
  if (prev === next) return;
  _currentState = next;
  _stateListeners.forEach((l) => l({ prev, next }));
}

export function addConnectionStateListener(listener: ConnectionStateListener): () => void {
  _stateListeners.push(listener);
  return () => {
    _stateListeners = _stateListeners.filter((l) => l !== listener);
  };
}

export function getConnectionState(): ConnectionState {
  return _currentState;
}

// ─── Build connection options ──────────────────────────────────────────────────

function buildOptions(accessToken: string): signalR.IHttpConnectionOptions {
  return {
    // Pass JWT so ChatHub can read userId from ?access_token= query param
    accessTokenFactory: () => accessToken,
    // Longer timeout for slower networks
    timeout: 30_000,
    // SkipNegotiate: false (default) lets SignalR negotiate transport on first request
  };
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

/**
 * Starts the SignalR connection to ChatHub.
 * Safe to call multiple times — returns existing promise if already connecting/connected.
 *
 * @param accessToken  JWT from storage / context
 * @returns Promise that resolves when the hub is fully connected
 */
export async function startConnection(accessToken: string): Promise<void> {
  if (_connection != null) {
    const state = _connection.state;
    if (state === signalR.HubConnectionState.Connected) {
      return;
    }
    if (state === signalR.HubConnectionState.Connecting) {
      // Wait for whatever the in-flight start to resolve
      await _connection.start().catch(() => {});
      return;
    }
    // State is Disconnected / Reconnecting — tear down and rebuild
    _connection.stop().catch(() => {});
    _connection = null;
  }

  setState("Connecting");

  _connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_HUB_URL, buildOptions(accessToken))
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: (retryContext) => {
        if (retryContext.previousRetryCount < 5) {
          // Exponential backoff: 0s → 2s → 4s → 8s → 16s
          return Math.pow(2, retryContext.previousRetryCount) * 1_000;
        }
        return 30_000; // cap at 30s
      },
    })
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  // ── State change handler ──
  _connection.onclose((error) => {
    if (error != null) {
      console.warn("[SignalR] Connection closed with error:", error.message);
      setState("Error");
    } else {
      console.log("[SignalR] Connection closed gracefully");
      setState("Disconnected");
    }
  });

  _connection.onreconnecting((error) => {
    console.warn("[SignalR] Reconnecting…", error?.message);
    setState("Connecting");
  });

  _connection.onreconnected((connectionId) => {
    console.log("[SignalR] Reconnected — connectionId:", connectionId);
    setState("Connected");
  });

  try {
    // start() resolves when the hub is ready; rejects on failure
    await _connection.start();
    setState("Connected");
    console.log("[SignalR] Connected — connectionId:", _connection.connectionId);
  } catch (err) {
    console.error("[SignalR] Failed to connect:", err);
    setState("Error");
    throw err;
  }
}

/**
 * Stops the SignalR connection. Call this on logout or when the feature is disabled.
 * Safe to call when already disconnected.
 */
export async function stopConnection(): Promise<void> {
  if (_connection == null) return;
  setState("Disconnecting");
  try {
    await _connection.stop();
    console.log("[SignalR] Disconnected");
  } catch (err) {
    console.warn("[SignalR] Error during disconnect:", err);
  } finally {
    _connection = null;
    setState("Disconnected");
  }
}

// ─── Expose raw connection for advanced usage ─────────────────────────────────

/**
 * Returns the current HubConnection (or null if never started).
 * Use this only when you need to call hub methods directly.
 */
export function getConnection(): signalR.HubConnection | null {
  return _connection;
}

/**
 * Invokes a hub method if the connection is active.
 * Silently no-ops when disconnected.
 */
export async function invokeHub<T = unknown>(
  methodName: string,
  ...args: unknown[]
): Promise<T | null> {
  if (_connection?.state !== signalR.HubConnectionState.Connected) {
    console.warn(`[SignalR] Cannot invoke "${methodName}" — not connected`);
    return null;
  }
  try {
    return await _connection.invoke<T>(methodName, ...args);
  } catch (err) {
    console.error(`[SignalR] invoke("${methodName}") failed:`, err);
    throw err;
  }
}
