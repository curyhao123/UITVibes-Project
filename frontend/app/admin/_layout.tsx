/**
 * app/admin/_layout.tsx
 *
 * Admin Stack Navigator — wraps all admin routes with AdminNavigator guard.
 * Non-Admin users are redirected to /(tabs)/home automatically.
 */
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { type ThemeColors } from "../../constants/theme";
import { useApp } from "../../context/AppContext";
import { AdminNavigator } from "../../src/admin/navigation/AdminNavigator";
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

function AdminLogoutButton() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { logout } = useApp();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Feather name="log-out" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function AdminLayout() {
  const { colors } = useTheme();
  return (
    <AdminNavigator>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Admin",
            headerShown: true,
            headerTitle: "Admin Panel",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerRight: () => <AdminLogoutButton />,
          }}
        />
        <Stack.Screen
          name="dashboard"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="users"
          options={{
            title: "Users",
            headerShown: true,
            headerTitle: "User Management",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerRight: () => <AdminLogoutButton />,
          }}
        />
        <Stack.Screen
          name="reports"
          options={{
            title: "Reports",
            headerShown: true,
            headerTitle: "Reports",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerRight: () => <AdminLogoutButton />,
          }}
        />
          <Stack.Screen
          name="moderation"
          options={{
            headerShown: true,
            title: "AI Moderation",
            headerTitle: "AI Moderation",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerRight: () => <AdminLogoutButton />,
          }}
        />
        <Stack.Screen
          name="strikes"
          options={{
            headerShown: true,
            title: "Strikes",
            headerTitle: "Strike Manager",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerRight: () => <AdminLogoutButton />,
          }}
        />
      </Stack>
    </AdminNavigator>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${colors.primary}10`,
  },
});
