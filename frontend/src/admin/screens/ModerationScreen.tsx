/**
 * ModerationScreen — Admin queue for AI moderation.
 *
 * Flow: AI (DeepSeek) evaluates the content → if it isn't confident enough the item
 * moves to "NeedsReview" and lands here for an admin to approve or reject.
 *
 * Every action leaves an audit trail (adminNote / reviewedBy / reviewedAt).
 */
import { AppColors, borderRadius } from "@/constants/theme";
import {
  approveModeration,
  getModerationResults,
  getModerationStats,
  rejectModeration,
} from "@/services/moderationService";
import type {
  BE_ModerationResult,
  BE_ModerationStats,
  ModerationStatus,
} from "@/src/types/admin/moderation";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterStatus = ModerationStatus | "All";

const STATUS_COLORS: Record<ModerationStatus, string> = {
  Pending: "#F59E0B",
  Approved: "#22C55E",
  Rejected: "#EF4444",
  NeedsReview: "#8B5CF6",
};

const SEVERITY_LABELS = ["Safe", "Minor", "Clear", "Severe"];
const SEVERITY_COLORS = ["#22C55E", "#F59E0B", "#F97316", "#EF4444"];

/** Human-readable label for each violation category (slugs come from the backend). */
const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Harassment",
  hate: "Hate speech",
  sexual: "Sexual content",
  violence: "Violence",
  self_harm: "Self-harm",
  spam: "Spam",
  doxxing: "Personal info exposure",
  illegal: "Illegal activity",
  exam_leak: "Exam leak",
  other: "Other violation",
};

