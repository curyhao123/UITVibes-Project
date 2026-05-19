/**
 * useDeviceToken Hook
 *
 * Manages device token lifecycle:
 * 1. Requests push notification permission from OS
 * 2. Obtains device token (FCM/Expo token)
 * 3. Registers token with backend on app startup and token refresh
 * 4. Handles token refresh events
 * 5. Cleans up on logout
 */

import { useEffect, useRef, useState } from "react";
import { Platform, Alert } from "react-native";
import messaging from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerDeviceToken,
  revokeDeviceToken,
} from "../services/deviceTokenService";

const DEVICE_TOKEN_STORAGE_KEY = "@uitvibes_device_token";
const DEVICE_PLATFORM = Platform.OS === "ios" ? "iOS" : "Android";

interface UseDeviceTokenOptions {
  /** Whether to auto-register token on mount (default: true) */
  autoRegister?: boolean;
  /** Whether to request permission on mount (default: true) */
  autoRequestPermission?: boolean;
  /** Called when token is successfully registered */
  onTokenRegistered?: (token: string) => void;
  /** Called when permission is granted */
  onPermissionGranted?: () => void;
  /** Called when permission is denied */
  onPermissionDenied?: () => void;
  /** Called on token registration error */
  onError?: (error: Error) => void;
}

export function useDeviceToken(options: UseDeviceTokenOptions = {}) {
  const {
    autoRegister = true,
    autoRequestPermission = true,
    onTokenRegistered,
    onPermissionGranted,
    onPermissionDenied,
    onError,
  } = options;

  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const unsubscribeTokenRefreshRef = useRef<(() => void) | null>(null);

  /**
   * Request notification permission from OS
   */
  const requestPermission = async () => {
    try {
      if (Platform.OS === 'web') return false;
      setIsLoading(true);
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        setPermissionStatus("granted");
        onPermissionGranted?.();
        if (__DEV__) {
          console.log("[Device Token] Permission granted");
        }
        return true;
      } else {
        setPermissionStatus("denied");
        onPermissionDenied?.();
        if (__DEV__) {
          console.log("[Device Token] Permission denied");
        }
        return false;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      console.error("[Device Token] Permission request failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get device token from Expo
   * For FCM/APNs compatibility
   */
  const getToken = async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return null;
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error("[Device Token] Failed to get token:", error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  };

  /**
   * Register token with backend
   */
  const registerToken = async (token: string) => {
    if (!token) return;

    try {
      setIsLoading(true);
      await registerDeviceToken(token, DEVICE_PLATFORM);
      setIsRegistered(true);
      setDeviceToken(token);

      // Store token locally for reference
      await AsyncStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);

      onTokenRegistered?.(token);
      if (__DEV__) {
        console.log(
          `[Device Token] Registered with backend: ${DEVICE_PLATFORM}`,
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      console.error("[Device Token] Backend registration failed:", error);
      setIsRegistered(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Main initialization: request permission → get token → register
   */
  const initializeDeviceToken = async () => {
    if (autoRequestPermission) {
      const permissionGranted = await requestPermission();
      if (!permissionGranted) {
        if (__DEV__) {
          console.log(
            "[Device Token] Skipping token registration due to denied permission",
          );
        }
        return;
      }
    }

    const token = await getToken();
    if (token && autoRegister) {
      await registerToken(token);
    } else if (token) {
      setDeviceToken(token);
    }
  };

  /**
   * Listen for token refresh events
   */
  const setupTokenRefreshListener = () => {
    if (Platform.OS === 'web') return;
    
    if (unsubscribeTokenRefreshRef.current) {
      unsubscribeTokenRefreshRef.current();
    }

    // FCM Token refresh listener
    unsubscribeTokenRefreshRef.current = messaging().onTokenRefresh(async (newToken) => {
      if (__DEV__) {
        console.log("[Device Token] Token refreshed:", newToken.substring(0, 20) + "...");
      }
      setDeviceToken(newToken);
      await AsyncStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, newToken);
      await registerDeviceToken(newToken, DEVICE_PLATFORM);
    });
  };

  /**
   * Clean up: revoke token on logout
   */
  const cleanup = async () => {
    try {
      if (deviceToken) {
        await revokeDeviceToken(deviceToken);
      }
      setDeviceToken(null);
      setIsRegistered(false);
      await AsyncStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);

      if (unsubscribeTokenRefreshRef.current) {
        unsubscribeTokenRefreshRef.current();
        unsubscribeTokenRefreshRef.current = null;
      }

      if (__DEV__) {
        console.log("[Device Token] Cleaned up");
      }
    } catch (error) {
      console.error("[Device Token] Cleanup failed:", error);
    }
  };

  /**
   * Restore token from storage on app start
   */
  const restoreToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(DEVICE_TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error("[Device Token] Failed to restore token:", error);
      return null;
    }
  };

  /**
   * Main effect: initialize on mount
   */
  useEffect(() => {
    const initialize = async () => {
      // Try to restore previous token
      const restoredToken = await restoreToken();
      if (restoredToken) {
        setDeviceToken(restoredToken);
        setIsRegistered(true);
      }

      // Initialize fresh if needed
      if (autoRegister && !restoredToken) {
        await initializeDeviceToken();
      }

      setupTokenRefreshListener();
    };

    initialize();

    return () => {
      if (unsubscribeTokenRefreshRef.current) {
        unsubscribeTokenRefreshRef.current();
      }
    };
  }, [autoRegister, autoRequestPermission]);

  return {
    /** Current device token */
    deviceToken,
    /** Whether token is registered with backend */
    isRegistered,
    /** Permission status */
    permissionStatus,
    /** Whether a request is in progress */
    isLoading,
    /** Request permission manually */
    requestPermission,
    /** Get token manually */
    getToken,
    /** Register token manually */
    registerToken,
    /** Full initialization */
    initializeDeviceToken,
    /** Cleanup (call on logout) */
    cleanup,
  };
}
