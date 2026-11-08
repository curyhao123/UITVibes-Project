/**
 * Moderation Appeal Service (author-facing)
 *
 * Khi nội dung của bạn bị AI từ chối, bạn có 2 lựa chọn:
 *   1. Sửa nội dung rồi lưu lại → nội dung được kiểm duyệt lại từ đầu.
 *   2. Khiếu nại (appeal) → nội dung chuyển sang vùng chờ admin xem xét.
 *
 * Endpoint trên PostService:
 *   POST /post/moderation-appeal/{moderationResultId}  → gửi khiếu nại
 *   GET  /post/moderation-appeal/{moderationResultId}  → xem trạng thái
 */

import apiClient from "./httpClient";

const BASE = "/post/moderation-appeal";

/** Trạng thái khiếu nại. */
export type AppealStatus = "None" | "Pending" | "Resolved";

export interface ModerationAppealResult {
  moderationResultId: string;
  targetId: string;
  targetType: string;
  appealStatus: AppealStatus;
  appealReason: string | null;
  appealSubmittedAt: string | null;
  appealResolvedAt: string | null;
  moderationStatus: string;
}

/**
 * Gửi khiếu nại cho nội dung bị từ chối.
 * Ném lỗi (reject) nếu backend từ chối — message của lỗi là thông điệp cho người dùng.
 */
export async function submitModerationAppeal(
  moderationResultId: string,
  reason: string,
): Promise<ModerationAppealResult | null> {
  const { data } = await apiClient.post<ModerationAppealResult>(
    `${BASE}/${moderationResultId}`,
    { reason },
  );
  return data ?? null;
}

/** Lấy trạng thái khiếu nại. Trả về null nếu có lỗi. */
export async function getModerationAppeal(
  moderationResultId: string,
): Promise<ModerationAppealResult | null> {
  try {
    const { data } = await apiClient.get<ModerationAppealResult>(
      `${BASE}/${moderationResultId}`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Trích xuất message từ lỗi axios để hiển thị cho người dùng.
 */
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const maybeAxios = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return (
    maybeAxios?.response?.data?.message ?? maybeAxios?.message ?? fallback
  );
}
