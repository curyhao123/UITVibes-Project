/**
 * AdminNavigator — wrapping component that enforces admin-only access.
 *
 * Usage in app/_layout.tsx or any screen:
 *   <AdminNavigator>
 *     <AdminStack />
 *   </AdminNavigator>
 *
 * Non-Admin users are redirected to /(tabs)/home automatically.
 */
import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "@/context/AppContext";
import { type ThemeColors } from "@/constants/theme";
import { useTheme } from '../../../context/ThemeContext';
import { useThemedStyles } from '../../../hooks/useThemedStyles';

interface AdminNavigatorProps {
  children: React.ReactNode;
}

export function AdminNavigator({ children }: AdminNavigatorProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { currentUser, isLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && currentUser) {
      if (currentUser.role !== "Admin") {
        router.replace("/(tabs)/home");
      }
    }
  }, [isLoading, currentUser]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!currentUser || currentUser.role !== "Admin") {
    return null; // redirect will happen in useEffect
  }

  return <>{children}</>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
});