const FilterChips: React.FC<{
  active: FilterStatus;
  onChange: (s: FilterStatus) => void;
  pendingCount: number;
}> = ({ active, onChange, pendingCount }) => {
  const options: { key: FilterStatus; label: string; badge?: number }[] = [
    { key: "NeedsReview", label: "Needs review", badge: pendingCount },
    { key: "All", label: "All" },
    { key: "Approved", label: "Approved" },
    { key: "Rejected", label: "Rejected" },
    { key: "Pending", label: "Pending" },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {options.map((o) => (
        <TouchableOpacity
          key={o.key}
          style={[styles.chip, active === o.key && styles.chipActive]}
          onPress={() => onChange(o.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, active === o.key && styles.chipTextActive]}>
            {o.label}
          </Text>
          {o.badge != null && o.badge > 0 ? (
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>
                {o.badge > 99 ? "99+" : o.badge}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

/** Severity badge rendered as "2 · Clear violation". */
const SeverityBadge: React.FC<{ severity: number | null }> = ({ severity }) => {
  if (severity == null) return null;
  const idx = Math.min(Math.max(severity, 0), 3);
  return (
    <View style={[styles.severityBadge, { borderColor: SEVERITY_COLORS[idx] }]}>
      <Text style={[styles.severityText, { color: SEVERITY_COLORS[idx] }]}>
        {idx} · {SEVERITY_LABELS[idx]}
      </Text>
    </View>
  );
};

const CategoryChips: React.FC<{ categories: string[] }> = ({ categories }) => {
  if (!categories || categories.length === 0) return null;
  return (
    <View style={styles.categoryRow}>
      {categories.map((c) => (
        <View key={c} style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>
            {CATEGORY_LABELS[c] ?? c}
          </Text>
        </View>
      ))}
    </View>
  );
};

/** Detail bottom sheet — lets an admin approve / reject with an optional note. */
const DetailSheet: React.FC<{
  item: BE_ModerationResult;
  busy: boolean;
  onClose: () => void;
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
}> = ({ item, busy, onClose, onApprove, onReject }) => {
  const [note, setNote] = useState("");

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Moderation details</Text>
            <TouchableOpacity onPress={onClose} disabled={busy}>
              <Feather name="x" size={20} color={AppColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
          >
            {/* Moderated content */}
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Content</Text>
              <Text style={styles.detailContent}>
                {item.targetContent?.trim() || "(no text content)"}
              </Text>
              {item.targetMediaUrls?.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.mediaRow}>
                    {item.targetMediaUrls.map((url, i) => (
                      <Image
                        key={`${url}-${i}`}
                        source={{ uri: url }}
                        style={styles.mediaThumb}
                      />
                    ))}
                  </View>
                </ScrollView>
              ) : null}
            </View>

            {/* Author */}
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Author</Text>
              <View style={styles.authorRow}>
                <Image
                  source={
                    item.authorAvatarUrl
                      ? { uri: item.authorAvatarUrl }
                      : require("@/assets/images/UITVibesLogo.png")
                  }
                  style={styles.authorAvatar}
                />
                <Text style={styles.authorName}>
                  {item.authorDisplayName || "Someone"}
                </Text>
              </View>
            </View>

            {/* AI result */}
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>AI result</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Decision</Text>
                <Text style={styles.metaValue}>{item.llmDecision ?? "—"}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Confidence</Text>
                <Text style={styles.metaValue}>
                  {item.confidence != null
                    ? `${Math.round(item.confidence * 100)}%`
                    : "—"}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Severity</Text>
                <Text style={styles.metaValue}>
                  {item.severity != null ? SEVERITY_LABELS[item.severity] ?? "—" : "—"}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Source</Text>
                <Text style={styles.metaValue}>{item.source}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Internal code</Text>
                <Text style={styles.metaValue}>{item.internalReasonCode}</Text>
              </View>
              <CategoryChips categories={item.categories} />
            </View>

            {/* Reason the AI sent to the author */}
            {item.authorReason ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Reason sent to the author</Text>
                <Text style={styles.detailContent}>{item.authorReason}</Text>
              </View>
            ) : null}

            {/* Previous admin note */}
            {item.adminNote ? (
              <View style={styles.detailBlock}>
                <Text style={styles.detailLabel}>Admin note</Text>
                <Text style={styles.detailContent}>{item.adminNote}</Text>
              </View>
            ) : null}

            {/* Note input */}
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>
                Your note (optional, shown to the author)
              </Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Content looks safe, approved."
                placeholderTextColor={AppColors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                maxLength={500}
                editable={!busy}
              />
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => onReject(note.trim())}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Feather name="x-circle" size={16} color="#EF4444" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => onApprove(note.trim())}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={16} color="#fff" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function ModerationScreen() {
  const [items, setItems] = useState<BE_ModerationResult[]>([]);
  const [stats, setStats] = useState<BE_ModerationStats | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("NeedsReview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<BE_ModerationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [list, s] = await Promise.all([
        getModerationResults({
          status: filter === "All" ? undefined : filter,
          take: 50,
          orderByUpdatedAt: filter === "All",
        }),
        getModerationStats(),
      ]);
      setItems(list);
      if (s) setStats(s);
    } catch (err) {
      console.error("[AdminModeration] fetchData failed:", err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApprove = async (note: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await approveModeration(selected.id, note || undefined);
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
      setSelected(null);
      Alert.alert("Success", "Content approved.");
      // Refresh the stats counters.
      getModerationStats().then((s) => s && setStats(s));
    } catch {
      Alert.alert("Error", "Could not approve the content. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (note: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await rejectModeration(selected.id, note || undefined);
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      }
      setSelected(null);
      Alert.alert("Success", "Content rejected.");
      getModerationStats().then((s) => s && setStats(s));
    } catch {
      Alert.alert("Error", "Could not reject the content. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const renderItem = ({ item }: { item: BE_ModerationResult }) => {
    const statusColor = STATUS_COLORS[item.status] ?? AppColors.textMuted;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelected(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.cardContent} numberOfLines={3}>
          {item.targetContent?.trim() || "(no text content)"}
        </Text>

        {item.targetMediaUrls?.length > 0 ? (
          <View style={styles.mediaRow}>
            {item.targetMediaUrls.slice(0, 3).map((url, i) => (
              <Image
                key={`${url}-${i}`}
                source={{ uri: url }}
                style={styles.mediaThumb}
              />
            ))}
            {item.targetMediaUrls.length > 3 ? (
              <View style={styles.mediaMore}>
                <Text style={styles.mediaMoreText}>
                  +{item.targetMediaUrls.length - 3}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.cardFooter}>
          <View style={styles.cardFooterLeft}>
            <Feather name="user" size={12} color={AppColors.textMuted} />
            <Text style={styles.cardAuthor} numberOfLines={1}>
              {item.authorDisplayName || "Someone"}
            </Text>
          </View>
          <SeverityBadge severity={item.severity} />
        </View>

        <CategoryChips categories={item.categories} />
      </TouchableOpacity>
    );
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Moderation</Text>
        <Text style={styles.headerSubtitle}>
          Review content the AI was not sure about
        </Text>
      </View>

      {/* Quick stats */}
      {stats ? (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#8B5CF6" }]}>
              {stats.needsReview}
            </Text>
            <Text style={styles.statLabel}>Needs review</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#F59E0B" }]}>
              {stats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#22C55E" }]}>
              {stats.approved}
            </Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: "#EF4444" }]}>
              {stats.rejected}
            </Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
        </View>
      ) : null}

      <FilterChips
        active={filter}
        onChange={setFilter}
        pendingCount={stats?.needsReview ?? 0}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={AppColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="shield" size={48} color={AppColors.textMuted} />
            <Text style={styles.emptyText}>
              {filter === "NeedsReview"
                ? "Nothing needs review"
                : "No content"}
            </Text>
          </View>
        }
      />

      {selected ? (
        <DetailSheet
          item={selected}
          busy={busy}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: AppColors.text, letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 13, color: AppColors.textMuted, marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 10, color: AppColors.textMuted, marginTop: 2 },
  chips: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  chipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  chipText: { fontSize: 13, color: AppColors.textMuted, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  chipBadge: {
    backgroundColor: "#EF4444",
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 9,
    alignItems: "center",
  },
  chipBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: "600" },
  cardDate: { fontSize: 11, color: AppColors.textMuted },
  cardContent: { fontSize: 14, color: AppColors.text, lineHeight: 20 },
  mediaRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  mediaThumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: AppColors.border,
  },
  mediaMore: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: AppColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaMoreText: { fontSize: 13, fontWeight: "600", color: AppColors.textMuted },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  cardAuthor: { fontSize: 12, color: AppColors.textMuted, flexShrink: 1 },
  severityBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  severityText: { fontSize: 10, fontWeight: "600" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  categoryChip: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryChipText: { fontSize: 10, fontWeight: "600", color: "#EF4444" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: AppColors.textMuted },
  // Sheet
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: AppColors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: "600", color: AppColors.text },
  sheetBody: { maxHeight: 460 },
  sheetBodyContent: { padding: 20, gap: 16 },
  detailBlock: { gap: 8 },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AppColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailContent: {
    fontSize: 14,
    color: AppColors.text,
    lineHeight: 20,
    backgroundColor: AppColors.background,
    padding: 12,
    borderRadius: borderRadius.md,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.border,
  },
  authorName: { fontSize: 14, fontWeight: "600", color: AppColors.text },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  metaKey: { fontSize: 13, color: AppColors.textMuted },
  metaValue: {
    fontSize: 13,
    color: AppColors.text,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 14,
    color: AppColors.text,
    minHeight: 76,
    textAlignVertical: "top",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  approveBtn: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  approveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  rejectBtn: { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" },
  rejectBtnText: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
});