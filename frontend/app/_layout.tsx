import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider } from '@/context/AppContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="story/[id]" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
        <StatusBar style="auto" />
      </AppProvider>
    </ThemeProvider>
  );
}
