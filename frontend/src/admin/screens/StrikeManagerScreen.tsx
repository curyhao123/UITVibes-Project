/**
 * StrikeManagerScreen — Admin view of accounts accumulating strikes.
 *
 * Strike = one confirmed violation. When an admin rejects content, the author
 * gets a strike. Enough strikes → the account gets banned automatically.
 *
 * The backend already exposes everything this screen needs:
 *   GET  /post/moderation/strikes/users      → accounts grouped by strike count
 *   GET  /post/moderation/strikes/{id}/history → full strike history of an account
 *   POST /post/moderation/strikes/{id}/revoke → clear strikes (appeal accepted)
 */
import { borderRadius } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import {
  getStrikeHistory,
  getStrikeUsers,
  revokeStrikes,
  setBanned,
} from "@/services/moderationService";
import type {
  BE_ModerationStrikeEntry,
  BE_ModerationStrikeUser,
} from "@/src/types/admin/strike";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
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

const SEVERITY_LABELS = ["Safe", "Minor", "Clear", "Severe"];
const SEVERITY_COLORS = ["#22C55E", "#F59E0B", "#F97316", "#EF4444"];

const TARGET_TYPE_LABELS: Record<string, string> = {
  Post: "Post",
  Comment: "Comment",
  Reel: "Reel",
  Story: "Story",
  ReelComment: "Reel comment",
};

/** Colour of the strike badge depending on how close the account is to the ban. */
function strikeTone(
  weight: number,
  threshold: number,
): { color: string; bg: string } {
  if (threshold <= 0) return { color: "#718096", bg: "rgba(113,128,150,0.12)" };
  if (weight >= threshold) return { color: "#EF4444", bg: "rgba(239,68,68,0.14)" };
  if (weight >= threshold - 1) return { color: "#F97316", bg: "rgba(249,115,22,0.14)" };
  return { color: "#F59E0B", bg: "rgba(245,158,11,0.14)" };
}

const StrikeUserRow: React.FC<{
  user: BE_ModerationStrikeUser;
  onPress: () => void;
}> = ({ user, onPress }) => {
  const { colors } = useTheme();
  const tone = strikeTone(user.activeStrikeWeight, user.banThreshold);

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={styles.rowAvatarWrap}>
        <Image
          source={
            user.avatarUrl
              ? { uri: user.avatarUrl }
              : require("@/assets/images/UITVibesLogo.png")
          }
          style={[styles.rowAvatar, user.isBanned && styles.rowAvatarBanned]}
        />
        {user.isBanned ? (
          <View style={styles.bannedDot}>
            <Feather name="slash" size={9} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.rowBody}>
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
          {user.displayName || user.userId.slice(0, 8)}
        </Text>

        <View style={styles.rowMetaRow}>
          <View style={[styles.strikeBadge, { backgroundColor: tone.bg }]}>
            <Feather name="alert-triangle" size={10} color={tone.color} />
            <Text style={[styles.strikeBadgeText, { color: tone.color }]}>
              {user.activeStrikeWeight}/{user.banThreshold} strikes
            </Text>
          </View>
          {user.isBanned ? (
            <View style={[styles.bannedTag, { backgroundColor: "rgba(239,68,68,0.14)" }]}>
              <Text style={[styles.bannedTagText, { color: "#EF4444" }]}>Banned</Text>
            </View>
          ) : user.shouldBeBanned ? (
            <View style={[styles.bannedTag, { backgroundColor: "rgba(249,115,22,0.14)" }]}>
              <Text style={[styles.bannedTagText, { color: "#F97316" }]}>Over limit</Text>
            </View>
          ) : null}
        </View>

        {user.lastViolationAt ? (
          <Text style={[styles.rowDate, { color: colors.textMuted }]}>
            Last violation {new Date(user.lastViolationAt).toLocaleDateString()}
          </Text>
        ) : null}
      </View>

      <Feather name="chevron-right" size={16} color={colors.iconMuted} />
    </TouchableOpacity>
  );
};

