/**
 * DashboardScreen — Admin platform overview + moderation analytics.
 *
 * Everything comes from three calls:
 *   - adminService  → users & reports
 *   - moderationService.getModerationStats()      → headline moderation counters
 *   - moderationService.getModerationAnalytics()   → charts (daily volume, breakdowns, AI accuracy)
 */
import { borderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import {
  getAllUsers,
  getPostReports,
  getUserReports,
} from "@/services/adminService";
import type { BE_PostReport, BE_UserReport } from "@/services/backendTypes";
import {
  getModerationAnalytics,
  getModerationStats,
} from "@/services/moderationService";
import type {
  BE_ModerationAnalytics,
  BE_ModerationBreakdown,
} from "@/src/types/admin/strike";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
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
  moderationNeedsReview: number;
}

const STATUS_COLORS = {
  pending: "#F59E0B",
  resolved: "#22C55E",
  dismissed: "#9CA3AF",
};

/**
 * react-native-chart-kit gắn `onPressIn` vào mọi điểm dữ liệu của LineChart.
 * `react-native-svg` bản web chỉ lọc `onPress` mà bỏ sót `onPressIn`, nên prop này
 * bị đẩy xuống DOM và React DOM cảnh báo "Unknown event handler property".
 * Tắt dots trên web là cách sạch nhất — biểu đồ vẫn giữ đường, trục và legend.
 */
const IS_WEB = Platform.OS === "web";

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Harassment",
  hate: "Hate speech",
  sexual: "Sexual content",
  violence: "Violence",
  self_harm: "Self-harm",
  spam: "Spam",
  doxxing: "Personal info",
  illegal: "Illegal activity",
  exam_leak: "Exam leak",
  other: "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  Rule: "Rule filter",
  Llm: "AI model",
  Human: "Admin",
  Fallback: "Fallback",
};

const BREAKDOWN_PALETTE = [
  "#7C3AED",
  "#0EA5E9",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#14B8A6",
];

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

/**
 * Horizontal bar list for a distribution breakdown (target type / category / source).
 * Rendered with plain Views instead of a chart library — it stays readable on
 * narrow screens and shows the exact numbers.
 */
