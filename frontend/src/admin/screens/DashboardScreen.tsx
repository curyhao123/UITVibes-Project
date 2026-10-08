import { borderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getAllUsers,
  getPostReports,
  getUserReports,
} from "@/services/adminService";
import type { BE_PostReport, BE_UserReport } from "@/services/backendTypes";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";

interface StatusBreakdown {
  pending: number;
  resolved: number;
  dismissed: number;
}

interface Stats {
  totalUsers: number;
  userReports: number;
  postReports: number;
  userReportsByStatus: StatusBreakdown;
  postReportsByStatus: StatusBreakdown;
}

const STATUS_COLORS = {
  pending: "#F59E0B",
  resolved: "#22C55E",
  dismissed: "#9CA3AF",
};

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress: () => void;
}> = ({ title, value, icon, color, onPress }) => {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: isDark ? 1 : 1,
        },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.statIconWrap,
          { backgroundColor: `${color}18` },
        ]}
      >
        <Feather name={icon} size={22} color={color} />
      </View>

      <Text style={[styles.statValue, { color: colors.text }]}>
        {value.toLocaleString()}
      </Text>

      <Text style={[styles.statTitle, { color: colors.textMuted }]}>{title}</Text>

      <Feather
        name="chevron-right"
        size={16}
        color={colors.iconMuted}
        style={styles.statArrow}
      />
    </TouchableOpacity>
  );
};

interface ReportPieChartCardProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  breakdown: StatusBreakdown;
  chartWidth: number;
  onPress: () => void;
}

