/**
 * ReportsScreen — Admin view of user & post reports
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getUserReports,
  getPostReports,
  resolveUserReport,
  resolvePostReport,
  rejectUserReport,
  rejectPostReport,
} from "@/services/adminService";
import type {
  BE_UserReport,
  BE_PostReport,
  AdminReportStatus,
} from "@/services/backendTypes";
import { AppColors, borderRadius } from "@/constants/theme";

type ReportTab = "user" | "post";
type FilterStatus = AdminReportStatus | "All";

const STATUS_COLORS: Record<AdminReportStatus, string> = {
  Pending: "#F59E0B",
  Resolved: "#22C55E",
  Rejected: "#EF4444",
};

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
}> = ({ label, active, onPress, badge }) => (
  <TouchableOpacity
    style={[styles.tab, active && styles.tabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    {badge != null && badge > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
      </View>
    ) : null}
  </TouchableOpacity>
);

const FilterChips: React.FC<{
  active: FilterStatus;
  onChange: (s: FilterStatus) => void;
}> = ({ active, onChange }) => {
  const options: FilterStatus[] = ["All", "Pending", "Resolved", "Rejected"];
  return (
    <View style={styles.chips}>
      {options.map((s) => (
        <TouchableOpacity
          key={s}
          style={[styles.chip, active === s && styles.chipActive]}
          onPress={() => onChange(s)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, active === s && styles.chipTextActive]}>
            {s}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ReportCard is unused — UserReportCard and PostReportCard are used instead.

function UserReportCard({
  report,
  onResolve,
  onReject,
}: {
  report: BE_UserReport;
  onResolve: () => void;
  onReject: () => void;
}) {
  const statusColor = STATUS_COLORS[report.status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>{report.status}</Text>
        </View>
        <Text style={styles.reportDate}>
          {new Date(report.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.reportContent}>
        <View style={styles.reportParty}>
          <Text style={styles.reportLabel}>Reporter:</Text>
          <Text style={styles.reportValue}>{report.reporterDisplayName}</Text>
        </View>
        <View style={styles.reportParty}>
          <Text style={styles.reportLabel}>Reported:</Text>
          <Text style={styles.reportValue}>{report.reportedDisplayName}</Text>
        </View>
      </View>
      <View style={styles.reasonRow}>
        <Feather name="flag" size={12} color={AppColors.textMuted} />
        <Text style={styles.reasonText}>{report.reason}</Text>
      </View>
      {report.additionalDetails ? (
        <View style={styles.noteRow}>
          <Feather name="align-left" size={12} color={AppColors.textMuted} />
          <Text style={styles.noteText}>{report.additionalDetails}</Text>
        </View>
      ) : null}
      {report.adminNote ? (
        <View style={styles.noteRow}>
          <Feather name="message-square" size={12} color={AppColors.textMuted} />
          <Text style={styles.noteText}>Admin: {report.adminNote}</Text>
        </View>
      ) : null}
      {report.status === "Pending" && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.btnReject}
            onPress={() =>
              Alert.alert("Reject Report", "Mark this report as invalid?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reject", style: "destructive", onPress: onReject },
              ])
            }
          >
            <Feather name="x" size={14} color="#EF4444" />
            <Text style={styles.btnRejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnResolve}
            onPress={() =>
              Alert.alert(
                "Resolve Report",
                `Resolve report against ${report.reportedDisplayName}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Resolve", onPress: onResolve },
                ],
              )
            }
          >
            <Feather name="check" size={14} color="#22C55E" />
            <Text style={styles.btnResolveText}>Resolve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PostReportCard({
  report,
  onResolve,
  onReject,
}: {
  report: BE_PostReport;
  onResolve: () => void;
  onReject: () => void;
}) {
  const statusColor = STATUS_COLORS[report.status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>{report.status}</Text>
        </View>
        <Text style={styles.reportDate}>
          {new Date(report.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.reportContent}>
        {report.postMediaUrls && report.postMediaUrls.length > 0 && (
          <Image source={{ uri: report.postMediaUrls[0] }} style={styles.postThumb} />
        )}
        <Text style={styles.postContent} numberOfLines={2}>
          {report.postContent}
        </Text>
      </View>
      <View style={styles.reasonRow}>
        <Feather name="flag" size={12} color={AppColors.textMuted} />
        <Text style={styles.reasonText}>{report.reason}</Text>
      </View>
      {report.adminNote ? (
        <View style={styles.noteRow}>
          <Feather name="message-square" size={12} color={AppColors.textMuted} />
          <Text style={styles.noteText}>Admin: {report.adminNote}</Text>
        </View>
      ) : null}
      {report.status === "Pending" && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.btnReject}
            onPress={() =>
              Alert.alert("Reject Report", "Mark this report as invalid?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reject", style: "destructive", onPress: onReject },
              ])
            }
          >
            <Feather name="x" size={14} color="#EF4444" />
            <Text style={styles.btnRejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnResolve}
            onPress={() =>
              Alert.alert(
                "Resolve Report",
                "Dismiss this post report?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Resolve", onPress: onResolve },
                ],
              )
            }
          >
            <Feather name="check" size={14} color="#22C55E" />
            <Text style={styles.btnResolveText}>Resolve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function ReportsScreen() {
  const [tab, setTab] = useState<ReportTab>("user");
  const [filter, setFilter] = useState<FilterStatus>("All");
  const [userReports, setUserReports] = useState<BE_UserReport[]>([]);
  const [postReports, setPostReports] = useState<BE_PostReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const PAGE_SIZE = 20;

  // Stable ref so callbacks always call the latest fetchReports
  const fetchReportsRef = useRef<(pageNum: number, isRefresh: boolean) => Promise<void>>();
  const isFetchingRef = useRef(false);

  const fetchReports = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const status = filter === "All" ? undefined : filter;
        const [u, p] = await Promise.all([
          getUserReports(pageNum * PAGE_SIZE, PAGE_SIZE, status),
          getPostReports(pageNum * PAGE_SIZE, PAGE_SIZE, status),
        ]);
        if (isRefresh) {
          setUserReports(u);
          setPostReports(p);
        } else {
          setUserReports((prev) => [...prev, ...u]);
          setPostReports((prev) => [...prev, ...p]);
        }
        setHasMore(u.length === PAGE_SIZE || p.length === PAGE_SIZE);
      } catch (err) {
        console.error("[AdminReports] fetchReports failed:", err);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter],
  );

  // Keep the ref in sync with the latest fetchReports
  fetchReportsRef.current = fetchReports;

  useEffect(() => {
    if (isFetchingRef.current) return;
    setLoading(true);
    setPage(0);
    setHasMore(true);
    fetchReports(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const onRefresh = () => {
    if (isFetchingRef.current) return;
    setRefreshing(true);
    setPage(0);
    setHasMore(false);
    fetchReports(0, true);
  };

  const onEndReached = () => {
    if (isFetchingRef.current || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    setPage((p) => {
      const next = p + 1;
      fetchReports(next, false);
      return next;
    });
  };

  const handleResolve = async (reportId: string, isUser: boolean) => {
    setActionLoading((prev) => ({ ...prev, [reportId]: true }));
    try {
      if (isUser) {
        await resolveUserReport(reportId);
        setUserReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "Resolved" as AdminReportStatus } : r)),
        );
      } else {
        await resolvePostReport(reportId);
        setPostReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "Resolved" as AdminReportStatus } : r)),
        );
      }
    } catch {
      Alert.alert("Error", "Failed to resolve report. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const handleReject = async (reportId: string, isUser: boolean) => {
    setActionLoading((prev) => ({ ...prev, [reportId]: true }));
    try {
      if (isUser) {
        await rejectUserReport(reportId);
        setUserReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "Rejected" as AdminReportStatus } : r)),
        );
      } else {
        await rejectPostReport(reportId);
        setPostReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "Rejected" as AdminReportStatus } : r)),
        );
      }
    } catch {
      Alert.alert("Error", "Failed to reject report. Please try again.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const pendingUserCount = userReports.filter((r) => r.status === "Pending").length;
  const pendingPostCount = postReports.filter((r) => r.status === "Pending").length;

  const data = tab === "user" ? userReports : postReports;

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSubtitle}>Review and manage user reports</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabButton
          label="User Reports"
          active={tab === "user"}
          onPress={() => setTab("user")}
          badge={pendingUserCount}
        />
        <TabButton
          label="Post Reports"
          active={tab === "post"}
          onPress={() => setTab("post")}
          badge={pendingPostCount}
        />
      </View>

      {/* Filter chips */}
      <FilterChips active={filter} onChange={(s) => setFilter(s)} />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={AppColors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="check-circle" size={48} color="#22C55E" />
            <Text style={styles.emptyText}>No {filter.toLowerCase()} reports</Text>
          </View>
        }
        renderItem={({ item }) =>
          tab === "user" ? (
            <UserReportCard
              report={item as BE_UserReport}
              onResolve={() => handleResolve(item.id, true)}
              onReject={() => handleReject(item.id, true)}
            />
          ) : (
            <PostReportCard
              report={item as BE_PostReport}
              onResolve={() => handleResolve(item.id, false)}
              onReject={() => handleReject(item.id, false)}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: AppColors.text, letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: AppColors.textMuted, marginTop: 2 },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 6,
  },
  tabActive: { backgroundColor: `${AppColors.primary}14`, borderColor: AppColors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: AppColors.textMuted },
  tabTextActive: { color: AppColors.primary },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  chips: { flexDirection: "row", paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  chipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  chipText: { fontSize: 12, fontWeight: "500", color: AppColors.textMuted },
  chipTextActive: { color: "#FFF" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  empty: { flex: 1, alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: AppColors.textMuted },
  // Card
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: "600" },
  reportDate: { fontSize: 12, color: AppColors.textMuted },
  reportContent: { gap: 6, marginBottom: 8 },
  reportParty: { flexDirection: "row", gap: 6 },
  reportLabel: { fontSize: 13, color: AppColors.textMuted },
  reportValue: { fontSize: 13, fontWeight: "500", color: AppColors.text },
  postThumb: { width: 80, height: 60, borderRadius: borderRadius.sm, backgroundColor: AppColors.border },
  postContent: { fontSize: 13, color: AppColors.textMuted, marginTop: 4 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  reasonText: { fontSize: 13, color: AppColors.textMuted, fontStyle: "italic" },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  noteText: { fontSize: 12, color: AppColors.textMuted },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  btnReject: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  btnRejectText: { fontSize: 13, fontWeight: "600", color: "#EF4444" },
  btnResolve: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  btnResolveText: { fontSize: 13, fontWeight: "600", color: "#22C55E" },
});
