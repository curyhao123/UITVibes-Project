/**
 * PostModerationBadge — displays the moderation status of a post.
 *
 * Only rendered when the post is NOT yet approved. For Pending/NeedsReview/Rejected
 * posts, the author needs to know where the post stands and why.
 *
 * The backend only returns moderationReason to the post's author, so this badge
 * stays silent for everyone else.
 */
import { AppColors, borderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ModerationState = "Pending" | "Approved" | "Rejected" | "NeedsReview";

const CONFIG: Record<
  Exclude<ModerationState, "Approved">,
  { label: string; icon: keyof typeof Feather.glyphMap; color: string; bg: string }
> = {
  Pending: {
    label: "Pending review",
    icon: "clock",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  NeedsReview: {
    label: "Awaiting admin review",
    icon: "eye",
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
  Rejected: {
    label: "Post was rejected",
    icon: "x-circle",
    color: "#EF4444",
    bg: "#FEE2E2",
  },
};

interface Props {
  status?: string;
  reason?: string;
}

export const PostModerationBadge: React.FC<Props> = ({ status, reason }) => {
  // Approved (or no status at all) → render nothing.
  if (!status || status === "Approved") return null;

  const key = status as Exclude<ModerationState, "Approved">;
  const cfg = CONFIG[key];
  if (!cfg) return null;

  return (
    <View style={[styles.wrapper, { paddingHorizontal: 16 }]}>
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Feather name={cfg.icon} size={13} color={cfg.color} />
        <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      {reason ? (
        <View style={[styles.reasonBox, { borderLeftColor: cfg.color }]}>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: 10,
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
  reasonBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 2,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 17,
    color: AppColors.textMuted,
  },
});