const ReportPieChartCard: React.FC<ReportPieChartCardProps> = ({
  title,
  icon,
  iconColor,
  breakdown,
  chartWidth,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const total = breakdown.pending + breakdown.resolved + breakdown.dismissed;

  const chartData = [
    {
      name: "Pending",
      count: breakdown.pending,
      color: STATUS_COLORS.pending,
      legendFontColor: colors.textSecondary,
      legendFontSize: 11,
    },
    {
      name: "Resolved",
      count: breakdown.resolved,
      color: STATUS_COLORS.resolved,
      legendFontColor: colors.textSecondary,
      legendFontSize: 11,
    },
    {
      name: "Dismissed",
      count: breakdown.dismissed,
      color: STATUS_COLORS.dismissed,
      legendFontColor: colors.textSecondary,
      legendFontSize: 11,
    },
  ];

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => isDark ? `rgba(243, 244, 246, ${opacity})` : `rgba(45, 55, 72, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
  };

  return (
    <TouchableOpacity
      style={[
        styles.chartCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.chartCardHeader}>
        <View
          style={[
            styles.chartIconBadge,
            { backgroundColor: `${iconColor}18` },
          ]}
        >
          <Feather name={icon} size={15} color={iconColor} />
        </View>
        <Text style={[styles.chartTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Feather
          name="chevron-right"
          size={14}
          color={colors.textMuted}
        />
      </View>

      {total > 0 ? (
        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            width={chartWidth}
            height={120}
            chartConfig={chartConfig}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="0"
            center={[chartWidth / 4, 0]}
            hasLegend={false}
            absolute
          />
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Feather name="check-circle" size={28} color="#22C55E" />
          <Text style={[styles.emptyChartTitle, { color: colors.textMuted }]}>No Reports</Text>
        </View>
      )}

      {/* Legend / Breakdown Rows */}
      <View style={[styles.breakdownList, { borderTopColor: colors.borderLight }]}>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS.pending },
              ]}
            />
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Pending</Text>
          </View>
          <Text
            style={[
              styles.breakdownValue,
              { color: STATUS_COLORS.pending },
            ]}
          >
            {breakdown.pending}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS.resolved },
              ]}
            />
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Resolved</Text>
          </View>
          <Text
            style={[
              styles.breakdownValue,
              { color: STATUS_COLORS.resolved },
            ]}
          >
            {breakdown.resolved}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS.dismissed },
              ]}
            />
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Dismissed</Text>
          </View>
          <Text
            style={[
              styles.breakdownValue,
              { color: STATUS_COLORS.dismissed },
            ]}
          >
            {breakdown.dismissed}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const { logout } = useApp();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  // Card width calculation: screenWidth - screen padding (20 * 2) - grid gap (12) - card inner padding (12 * 2)
  const chartWidth = Math.max(Math.floor((screenWidth - 40 - 12 - 24) / 2), 120);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    userReports: 0,
    postReports: 0,
    userReportsByStatus: { pending: 0, resolved: 0, dismissed: 0 },
    postReportsByStatus: { pending: 0, resolved: 0, dismissed: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const countStatus = (
    reports: { status?: string | number }[]
  ): StatusBreakdown => {
    const counts: StatusBreakdown = {
      pending: 0,
      resolved: 0,
      dismissed: 0,
    };
    reports.forEach((r) => {
      const s = r?.status;
      if (s === 0 || s === "0" || String(s).toLowerCase() === "pending") {
        counts.pending += 1;
      } else if (
        s === 1 ||
        s === "1" ||
        String(s).toLowerCase() === "resolved"
      ) {
        counts.resolved += 1;
      } else if (
        s === 2 ||
        s === "2" ||
        String(s).toLowerCase() === "dismissed"
      ) {
        counts.dismissed += 1;
      } else {
        counts.pending += 1;
      }
    });
    return counts;
  };

  const fetchStats = async () => {
    try {
      // Fetch all data once
      const [allUsers, allUserReports, allPostReports] =
        await Promise.all([
          getAllUsers(0, 1000),
          getUserReports(0, 1000),
          getPostReports(0, 1000),
        ]);

      setStats({
        totalUsers: allUsers.length,
        userReports: allUserReports.length,
        postReports: allPostReports.length,
        userReportsByStatus: countStatus(allUserReports as BE_UserReport[]),
        postReportsByStatus: countStatus(allPostReports as BE_PostReport[]),
      });
    } catch (err) {
      console.error(
        "[AdminDashboard] fetchStats failed:",
        err
      );
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Admin Dashboard
            </Text>

            <TouchableOpacity
              onPress={handleLogout}
              style={styles.logoutBtn}
            >
              <Feather
                name="log-out"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Platform overview and management
          </Text>
        </View>

        {/* Stats Buttons */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon="users"
            color={colors.primary}
            onPress={() => router.push("/admin/users")}
          />

          <StatCard
            title="User Reports"
            value={stats.userReports}
            icon="alert-circle"
            color="#F59E0B"
            onPress={() => router.push("/admin/reports")}
          />

          <StatCard
            title="Post Reports"
            value={stats.postReports}
            icon="flag"
            color="#EF4444"
            onPress={() => router.push("/admin/reports")}
          />
        </View>

        {/* Report Analytics / Pie Charts (Side by Side) */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Reports Overview
          </Text>
        </View>

        <View style={styles.chartsGrid}>
          {/* User Reports Pie Chart */}
          <ReportPieChartCard
            title="User Reports"
            icon="alert-circle"
            iconColor="#F59E0B"
            breakdown={stats.userReportsByStatus}
            chartWidth={chartWidth}
            onPress={() => router.push("/admin/reports")}
          />

          {/* Post Reports Pie Chart */}
          <ReportPieChartCard
            title="Post Reports"
            icon="flag"
            iconColor="#EF4444"
            breakdown={stats.postReportsByStatus}
            chartWidth={chartWidth}
            onPress={() => router.push("/admin/reports")}
          />
        </View>

        {/* System Status */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            System Status
          </Text>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: "#22C55E" },
              ]}
            />

            <Text style={[styles.statusText, { color: colors.text }]}>
              All services operational
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textMuted }]}>
              Last checked:
            </Text>

            <Text style={[styles.statusValue, { color: colors.textMuted }]}>
              {new Date().toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 24,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  logoutBtn: {
    padding: 8,
  },

  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    position: "relative",
  },

  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },

  statTitle: {
    fontSize: 12,
    marginTop: 2,
  },

  statArrow: {
    position: "absolute",
    right: 12,
    bottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  sectionWrap: {
    marginBottom: 12,
  },

  chartsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  chartCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: 12,
    borderWidth: 1,
  },

  chartCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },

  chartIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  chartTitle: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },

  emptyChart: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  emptyChartTitle: {
    fontSize: 12,
    fontWeight: "500",
  },

  breakdownList: {
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },

  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },

  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  breakdownLabel: {
    fontSize: 11,
    fontWeight: "500",
  },

  breakdownValue: {
    fontSize: 12,
    fontWeight: "700",
  },

  statusCard: {
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  statusDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },

  statusLabel: {
    fontSize: 13,
  },

  statusValue: {
    fontSize: 13,
  },
});
