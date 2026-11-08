/**
 * PostModerationBadge — displays the moderation status of a post.
 *
 * Only rendered when the post is NOT yet approved. For Pending/NeedsReview/Rejected
 * posts, the author needs to know where the post stands and why.
 *
 * The backend only returns moderationReason to the post's author, so this badge
 * stays silent for everyone else.
 *
 * Khi bài bị từ chối, tác giả có 2 lựa chọn:
 *   1. "Edit and resubmit" → sửa nội dung, kiểm duyệt lại từ đầu.
 *   2. "Appeal" → nhờ admin xem xét lại (không tự đảo ngược quyết định của AI).
 */
import { AppColors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ModerationState = "Pending" | "Approved" | "Rejected" | "NeedsReview";

/**
 * Loại nội dung đang hiển thị badge. Dùng để ghép câu thông báo đúng ngữ cảnh:
 * bình luận bị từ chối thì không được ghi "Post was rejected".
 */
type ModerationContentType = "post" | "comment" | "reel" | "story";

const CONTENT_LABEL: Record<ModerationContentType, string> = {
  post: "Post",
  comment: "Comment",
  reel: "Reel",
  story: "Story",
};

const CONFIG: Record<
  Exclude<ModerationState, "Approved">,
  {
    /** Nhãn động — đổi theo loại nội dung (post / comment / reel / story). */
    label: (contentType: ModerationContentType) => string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
    bg: string;
  }
> = {
  Pending: {
    label: () => "Pending review",
    icon: "clock",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  NeedsReview: {
    label: () => "Awaiting admin review",
    icon: "eye",
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
  Rejected: {
    label: (contentType) => `${CONTENT_LABEL[contentType]} was rejected`,
    icon: "x-circle",
    color: "#EF4444",
    bg: "#FEE2E2",
  },
};

interface Props {
  status?: string;
  reason?: string;
  /** Loại nội dung — quyết định cách ghi nhãn ("Post was rejected" / "Comment was rejected" / ...). */
  contentType?: ModerationContentType;
  /** True when the viewer is the author of the post (only the author sees the badge). */
  isAuthor?: boolean;
  /** Opens the edit sheet so the author can fix the content and resubmit. */
  onEdit?: () => void;
  /**
   * Opens the appeal sheet so the author can ask a moderator to review again.
   * Only provided when the post can actually be appealed (i.e. it was rejected).
   */
  onAppeal?: () => void;
  /**
   * Bỏ padding ngang của badge — dùng khi badge được render bên trong một
   * container đã có padding sẵn (ví dụ: bình luận).
   */
  edgeToEdge?: boolean;
}

export const PostModerationBadge: React.FC<Props> = ({
  status,
  reason,
  contentType = "post",
  isAuthor = false,
  onEdit,
  onAppeal,
  edgeToEdge = false,
}) => {
  // Approved (or no status at all) → render nothing.
  if (!status || status === "Approved") return null;

  const key = status as Exclude<ModerationState, "Approved">;
  const cfg = CONFIG[key];
  if (!cfg) return null;

  // Chỉ bài bị từ chối mới cần hành động của tác giả (sửa lại rồi submit,
  // hoặc khiếu nại để admin xem xét lại).
  const isRejected = status === "Rejected";
  const canResubmit = isAuthor && isRejected && !!onEdit;
  const canAppeal = isAuthor && isRejected && !!onAppeal;

  return (
    <View style={[styles.wrapper, !edgeToEdge && { paddingHorizontal: 16 }]}>
      <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
        <Feather name={cfg.icon} size={13} color={cfg.color} />
        <Text style={[styles.label, { color: cfg.color }]}>{cfg.label(contentType)}</Text>
      </View>

      {reason ? (
        <View style={[styles.reasonBox, { borderLeftColor: cfg.color }]}>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      ) : null}

      {canResubmit || canAppeal ? (
        <View style={styles.actionRow}>
          {canResubmit ? (
            <TouchableOpacity
              style={[styles.resubmitBtn, { backgroundColor: cfg.bg }]}
              activeOpacity={0.7}
              onPress={onEdit}
            >
              <Feather name="edit-2" size={13} color={cfg.color} strokeWidth={2} />
              <Text style={[styles.resubmitLabel, { color: cfg.color }]}>
                Edit and resubmit
              </Text>
            </TouchableOpacity>
          ) : null}

          {canAppeal ? (
            <TouchableOpacity
              style={[styles.resubmitBtn, { backgroundColor: "#EDE9FE" }]}
              activeOpacity={0.7}
              onPress={onAppeal}
            >
              <Feather name="flag" size={13} color="#8B5CF6" strokeWidth={2} />
              <Text style={[styles.resubmitLabel, { color: "#8B5CF6" }]}>
                Appeal
              </Text>
            </TouchableOpacity>
          ) : null}
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
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  resubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resubmitLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
});
