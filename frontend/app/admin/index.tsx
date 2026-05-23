/**
 * app/admin/index.tsx
 *
 * Admin home — redirects to dashboard.
 * This is the entry point for the /admin route.
 */
import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useApp } from "../../context/AppContext";

export default function AdminIndex() {
  const { currentUser } = useApp();

  // If user is Admin, show dashboard; otherwise let AdminNavigator handle redirect
  if (currentUser?.role === "Admin") {
    // Use replace to avoid back-stack pollution
    return <Redirect href="/admin/dashboard" />;
  }

  return null; // AdminNavigator will redirect non-admins
}
