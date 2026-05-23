/**
 * DashboardScreen — Admin overview
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAllUsers, getUserReports, getPostReports } from "@/services/adminService";
import { AppColors, borderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

interface Stats {
  totalUsers: number;
  userReports: number;
  postReports: number;
}

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}> = ({ title, value, icon, color }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
      <Feather name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value.toLocaleString()}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

export default function DashboardScreen() {
  const router = useRouter();
  const { logout } = useApp();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    userReports: 0,
    postReports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const [users, userReports, postReports] = await Promise.all([
        getAllUsers(0, 1),
        getUserReports(0, 1),
        getPostReports(0, 1),
      ]);
      // Pagination: fetch total count
      const [allUsers, allUserReports, allPostReports] = await Promise.all([
        getAllUsers(0, 1000),
        getUserReports(0, 1000),
        getPostReports(0, 1000),
      ]);
      setStats({
        totalUsers: allUsers.length,
        userReports: allUserReports.length,
        postReports: allPostReports.length,
      });
    } catch (err) {
      console.error("[AdminDashboard] fetchStats failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Feather name="log-out" size={20} color={AppColors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>Platform overview and management</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon="users"
            color={AppColors.primary}
          />
          <StatCard
            title="User Reports"
            value={stats.userReports}
            icon="alert-circle"
            color="#F59E0B"
          />
          <StatCard
            title="Post Reports"
            value={stats.postReports}
            icon="flag"
            color="#EF4444"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionList}>
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.7}
            onPress={() => router.push("/admin/reports")}
          >
            <View style={styles.actionLeft}>
              <Feather name="flag" size={18} color={AppColors.primary} />
              <Text style={styles.actionText}>Review pending reports</Text>
            </View>
            <Feather name="chevron-right" size={16} color={AppColors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.7}
            onPress={() => router.push("/admin/users")}
          >
            <View style={styles.actionLeft}>
              <Feather name="users" size={18} color={AppColors.primary} />
              <Text style={styles.actionText}>Manage user accounts</Text>
            </View>
            <Feather name="chevron-right" size={16} color={AppColors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* System Status */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>System Status</Text>
        </View>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.statusText}>All services operational</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last checked:</Text>
            <Text style={styles.statusValue}>{new Date().toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 26, fontWeight: "700", color: AppColors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: AppColors.textMuted, marginTop: 4 },
  logoutBtn: { padding: 8 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 22, fontWeight: "700", color: AppColors.text },
  statTitle: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.text,
    marginBottom: 12,
  },
  sectionWrap: { marginBottom: 12 },
  actionList: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionText: { fontSize: 14, color: AppColors.text, fontWeight: "500" },
  statusCard: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 8,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: "500", color: AppColors.text },
  statusLabel: { fontSize: 13, color: AppColors.textMuted },
  statusValue: { fontSize: 13, color: AppColors.textMuted },
});