/** Bottom sheet with the full strike history of one account. */
const StrikeDetailSheet: React.FC<{
  user: BE_ModerationStrikeUser;
  onClose: () => void;
  onRevoked: () => void;
}> = ({ user, onClose, onRevoked }) => {
  const { colors } = useTheme();
  const [history, setHistory] = useState<BE_ModerationStrikeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    let active = true;

    void getStrikeHistory(user.userId, 100).then((entries) => {
      if (active) {
        setHistory(entries);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [user.userId]);

  const handleRevokeAll = () => {
    Alert.alert(
      "Revoke all strikes?",
      `This clears every active strike of ${
        user.displayName || "this account"
      }. Use it when an appeal succeeds or the AI was wrong.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke all",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await revokeStrikes(user.userId, {
                reason: reason.trim() || "Revoked by admin from Strike Manager",
              });
              const entries = await getStrikeHistory(user.userId, 100);
              setHistory(entries);
              onRevoked();
              Alert.alert("Done", "All strikes have been revoked.");
            } catch {
              Alert.alert("Error", "Could not revoke strikes. Please try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleRevokeOne = (entry: BE_ModerationStrikeEntry) => {
    setBusy(true);
    void revokeStrikes(user.userId, {
      strikeId: entry.id,
      reason: reason.trim() || "Revoked by admin from Strike Manager",
    })
      .then(async () => {
        const entries = await getStrikeHistory(user.userId, 100);
        setHistory(entries);
        onRevoked();
      })
      .catch(() => Alert.alert("Error", "Could not revoke this strike."))
      .finally(() => setBusy(false));
  };

  const handleBanToggle = () => {
    const nextBanned = !user.isBanned;

    Alert.alert(
      nextBanned ? "Ban account?" : "Unban account?",
      nextBanned
        ? `${
            user.displayName || "This account"
          } will not be able to log in until you unban it. Strikes are kept.`
        : `${
            user.displayName || "This account"
          } will be able to log in again. Strikes are kept, so it may be banned again once it reaches the limit.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextBanned ? "Ban" : "Unban",
          style: nextBanned ? "destructive" : "default",
          onPress: async () => {
            setBusy(true);
            try {
              await setBanned(
                user.userId,
                nextBanned,
                reason.trim() ||
                  (nextBanned
                    ? "Banned by admin from Strike Manager"
                    : "Unbanned by admin from Strike Manager"),
              );
              onRevoked();
              Alert.alert(
                "Done",
                nextBanned ? "Account has been banned." : "Account has been unbanned.",
              );
            } catch {
              Alert.alert(
                "Error",
                nextBanned
                  ? "Could not ban this account."
                  : "Could not unban this account.",
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const activeCount = history.filter((h) => !h.isRevoked).length;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Strike history
            </Text>
            <TouchableOpacity onPress={onClose} disabled={busy}>
              <Feather name="x" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
          >
            {/* Account summary */}
            <View style={[styles.summaryCard, { borderColor: colors.border }]}>
              <Image
                source={
                  user.avatarUrl
                    ? { uri: user.avatarUrl }
                    : require("@/assets/images/UITVibesLogo.png")
                }
                style={styles.summaryAvatar}
              />
              <View style={styles.summaryBody}>
                <Text style={[styles.summaryName, { color: colors.text }]}>
                  {user.displayName || user.userId.slice(0, 8)}
                </Text>
                <Text style={[styles.summaryMeta, { color: colors.textMuted }]}>
                  {activeCount} active · {user.activeStrikeWeight}/
                  {user.banThreshold} weight
                </Text>
                {user.isBanned ? (
                  <View style={styles.summaryBannedTag}>
                    <Feather name="slash" size={10} color="#EF4444" />
                    <Text style={styles.summaryBannedTagText}>
                      Banned — cannot log in
                    </Text>
                  </View>
                ) : user.shouldBeBanned ? (
                  <View style={styles.summaryOverTag}>
                    <Feather name="alert-triangle" size={10} color="#F97316" />
                    <Text style={styles.summaryOverTagText}>
                      Over the limit — ban pending
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Progress towards the ban threshold */}
            <View style={styles.progressBlock}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                  Progress to ban
                </Text>
                <Text style={[styles.progressValue, { color: colors.text }]}>
                  {user.activeStrikeWeight}/{user.banThreshold}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: strikeTone(
                        user.activeStrikeWeight,
                        user.banThreshold,
                      ).color,
                      width: `${
                        user.banThreshold > 0
                          ? Math.min(
                              100,
                              (user.activeStrikeWeight / user.banThreshold) * 100,
                            )
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Revoke reason */}
            <View style={styles.block}>
              <Text style={[styles.blockLabel, { color: colors.textMuted }]}>
                Reason (recorded for audit)
              </Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  { borderColor: colors.border, color: colors.text },
                ]}
                placeholder="e.g. Appeal accepted — AI false positive"
                placeholderTextColor={colors.textMuted}
                value={reason}
                onChangeText={setReason}
                maxLength={300}
                editable={!busy}
                multiline
              />
            </View>

            {/* History list */}
            <View style={styles.block}>
              <Text style={[styles.blockLabel, { color: colors.textMuted }]}>
                History ({history.length})
              </Text>

              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : history.length === 0 ? (
                <Text style={[styles.emptyHistoryText, { color: colors.textMuted }]}>
                  No strikes recorded for this account.
                </Text>
              ) : (
                history.map((entry) => (
                  <View
                    key={entry.id}
                    style={[
                      styles.historyRow,
                      {
                        borderColor: colors.border,
                        backgroundColor: entry.isRevoked
                          ? "rgba(113,128,150,0.07)"
                          : "transparent",
                      },
                    ]}
                  >
                    <View style={styles.historyMain}>
                      <View style={styles.historyTopRow}>
                        <Text
                          style={[
                            styles.historyType,
                            { color: colors.text },
                          ]}
                        >
                          {TARGET_TYPE_LABELS[entry.targetType] ?? entry.targetType}
                        </Text>
                        {entry.isRevoked ? (
                          <View style={styles.revokedTag}>
                            <Text style={styles.revokedTagText}>Revoked</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.historyMeta, { color: colors.textMuted }]}>
                        {new Date(entry.createdAt).toLocaleString()} ·{" "}
                        {entry.issuedBy === "Admin" ? "By admin" : "By system"}
                        {entry.reasonCode ? ` · ${entry.reasonCode}` : ""}
                      </Text>
                    </View>

                    <View style={styles.historyRight}>
                      <View
                        style={[
                          styles.severityBadge,
                          {
                            borderColor:
                              SEVERITY_COLORS[
                                Math.min(Math.max(entry.severity, 0), 3)
                              ],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            {
                              color:
                                SEVERITY_COLORS[
                                  Math.min(Math.max(entry.severity, 0), 3)
                                ],
                            },
                          ]}
                        >
                          {SEVERITY_LABELS[
                            Math.min(Math.max(entry.severity, 0), 3)
                          ]}
                        </Text>
                      </View>

                      {!entry.isRevoked ? (
                        <TouchableOpacity
                          onPress={() => handleRevokeOne(entry)}
                          disabled={busy}
                          style={styles.revokeOneBtn}
                        >
                          <Feather name="rotate-ccw" size={13} color="#EF4444" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                user.isBanned ? styles.unbanBtn : styles.banBtn,
              ]}
              onPress={handleBanToggle}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather
                    name={user.isBanned ? "rotate-ccw" : "slash"}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.banBtnText}>
                    {user.isBanned ? "Unban account" : "Ban account"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.revokeAllBtn]}
              onPress={handleRevokeAll}
              disabled={busy || activeCount === 0}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="rotate-ccw" size={16} color="#fff" />
                  <Text style={styles.revokeAllBtnText}>Revoke all strikes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function StrikeManagerScreen() {
  const { colors } = useTheme();
  const [users, setUsers] = useState<BE_ModerationStrikeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<BE_ModerationStrikeUser | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getStrikeUsers(100);
      setUsers(data);
    } catch (err) {
      console.error("[StrikeManager] fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const overLimit = users.filter((u) => u.shouldBeBanned).length;
  const banned = users.filter((u) => u.isBanned).length;

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Strike Manager
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          Accounts with confirmed community-guideline violations
        </Text>
      </View>

      {users.length > 0 ? (
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {users.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Flagged
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: "#F97316" }]}>
              {overLimit}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Over limit
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: "#EF4444" }]}>{banned}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Banned
            </Text>
          </View>
        </View>
      ) : null}

      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <StrikeUserRow user={item} onPress={() => setSelected(item)} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="shield" size={48} color={colors.iconMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No accounts have strikes
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Strikes appear here once an admin rejects a piece of content.
            </Text>
          </View>
        }
      />

      {selected ? (
        <StrikeDetailSheet
          user={selected}
          onClose={() => setSelected(null)}
          onRevoked={fetchData}
        />
      ) : null}
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

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  statBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },

  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },

  rowAvatarWrap: {
    position: "relative",
  },

  rowAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  rowAvatarBanned: {
    opacity: 0.45,
  },

  bannedDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  rowBody: {
    flex: 1,
    gap: 4,
  },

  rowName: {
    fontSize: 15,
    fontWeight: "600",
  },

  rowMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

  strikeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },

  strikeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  bannedTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },

  bannedTagText: {
    fontSize: 11,
    fontWeight: "700",
  },

  rowDate: {
    fontSize: 11,
  },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },

  emptyText: {
    fontSize: 15,
    fontWeight: "600",
  },

  emptyHint: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },

  // ── Detail sheet ──
  sheetOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 999,
  },

  sheetBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  sheet: {
    maxHeight: "85%",
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: "hidden",
  },

  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#A0AEC0",
    marginTop: 8,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E4DF",
  },

  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  sheetBody: {
    flexGrow: 0,
  },

  sheetBodyContent: {
    padding: 20,
    gap: 18,
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 12,
  },

  summaryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  summaryBody: {
    flex: 1,
    gap: 3,
  },

  summaryName: {
    fontSize: 16,
    fontWeight: "700",
  },

  summaryMeta: {
    fontSize: 12,
  },

  summaryBannedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "rgba(239,68,68,0.14)",
    marginTop: 2,
  },

  summaryBannedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EF4444",
  },

  summaryOverTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "rgba(249,115,22,0.14)",
    marginTop: 2,
  },

  summaryOverTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F97316",
  },

  progressBlock: {
    gap: 8,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
  },

  progressValue: {
    fontSize: 13,
    fontWeight: "700",
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  block: {
    gap: 8,
  },

  blockLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  reasonInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: "top",
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },

  historyMain: {
    flex: 1,
    gap: 3,
  },

  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  historyType: {
    fontSize: 14,
    fontWeight: "600",
  },

  historyMeta: {
    fontSize: 11,
  },

  revokedTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "rgba(113,128,150,0.16)",
  },

  revokedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#718096",
  },

  historyRight: {
    alignItems: "center",
    gap: 6,
  },

  severityBadge: {
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  severityText: {
    fontSize: 10,
    fontWeight: "700",
  },

  revokeOneBtn: {
    padding: 4,
  },

  emptyHistoryText: {
    fontSize: 13,
  },

  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8E4DF",
  },

  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: borderRadius.md,
  },

  revokeAllBtn: {
    backgroundColor: "#EF4444",
  },

  banBtn: {
    backgroundColor: "#F97316",
  },

  unbanBtn: {
    backgroundColor: "#22C55E",
  },

  banBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  revokeAllBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