const BreakdownList: React.FC<{
  title: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  items: BE_ModerationBreakdown[];
  labelFor?: (key: string) => string;
}> = ({ title, icon, iconColor, items, labelFor }) => {
  const { colors } = useTheme();

  const max = items.reduce((acc, i) => Math.max(acc, i.count), 0);

  return (
    <View
      style={[
        styles.breakdownCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
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
        <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
      </View>

      {items.length === 0 ? (
        <Text style={[styles.emptyChartTitle, { color: colors.textMuted }]}>
          No data yet
        </Text>
      ) : (
        <View style={styles.breakdownBars}>
          {items.map((item, index) => {
            const color = BREAKDOWN_PALETTE[index % BREAKDOWN_PALETTE.length];
            const label = labelFor ? labelFor(item.key) : item.key;

            return (
              <View key={item.key} style={styles.barRow}>
                <Text
                  style={[styles.barLabel, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <View style={styles.barTrackRow}>
                  <View
                    style={[styles.barTrack, { backgroundColor: colors.borderLight }]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: color,
                          width: `${max > 0 ? (item.count / max) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.barValue, { color: colors.text }]}>
                    {item.count}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default function DashboardScreen() {
  const router = useRouter();
  const { logout } = useApp();
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  // Card width calculation: screenWidth - screen padding (20 * 2) - grid gap (12) - card inner padding (12 * 2)
  const chartWidth = Math.max(Math.floor((screenWidth - 40 - 12 - 24) / 2), 120);
  const lineChartWidth = screenWidth - 40 - 24;

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
    moderationNeedsReview: 0,
  });

  const [analytics, setAnalytics] = useState<BE_ModerationAnalytics | null>(null);
  const [rangeDays, setRangeDays] = useState(14);
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

  const fetchStats = useCallback(async () => {
    try {
      // Fetch all data once
      const [allUsers, allUserReports, allPostReports, moderationStats, analyticsData] =
        await Promise.all([
          getAllUsers(0, 1000),
          getUserReports(0, 1000),
          getPostReports(0, 1000),
          getModerationStats(),
          getModerationAnalytics(rangeDays),
        ]);

      setStats({
        totalUsers: allUsers.length,
        userReports: allUserReports.length,
        postReports: allPostReports.length,
        userReportsByStatus: countStatus(allUserReports as BE_UserReport[]),
        postReportsByStatus: countStatus(allPostReports as BE_PostReport[]),
        moderationNeedsReview: moderationStats?.needsReview ?? 0,
      });
      setAnalytics(analyticsData);
    } catch (err) {
      console.error(
        "[AdminDashboard] fetchStats failed:",
        err
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

  const daily = analytics?.daily ?? [];
  const hasVolume = daily.some((d) => d.total > 0);

  const lineChartData = {
    labels: daily.map((d) => d.date.slice(5)), // MM-DD
    datasets: [
      {
        data: daily.map((d) => d.approved),
        color: (opacity = 1) => `rgba(34,197,94,${opacity})`,
        strokeWidth: 2,
      },
      {
        data: daily.map((d) => d.rejected),
        color: (opacity = 1) => `rgba(239,68,68,${opacity})`,
        strokeWidth: 2,
      },
      {
        data: daily.map((d) => d.needsReview),
        color: (opacity = 1) => `rgba(139,92,246,${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ["Approved", "Rejected", "Needs review"],
  };

  const lineChartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => isDark ? `rgba(243,244,246,${opacity})` : `rgba(45,55,72,${opacity})`,
    labelColor: (opacity = 1) => colors.textMuted,
    propsForBackgroundLines: {
      stroke: colors.borderLight,
      strokeDasharray: "4 4",
    },
    propsForDots: {
      r: "3",
    },
  };

  const agreement = analytics?.agreement;

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

          <StatCard
            title="AI Moderation"
            value={stats.moderationNeedsReview}
            icon="shield"
            color="#8B5CF6"
            onPress={() => router.push("/admin/moderation")}
          />
        </View>

        {/* Accounts over the strike threshold — needs admin attention */}
        {analytics && analytics.usersOverStrikeThreshold > 0 ? (
          <TouchableOpacity
            style={[
              styles.strikeAlert,
              { backgroundColor: "rgba(239,68,68,0.10)", borderColor: "#EF4444" },
            ]}
            activeOpacity={0.8}
            onPress={() => router.push("/admin/strikes")}
          >
            <Feather name="alert-triangle" size={16} color="#EF4444" />
            <View style={styles.strikeAlertBody}>
              <Text style={[styles.strikeAlertTitle, { color: colors.text }]}>
                {analytics.usersOverStrikeThreshold} account
                {analytics.usersOverStrikeThreshold === 1 ? "" : "s"} over the
                strike limit
              </Text>
              <Text style={[styles.strikeAlertHint, { color: colors.textMuted }]}>
                Tap to review and revoke strikes if needed
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color="#EF4444" />
          </TouchableOpacity>
        ) : null}

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

        {/* ═══ Moderation analytics ═══ */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Moderation Analytics
            </Text>
            <TouchableOpacity
              style={[styles.strikesLink, { borderColor: colors.border }]}
              onPress={() => router.push("/admin/strikes")}
              activeOpacity={0.7}
            >
              <Feather name="alert-triangle" size={12} color="#F97316" />
              <Text style={styles.strikesLinkText}>Strikes</Text>
            </TouchableOpacity>
          </View>

          {/* Time range selector */}
          <View style={styles.rangeRow}>
            {[7, 14, 30].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.rangePill,
                  {
                    backgroundColor: colors.surface,
                    borderColor: rangeDays === days ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setRangeDays(days)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rangePillText,
                    { color: rangeDays === days ? colors.primary : colors.textMuted },
                  ]}
                >
                  {days}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Headline moderation counters */}
        {analytics ? (
          <View style={styles.metricGrid}>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: "#22C55E" }]}>
                {analytics.summary.approved}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Approved
              </Text>
            </View>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: "#EF4444" }]}>
                {analytics.summary.rejected}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Rejected
              </Text>
            </View>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: "#8B5CF6" }]}>
                {analytics.summary.needsReview}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Needs review
              </Text>
            </View>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: "#F59E0B" }]}>
                {analytics.summary.fallbackCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Fallbacks
              </Text>
            </View>
          </View>
        ) : null}

        {/* Daily moderation volume */}
        {analytics && hasVolume ? (
          <View
            style={[
              styles.lineChartCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.chartCardHeader}>
              <View
                style={[
                  styles.chartIconBadge,
                  { backgroundColor: "rgba(124,58,237,0.14)" },
                ]}
              >
                <Feather name="activity" size={15} color="#7C3AED" />
              </View>
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                Daily decisions
              </Text>
            </View>
            <LineChart
              data={lineChartData}
              width={lineChartWidth}
              height={190}
              chartConfig={lineChartConfig}
              bezier
              fromZero
              style={styles.lineChart}
              withInnerLines
              withOuterLines={false}
              yAxisInterval={1}
              withDots={!IS_WEB}
            />
          </View>
        ) : null}

        {/* Breakdown cards */}
        {analytics ? (
          <>
            <View style={styles.breakdownGrid}>
              <BreakdownList
                title="By content type"
                icon="layers"
                iconColor="#0EA5E9"
                items={analytics.byTargetType}
              />
              <BreakdownList
                title="By decision source"
                icon="cpu"
                iconColor="#F59E0B"
                items={analytics.bySource}
                labelFor={(key) => SOURCE_LABELS[key] ?? key}
              />
            </View>

            <BreakdownList
              title="Top violation categories"
              icon="alert-circle"
              iconColor="#EF4444"
              items={analytics.byCategory.slice(0, 8)}
              labelFor={(key) => CATEGORY_LABELS[key] ?? key}
            />
          </>
        ) : null}

        {/* AI accuracy */}
        {agreement && agreement.reviewedCount > 0 ? (
          <View
            style={[
              styles.accuracyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.chartCardHeader}>
              <View
                style={[
                  styles.chartIconBadge,
                  { backgroundColor: "rgba(14,165,233,0.14)" },
                ]}
              >
                <Feather name="trending-up" size={15} color="#0EA5E9" />
              </View>
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                AI ↔ Admin agreement
              </Text>
            </View>

            <View style={styles.accuracyRow}>
              <View style={styles.accuracyStat}>
                <Text style={[styles.accuracyValue, { color: colors.primary }]}>
                  {Math.round(agreement.agreementRate * 100)}%
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  Agreement
                </Text>
              </View>
              <View style={styles.accuracyStat}>
                <Text style={[styles.accuracyValue, { color: "#EF4444" }]}>
                  {agreement.falseNegativeCount}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  AI let through
                </Text>
              </View>
              <View style={styles.accuracyStat}>
                <Text style={[styles.accuracyValue, { color: "#F97316" }]}>
                  {agreement.falsePositiveCount}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  AI over-blocked
                </Text>
              </View>
            </View>

            <Text style={[styles.accuracySample, { color: colors.textMuted }]}>
              Based on {agreement.reviewedCount} reviewed item
              {agreement.reviewedCount === 1 ? "" : "s"}
            </Text>

            {agreement.suggestedThresholds ? (
              <View
                style={[
                  styles.thresholdBox,
                  { borderColor: colors.border, backgroundColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.thresholdTitle, { color: colors.text }]}>
                  Suggested thresholds
                </Text>
                <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>
                  {agreement.suggestedThresholds.explanation}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* LLM health */}
        {analytics && analytics.averageLatencyMs > 0 ? (
          <View
            style={[
              styles.healthGrid,
            ]}
          >
            <View
              style={[
                styles.healthCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="zap" size={16} color="#F59E0B" />
              <Text style={[styles.healthValue, { color: colors.text }]}>
                {Math.round(analytics.averageLatencyMs)} ms
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Avg latency
              </Text>
            </View>
            <View
              style={[
                styles.healthCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="target" size={16} color="#0EA5E9" />
              <Text style={[styles.healthValue, { color: colors.text }]}>
                {Math.round(analytics.averageConfidence * 100)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Avg confidence
              </Text>
            </View>
            <View
              style={[
                styles.healthCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name="dollar-sign" size={16} color="#22C55E" />
              <Text style={[styles.healthValue, { color: colors.text }]}>
                ${analytics.totalCostUsd.toFixed(3)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                LLM cost
              </Text>
            </View>
          </View>
        ) : null}

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

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  // ── Moderation analytics ──
  strikeAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },

  strikeAlertBody: {
    flex: 1,
    gap: 2,
  },

  strikeAlertTitle: {
    fontSize: 13,
    fontWeight: "700",
  },

  strikeAlertHint: {
    fontSize: 11,
  },
  strikesLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  strikesLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F97316",
  },

  rangeRow: {
    flexDirection: "row",
    gap: 8,
  },

  rangePill: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  rangePillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  metricGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  metricCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },

  metricValue: {
    fontSize: 19,
    fontWeight: "700",
  },

  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 3,
  },

  lineChartCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },

  lineChart: {
    borderRadius: borderRadius.md,
    marginTop: 8,
  },

  breakdownGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  breakdownCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 12,
  },

  breakdownBars: {
    gap: 10,
    marginTop: 4,
  },

  barRow: {
    gap: 4,
  },

  barLabel: {
    fontSize: 11,
    fontWeight: "600",
  },

  barTrackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 4,
  },

  barValue: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 26,
    textAlign: "right",
  },

  accuracyCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },

  accuracyRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 6,
  },

  accuracyStat: {
    flex: 1,
    alignItems: "center",
  },

  accuracyValue: {
    fontSize: 20,
    fontWeight: "700",
  },

  accuracySample: {
    fontSize: 11,
    textAlign: "center",
  },

  thresholdBox: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: 10,
    marginTop: 10,
    gap: 4,
  },

  thresholdTitle: {
    fontSize: 12,
    fontWeight: "700",
  },

  thresholdText: {
    fontSize: 11,
    lineHeight: 16,
  },

  healthGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },

  healthCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },

  healthValue: {
    fontSize: 15,
    fontWeight: "700",
  },
});
