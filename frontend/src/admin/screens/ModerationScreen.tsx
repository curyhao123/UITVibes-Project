/**
 * ModerationScreen — Admin queue for AI moderation.
 *
 * Flow: AI (DeepSeek) evaluates the content → if it isn't confident enough the item
 * moves to "NeedsReview" and lands here for an admin to approve or reject.
 *
 * Every action leaves an audit trail (adminNote / reviewedBy / reviewedAt).
 *
 * Tính năng Phase 2:
 *  - Lọc theo status / target type / category / severity / confidence / thời gian / tác giả
 *  - Sắp xếp theo severity (ưu tiên cao nhất) hoặc thời gian
 *  - Phân trang với tổng số bản ghi (biết được backlog)
 *  - Xử lý hàng loạt (approve / reject nhiều bản ghi một lượt)
 *  - Lọc & đánh dấu các bản ghi đang có khiếu nại từ tác giả
 */
import { AppColors, borderRadius } from "@/constants/theme";
import {
  approveModeration,
  bulkModeration,
  getModerationResultsPaged,
  getModerationStats,
  rejectModeration,
} from "@/services/moderationService";
import type {
  BE_ModerationResult,
  BE_ModerationStats,
  ModerationStatus,
  ModerationTargetType,
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

const PAGE_SIZE = 20;

const STATUS_COLORS: Record<ModerationStatus, string> = {
  Pending: "#F59E0B",
  Approved: "#22C55E",
  Rejected: "#EF4444",
  NeedsReview: "#8B5CF6",
};

const SEVERITY_LABELS = ["Safe", "Minor", "Clear", "Severe"];
const SEVERITY_COLORS = ["#22C55E", "#F59E0B", "#F97316", "#EF4444"];

const TARGET_TYPE_LABELS: Record<ModerationTargetType, string> = {
  Post: "Post",
  Comment: "Comment",
  Reel: "Reel",
  Story: "Story",
  ReelComment: "Reel comment",
};

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
    // ScrollView ngang bị co lại trong flex column nếu không có chiều cao cố định →
    // hàng chip cao 34px bị cắt mất phần dưới (overflow hidden), trông như bị dòng
    // "Filters" bên dưới đè lên. Giữ chiều cao cố định + padding nằm ngoài ScrollView.
    <View style={styles.chipsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
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
    </View>
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

/**
 * Advanced filter panel — severity, confidence, content type, appeals only.
 * Kept collapsed by default so the queue stays clean.
 */
const AdvancedFilters: React.FC<{
  expanded: boolean;
  onToggle: () => void;
  targetType: ModerationTargetType | null;
  onTargetTypeChange: (t: ModerationTargetType | null) => void;
  minSeverity: number | null;
  onMinSeverityChange: (s: number | null) => void;
  minConfidence: number | null;
  onMinConfidenceChange: (c: number | null) => void;
  onlyWithAppeal: boolean;
  onOnlyWithAppealChange: (v: boolean) => void;
  orderBySeverity: boolean;
  onOrderBySeverityChange: (v: boolean) => void;
  orderByPriority: boolean;
  onOrderByPriorityChange: (v: boolean) => void;
  search: string;
  onSearchChange: (v: string) => void;
  activeCount: number;
  onReset: () => void;
}> = ({
  expanded,
  onToggle,
  targetType,
  onTargetTypeChange,
  minSeverity,
  onMinSeverityChange,
  minConfidence,
  onMinConfidenceChange,
  onlyWithAppeal,
  onOnlyWithAppealChange,
  orderBySeverity,
  onOrderBySeverityChange,
  orderByPriority,
  onOrderByPriorityChange,
  search,
  onSearchChange,
  activeCount,
  onReset,
}) => {
  const targetTypes: ModerationTargetType[] = [
    "Post",
    "Comment",
    "Reel",
    "Story",
    "ReelComment",
  ];
  const severities = [1, 2, 3];
  const confidences = [0.5, 0.8];

  return (
    <View style={styles.advancedWrap}>
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Feather name="sliders" size={14} color={AppColors.textMuted} />
        <Text style={styles.advancedToggleText}>Filters</Text>
        {activeCount > 0 ? (
          <View style={styles.chipBadge}>
            <Text style={styles.chipBadgeText}>{activeCount}</Text>
          </View>
        ) : null}
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={AppColors.textMuted}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.advancedBody}>
          {/* Search */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Search</Text>
            <View style={styles.searchWrap}>
              <Feather name="search" size={13} color={AppColors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search content, reason or category"
                placeholderTextColor={AppColors.textMuted}
                value={search}
                onChangeText={onSearchChange}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => onSearchChange("")} hitSlop={8}>
                  <Feather name="x-circle" size={14} color={AppColors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Target type */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Content type</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.miniChip,
                  targetType === null && styles.miniChipActive,
                ]}
                onPress={() => onTargetTypeChange(null)}
              >
                <Text
                  style={[
                    styles.miniChipText,
                    targetType === null && styles.miniChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {targetTypes.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.miniChip,
                    targetType === t && styles.miniChipActive,
                  ]}
                  onPress={() => onTargetTypeChange(t)}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      targetType === t && styles.miniChipTextActive,
                    ]}
                  >
                    {TARGET_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Severity */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Min severity</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.miniChip,
                  minSeverity === null && styles.miniChipActive,
                ]}
                onPress={() => onMinSeverityChange(null)}
              >
                <Text
                  style={[
                    styles.miniChipText,
                    minSeverity === null && styles.miniChipTextActive,
                  ]}
                >
                  Any
                </Text>
              </TouchableOpacity>
              {severities.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.miniChip,
                    minSeverity === s && styles.miniChipActive,
                  ]}
                  onPress={() => onMinSeverityChange(s)}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      minSeverity === s && styles.miniChipTextActive,
                    ]}
                  >
                    {s}+
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Confidence */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Min confidence</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.miniChip,
                  minConfidence === null && styles.miniChipActive,
                ]}
                onPress={() => onMinConfidenceChange(null)}
              >
                <Text
                  style={[
                    styles.miniChipText,
                    minConfidence === null && styles.miniChipTextActive,
                  ]}
                >
                  Any
                </Text>
              </TouchableOpacity>
              {confidences.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.miniChip,
                    minConfidence === c && styles.miniChipActive,
                  ]}
                  onPress={() => onMinConfidenceChange(c)}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      minConfidence === c && styles.miniChipTextActive,
                    ]}
                  >
                    {Math.round(c * 100)}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Toggles */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                onlyWithAppeal && styles.miniChipActive,
              ]}
              onPress={() => onOnlyWithAppealChange(!onlyWithAppeal)}
            >
              <Feather
                name="flag"
                size={12}
                color={onlyWithAppeal ? "#fff" : AppColors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  onlyWithAppeal && styles.miniChipTextActive,
                ]}
              >
                Appeals only
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleChip,
                orderBySeverity && styles.miniChipActive,
              ]}
              onPress={() => onOrderBySeverityChange(!orderBySeverity)}
            >
              <Feather
                name="bar-chart-2"
                size={12}
                color={orderBySeverity ? "#fff" : AppColors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  orderBySeverity && styles.miniChipTextActive,
                ]}
              >
                Sort by severity
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleChip,
                orderByPriority && styles.miniChipActive,
              ]}
              onPress={() => onOrderByPriorityChange(!orderByPriority)}
            >
              <Feather
                name="flag"
                size={12}
                color={orderByPriority ? "#fff" : AppColors.textMuted}
              />
              <Text
                style={[
                  styles.toggleText,
                  orderByPriority && styles.miniChipTextActive,
                ]}
              >
                Sort by priority
              </Text>
            </TouchableOpacity>
          </View>

          {activeCount > 0 ? (
            <TouchableOpacity onPress={onReset} style={styles.resetBtn}>
              <Feather name="rotate-ccw" size={12} color={AppColors.primary} />
              <Text style={styles.resetText}>Reset filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
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

            {/* Appeal — lý do tác giả khiếu nại */}
            {item.appealStatus === "Pending" ? (
              <View style={styles.appealBox}>
                <View style={styles.appealHeader}>
                  <Feather name="flag" size={14} color="#8B5CF6" />
                  <Text style={styles.appealTitle}>Author appeal</Text>
                </View>
                <Text style={styles.appealReason}>
                  {item.appealReason || "(no reason given)"}
                </Text>
                {item.appealSubmittedAt ? (
                  <Text style={styles.appealDate}>
                    Submitted {new Date(item.appealSubmittedAt).toLocaleString()}
                  </Text>
                ) : null}
              </View>
            ) : null}

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
                <Text style={styles.metaKey}>Content type</Text>
                <Text style={styles.metaValue}>{item.targetType}</Text>
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

  // ── Advanced filters ──
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [targetType, setTargetType] = useState<ModerationTargetType | null>(null);
  const [minSeverity, setMinSeverity] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState<number | null>(null);
  const [onlyWithAppeal, setOnlyWithAppeal] = useState(false);
  const [orderBySeverity, setOrderBySeverity] = useState(false);
  const [orderByPriority, setOrderByPriority] = useState(false);
  const [search, setSearch] = useState("");

  // ── Pagination ──
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Bulk selection ──
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isFetchingRef = useRef(false);

  const activeFilterCount =
    (targetType ? 1 : 0) +
    (minSeverity != null ? 1 : 0) +
    (minConfidence != null ? 1 : 0) +
    (onlyWithAppeal ? 1 : 0) +
    (orderBySeverity ? 1 : 0) +
    (orderByPriority ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [paged, s] = await Promise.all([
        getModerationResultsPaged({
          status: filter === "All" ? undefined : filter,
          take: PAGE_SIZE,
          skip: 0,
          orderBySeverity,
          orderByPriority,
          onlyWithAppeal,
          search: search.trim() || undefined,
          targetType: targetType ?? undefined,
          minSeverity: minSeverity ?? undefined,
          minConfidence: minConfidence ?? undefined,
        }),
        getModerationStats(),
      ]);

      if (paged) {
        setItems(paged.items);
        setTotal(paged.total);
        setHasMore(paged.hasMore);
        setPage(0);
      }
      if (s) setStats(s);
    } catch (err) {
      console.error("[AdminModeration] fetchData failed:", err);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    filter,
    orderBySeverity,
    orderByPriority,
    onlyWithAppeal,
    search,
    targetType,
    minSeverity,
    minConfidence,
  ]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const paged = await getModerationResultsPaged({
        status: filter === "All" ? undefined : filter,
        take: PAGE_SIZE,
        skip: nextPage * PAGE_SIZE,
        orderBySeverity,
        orderByPriority,
        onlyWithAppeal,
        search: search.trim() || undefined,
        targetType: targetType ?? undefined,
        minSeverity: minSeverity ?? undefined,
        minConfidence: minConfidence ?? undefined,
      });
      if (paged) {
        setItems((prev) => [...prev, ...paged.items]);
        setTotal(paged.total);
        setHasMore(paged.hasMore);
        setPage(nextPage);
      }
    } catch (err) {
      console.error("[AdminModeration] loadMore failed:", err);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [
    filter,
    hasMore,
    loadingMore,
    orderBySeverity,
    orderByPriority,
    onlyWithAppeal,
    page,
    search,
    targetType,
    minSeverity,
    minConfidence,
  ]);

  const resetAdvancedFilters = () => {
    setTargetType(null);
    setMinSeverity(null);
    setMinConfidence(null);
    setOnlyWithAppeal(false);
    setOrderBySeverity(false);
    setOrderByPriority(false);
    setSearch("");
  };

  const handleApprove = async (note: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await approveModeration(selected.id, note || undefined);
      if (updated) {
        setItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i)),
        );
      }
      setSelected(null);
      Alert.alert("Success", "Content approved.");
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
        setItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i)),
        );
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

  // ── Bulk actions ──────────────────────────────────────────────────────
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleBulk = (action: "approve" | "reject") => {
    if (selectedIds.length === 0) return;

    const run = async () => {
      setBusy(true);
      try {
        const result = await bulkModeration(
          selectedIds,
          action,
          undefined,
        );
        if (result) {
          const succeeded = new Set(result.succeededIds);
          setItems((prev) =>
            prev.filter((i) => !succeeded.has(i.id)),
          );
          setTotal((prev) => Math.max(0, prev - result.succeededCount));
          setSelectedIds([]);
          setSelectionMode(false);

          const failedNote =
            result.failedCount > 0
              ? `\n\n${result.failedCount} item(s) could not be processed.`
              : "";
          Alert.alert(
            "Done",
            `${result.succeededCount} item(s) ${
              action === "approve" ? "approved" : "rejected"
            }.${failedNote}`,
          );
          getModerationStats().then((s) => s && setStats(s));
        }
      } catch {
        Alert.alert("Error", "Could not run the bulk action. Please try again.");
      } finally {
        setBusy(false);
      }
    };

    Alert.alert(
      action === "approve" ? "Approve selected?" : "Reject selected?",
      `${selectedIds.length} item(s) will be ${
        action === "approve" ? "approved" : "rejected"
      }.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: run },
      ],
    );
  };

  const renderItem = ({ item }: { item: BE_ModerationResult }) => {
    const statusColor = STATUS_COLORS[item.status] ?? AppColors.textMuted;
    const isSelected = selectedIds.includes(item.id);
    const hasAppeal = item.appealStatus === "Pending";

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() =>
          selectionMode ? toggleSelection(item.id) : setSelected(item)
        }
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            setSelectedIds([item.id]);
          }
        }}
        activeOpacity={0.7}
      >
        {selectionMode ? (
          <Feather
            name={isSelected ? "check-square" : "square"}
            size={18}
            color={isSelected ? AppColors.primary : AppColors.textMuted}
            style={styles.selectionIcon}
          />
        ) : null}

        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {item.status}
            </Text>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>{item.targetType}</Text>
            </View>
            {hasAppeal ? (
              <View style={styles.appealTag}>
                <Feather name="flag" size={9} color="#8B5CF6" />
                <Text style={styles.appealTagText}>Appeal</Text>
              </View>
            ) : null}
            {item.reportCount > 0 ? (
              <View style={styles.reportTag}>
                <Feather name="alert-triangle" size={9} color="#EF4444" />
                <Text style={styles.reportTagText}>
                  {item.reportCount} report{item.reportCount === 1 ? "" : "s"}
                </Text>
              </View>
            ) : null}
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
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>AI Moderation</Text>
            <Text style={styles.headerSubtitle}>
              Review content the AI was not sure about
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.selectBtn, selectionMode && styles.selectBtnActive]}
            onPress={toggleSelectionMode}
          >
            <Feather
              name={selectionMode ? "x" : "check-square"}
              size={14}
              color={selectionMode ? "#fff" : AppColors.textMuted}
            />
            <Text
              style={[
                styles.selectBtnText,
                selectionMode && styles.selectBtnTextActive,
              ]}
            >
              {selectionMode ? "Cancel" : "Select"}
            </Text>
          </TouchableOpacity>
        </View>
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

      {/* SLA + appeals strip */}
      {stats && (stats.appealPendingCount > 0 || stats.slaBreachedCount > 0) ? (
        <View style={styles.alertStrip}>
          {stats.appealPendingCount > 0 ? (
            <View style={styles.alertChip}>
              <Feather name="flag" size={11} color="#8B5CF6" />
              <Text style={styles.alertChipText}>
                {stats.appealPendingCount} appeal
                {stats.appealPendingCount === 1 ? "" : "s"}
              </Text>
            </View>
          ) : null}
          {stats.slaBreachedCount > 0 ? (
            <View style={styles.alertChip}>
              <Feather name="clock" size={11} color="#EF4444" />
              <Text style={[styles.alertChipText, { color: "#EF4444" }]}>
                {stats.slaBreachedCount} over SLA
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <FilterChips
        active={filter}
        onChange={setFilter}
        pendingCount={stats?.needsReview ?? 0}
      />

      <AdvancedFilters
        expanded={filtersExpanded}
        onToggle={() => setFiltersExpanded((prev) => !prev)}
        targetType={targetType}
        onTargetTypeChange={setTargetType}
        minSeverity={minSeverity}
        onMinSeverityChange={setMinSeverity}
        minConfidence={minConfidence}
        onMinConfidenceChange={setMinConfidence}
        onlyWithAppeal={onlyWithAppeal}
        onOnlyWithAppealChange={setOnlyWithAppeal}
        orderBySeverity={orderBySeverity}
        onOrderBySeverityChange={setOrderBySeverity}
        orderByPriority={orderByPriority}
        onOrderByPriorityChange={setOrderByPriority}
        search={search}
        onSearchChange={setSearch}
        activeCount={activeFilterCount}
        onReset={resetAdvancedFilters}
      />

      {/* Bulk action bar */}
      {selectionMode && selectedIds.length > 0 ? (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selectedIds.length} selected</Text>
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.bulkBtn, styles.bulkApprove]}
              onPress={() => handleBulk("approve")}
              disabled={busy}
            >
              <Feather name="check-circle" size={14} color="#fff" />
              <Text style={styles.bulkBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkBtn, styles.bulkReject]}
              onPress={() => handleBulk("reject")}
              disabled={busy}
            >
              <Feather name="x-circle" size={14} color="#EF4444" />
              <Text style={[styles.bulkBtnText, { color: "#EF4444" }]}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

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
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={AppColors.primary} />
            </View>
          ) : total > 0 ? (
            <Text style={styles.footerText}>
              Showing {items.length} of {total}
            </Text>
          ) : null
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: AppColors.text,
    letterSpacing: -0.4,
  },
  headerSubtitle: { fontSize: 13, color: AppColors.textMuted, marginTop: 2 },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  selectBtnActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  selectBtnText: { fontSize: 12, fontWeight: "600", color: AppColors.textMuted },
  selectBtnTextActive: { color: "#fff" },
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
  alertStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  alertChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  alertChipText: { fontSize: 11, fontWeight: "600", color: "#8B5CF6" },
  // Wrapper có padding ngoài ScrollView — ScrollView ngang không được co lại trong
  // flex column, nếu không chip sẽ bị cắt (overflow hidden) ở giữa.
  chipsWrap: { paddingBottom: 12 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    // Chiều cao cố định để mọi chip bằng nhau, không phụ thuộc có badge hay không.
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  chipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  // Font size / weight giống nhau cho mọi chip — chỉ đổi màu để phân biệt trạng thái.
  chipText: { fontSize: 13, color: AppColors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  chipBadge: {
    backgroundColor: "#EF4444",
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    borderRadius: 9,
    alignItems: "center",
  },
  chipBadgeText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  // Advanced filters
  advancedWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppColors.textMuted,
    flex: 1,
  },
  advancedBody: {
    backgroundColor: AppColors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: 12,
    gap: 12,
  },
  filterGroup: { gap: 6 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: borderRadius.sm,
    backgroundColor: AppColors.background,
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: AppColors.text,
    paddingVertical: 0,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: AppColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  miniChip: {
    justifyContent: "center",
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.background,
  },
  miniChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  miniChipText: { fontSize: 12, fontWeight: "500", color: AppColors.textMuted },
  miniChipTextActive: { color: "#fff", fontWeight: "600" },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.background,
  },
  toggleText: { fontSize: 12, fontWeight: "500", color: AppColors.textMuted },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  resetText: { fontSize: 12, fontWeight: "600", color: AppColors.primary },
  // Bulk bar
  bulkBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  bulkCount: { fontSize: 13, fontWeight: "600", color: AppColors.text },
  bulkActions: { flexDirection: "row", gap: 8 },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  bulkApprove: { backgroundColor: "#22C55E", borderColor: "#22C55E" },
  bulkReject: { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" },
  bulkBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
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
  cardSelected: { borderColor: AppColors.primary, borderWidth: 2 },
  selectionIcon: { position: "absolute", right: 12, top: 12, zIndex: 2 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: "600" },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: AppColors.background,
  },
  typeTagText: { fontSize: 10, fontWeight: "600", color: AppColors.textMuted },
  appealTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#EDE9FE",
  },
  appealTagText: { fontSize: 10, fontWeight: "700", color: "#8B5CF6" },
  reportTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  reportTagText: { fontSize: 10, fontWeight: "700", color: "#EF4444" },
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
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  footerText: {
    paddingVertical: 14,
    textAlign: "center",
    fontSize: 12,
    color: AppColors.textMuted,
  },
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
  appealBox: {
    gap: 6,
    backgroundColor: "#EDE9FE",
    padding: 12,
    borderRadius: borderRadius.md,
  },
  appealHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  appealTitle: { fontSize: 12, fontWeight: "700", color: "#8B5CF6" },
  appealReason: { fontSize: 13, lineHeight: 19, color: "#4C1D95" },
  appealDate: { fontSize: 11, color: "#7C3AED" },
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
