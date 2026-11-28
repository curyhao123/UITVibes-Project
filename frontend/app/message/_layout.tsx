/**
 * message/_layout.tsx — Nested Stack for the Messages tab.
 *
 * Wrapping a Stack inside the Tabs navigator means:
 * - Pushing a screen onto this Stack automatically hides the parent tab bar
 * - Popping back shows the tab bar again
 *
 * This gives us Instagram/Messenger behavior:
 *   Tab bar visible on inbox (index) → hidden when viewing a conversation (chat/[id])
 */
import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function MessageLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="chat/[id]"
        options={{
          animation: 'slide_from_right',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
