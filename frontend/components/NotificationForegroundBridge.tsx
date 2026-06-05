import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppColors } from "../constants/theme";
import { useApp } from "../context/AppContext";
import {
  getInitialPushNotification,
  subscribeToNotificationOpened,
  subscribeToForegroundNotifications,
  type BackendNotificationType,
  type PushRemoteMessage,
} from "../services/notificationService";
import { getNotificationRoute } from "../utils/notificationRouting";

type ForegroundNotification = {
  title: string;
  body: string;
  type: BackendNotificationType;
  entityId: string;
  notificationId: string;
};

function getStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseForegroundNotification(
  message: PushRemoteMessage,
): ForegroundNotification | null {
  const data = message.data ?? {};
  const type = getStringValue(data.type);
  const entityId = getStringValue(data.entityId);
  const notificationId = getStringValue(data.notificationId);
  const title =
    message.notification?.title ||
    getStringValue(data.title) ||
    "Notification";
  const body =
    message.notification?.body ||
    getStringValue(data.body) ||
    getStringValue(data.content) ||
    title;

  if (!type && !entityId && !notificationId && !body) return null;

  return {
    title,
    body,
    type,
    entityId,
    notificationId,
  };
}

function getPushMessageKey(notification: ForegroundNotification): string {
  return notification.notificationId || `${notification.type}:${notification.entityId}`;
}

export function NotificationForegroundBridge() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isAuthenticated,
    refreshNotifications,
    handleForegroundNotificationReceived,
    markNotificationRead,
  } = useApp();
  const [banner, setBanner] = useState<ForegroundNotification | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledOpenKeysRef = useRef<Set<string>>(new Set());

  const openNotification = useCallback(
    (notification: ForegroundNotification) => {
      const key = getPushMessageKey(notification);
      if (handledOpenKeysRef.current.has(key)) return;
      handledOpenKeysRef.current.add(key);

      const route = getNotificationRoute({
        type: notification.type,
        entityId: notification.entityId,
      });

      if (notification.notificationId) {
        void markNotificationRead(notification.notificationId);
        void refreshNotifications();
      }

      if (route) {
        router.push(route as any);
      }
    },
    [markNotificationRead, refreshNotifications, router],
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToForegroundNotifications((message) => {
      handleForegroundNotificationReceived();
      void refreshNotifications();

      const nextBanner = parseForegroundNotification(message);
      if (!nextBanner) return;

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      setBanner(nextBanner);
      dismissTimerRef.current = setTimeout(() => {
        setBanner(null);
        dismissTimerRef.current = null;
      }, 4500);
    });

    return () => {
      unsubscribe();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [handleForegroundNotificationReceived, isAuthenticated, refreshNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleOpenedMessage = (message: PushRemoteMessage) => {
      const notification = parseForegroundNotification(message);
      if (!notification) return;

      setBanner(null);
      openNotification(notification);
    };

    const unsubscribe = subscribeToNotificationOpened(handleOpenedMessage);

    void getInitialPushNotification()
      .then((message) => {
        if (message) {
          handleOpenedMessage(message);
        }
      })
      .catch((error) => {
        console.warn("[Notifications] Failed to handle initial notification", error);
      });

    return unsubscribe;
  }, [isAuthenticated, openNotification]);

  if (!banner) return null;

  const openBannerNotification = () => {
    setBanner(null);
    openNotification(banner);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.banner}
        onPress={openBannerNotification}
      >
        <View style={styles.iconWrap}>
          <Feather name="bell" size={18} color={AppColors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          activeOpacity={0.75}
          onPress={() => setBanner(null)}
        >
          <Feather name="x" size={16} color={AppColors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${AppColors.primary}18`,
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: AppColors.text,
  },
  body: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: AppColors.textSecondary,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});
