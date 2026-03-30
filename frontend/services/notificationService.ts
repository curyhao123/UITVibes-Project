import { Notification, mockNotifications } from "../data/mockData";
import { delay } from "./httpClient";
import { getCurrentAccount } from "./session";

export async function getNotifications(): Promise<Notification[]> {
  await delay(300);
  if (getCurrentAccount() === "newUser") return [];
  return [...mockNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await delay(100);
  const notif = mockNotifications.find((n) => n.id === notificationId);
  if (notif) notif.isRead = true;
}

export async function markAllNotificationsRead(): Promise<void> {
  await delay(200);
  mockNotifications.forEach((n) => {
    n.isRead = true;
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  await delay(100);
  return mockNotifications.filter((n) => !n.isRead).length;
}
