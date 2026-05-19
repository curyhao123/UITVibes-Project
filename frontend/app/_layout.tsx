import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Platform } from 'react-native';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useApp } from '@/context/AppContext';
import { AppColors } from '@/constants/theme';
import messaging from '@react-native-firebase/messaging';
import { handleNotificationTap } from '@/utils/notificationRouter';

// MUST be outside component — called when app is in background/killed
if (Platform.OS !== 'web') {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM Background] Message:', remoteMessage.data);
  });
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  // Notification tap: app was in background, user tapped notification
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationTap(remoteMessage.data, router);
    });
    return unsubscribe;
  }, [router]);

  // Notification tap: app was killed, user tapped notification to open it
  useEffect(() => {
    if (Platform.OS === 'web') return;
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        handleNotificationTap(remoteMessage.data, router);
      }
    });
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated but trying to access an authenticated screen.
      // Redirect to login.
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but trying to access an auth screen.
      // Redirect to home.
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: AppColors.background },
          animation: 'fade',
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="message" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="story/create" options={{ headerShown: false }} />
        <Stack.Screen name="story/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="change-password/verify" options={{ headerShown: false }} />
        <Stack.Screen name="blocked-accounts" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="followers/[userId]" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/email-verification" options={{ headerShown: false }} />
        <Stack.Screen name="auth/onboarding-fullname" options={{ headerShown: false }} />
        <Stack.Screen name="auth/onboarding-username" options={{ headerShown: false }} />
        <Stack.Screen name="auth/onboarding-avatar-bio" options={{ headerShown: false }} />
        <Stack.Screen name="auth/onboarding-find-friends" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootLayoutNav />
      </AppProvider>
    </GestureHandlerRootView>
  );
}
