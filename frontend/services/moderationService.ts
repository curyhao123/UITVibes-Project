/**
 * Moderation Service (admin)
 *
 * Calls the admin moderation queue endpoints on PostService:
 *   GET  /post/moderation              → moderation records (with filters)
 *   GET  /post/moderation/paged        → moderation records + total (pagination)
 *   GET  /post/moderation/stats        → aggregate stats
 *   GET  /post/moderation/{id}         → a single record
 *   POST /post/moderation/{id}/approve → admin approves
 *   POST /post/moderation/{id}/reject  → admin rejects
 *   POST /post/moderation/bulk         → approve/reject many at once
 *
 * The backend enforces the "X-User-Role: Admin" header (the gateway forwards it
 * from the "role" claim in the JWT), so no role needs to be sent manually here.
 */

import apiClient from "./httpClient";
import type {
  BE_BulkModerationResult,
  BE_ModerationPagedResult,
  BE_ModerationResult,
  BE_ModerationStats,
  ModerationQueryParams,
} from "@/src/types/admin/moderation";

const BASE = "/post/moderation";

/**
 * Fetch moderation records.
 * Returns an empty array on error — same pattern as the other admin helpers.
 */
export async function getModerationResults(
  params: ModerationQueryParams = {},
): Promise<BE_ModerationResult[]> {
  try {
    const { data } = await apiClient.get<BE_ModerationResult[]>(BASE, {
      params: buildQueryParams(params),
    });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("[getModerationResults] error:", err);
    return [];
  }
}

/**
 * Fetch a page of moderation records together with the total count.
 * This is what the admin queue uses so it can paginate and show backlog size.
 */
export async function getModerationResultsPaged(
  params: ModerationQueryParams = {},
): Promise<BE_ModerationPagedResult | null> {
  try {
    const { data } = await apiClient.get<BE_ModerationPagedResult>(
      `${BASE}/paged`,
      { params: buildQueryParams(params) },
    );
    return data ?? null;
  } catch (err) {
    console.error("[getModerationResultsPaged] error:", err);
    return null;
  }
}

/** Aggregate stats for the dashboard. */
export async function getModerationStats(
  targetType?: string,
): Promise<BE_ModerationStats | null> {
  try {
    const { data } = await apiClient.get<BE_ModerationStats>(
      `${BASE}/stats`,
      { params: targetType ? { targetType } : {} },
    );
    return data ?? null;
  } catch (err) {
    console.error("[getModerationStats] error:", err);
    return null;
  }
}

/** Details of a single moderation record. */
export async function getModerationResult(
  id: string,
): Promise<BE_ModerationResult | null> {
  try {
    const { data } = await apiClient.get<BE_ModerationResult>(`${BASE}/${id}`);
    return data ?? null;
  } catch (err) {
    console.error("[getModerationResult] error:", err);
    return null;
  }
}

/** Admin approves the content. */
export async function approveModeration(
  id: string,
  adminNote?: string,
): Promise<BE_ModerationResult | null> {
  try {
    const { data } = await apiClient.post<BE_ModerationResult>(
      `${BASE}/${id}/approve`,
      { adminNote: adminNote ?? null },
    );
    return data ?? null;
  } catch (err) {
    console.error("[approveModeration] error:", err);
    throw err;
  }
}

/** Admin rejects the content. */
export async function rejectModeration(
  id: string,
  adminNote?: string,
): Promise<BE_ModerationResult | null> {
  try {
    const { data } = await apiClient.post<BE_ModerationResult>(
      `${BASE}/${id}/reject`,
      { adminNote: adminNote ?? null },
    );
    return data ?? null;
  } catch (err) {
    console.error("[rejectModeration] error:", err);
    throw err;
  }
}

/**
 * Approve or reject many records at once.
 * Records that can no longer be actioned are reported in `failures`.
 */
export async function bulkModeration(
  ids: string[],
  action: "approve" | "reject",
  adminNote?: string,
): Promise<BE_BulkModerationResult | null> {
  try {
    const { data } = await apiClient.post<BE_BulkModerationResult>(
      `${BASE}/bulk`,
      {
        ids,
        action,
        adminNote: adminNote ?? null,
      },
    );
    return data ?? null;
  } catch (err) {
    console.error("[bulkModeration] error:", err);
    throw err;
  }
}

/** Build the query string shared by the list and paged endpoints. */
function buildQueryParams(params: ModerationQueryParams) {
  return {
    skip: params.skip ?? 0,
    take: params.take ?? 20,
    ...(params.status ? { status: params.status } : {}),
    ...(params.targetType ? { targetType: params.targetType } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(params.orderByUpdatedAt ? { orderByUpdatedAt: true } : {}),
    ...(params.orderBySeverity ? { orderBySeverity: true } : {}),
    ...(params.orderByPriority ? { orderByPriority: true } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(params.minReportCount != null
      ? { minReportCount: params.minReportCount }
      : {}),
    ...(params.onlyWithAppeal ? { onlyWithAppeal: true } : {}),
    ...(params.minSeverity != null ? { minSeverity: params.minSeverity } : {}),
    ...(params.minConfidence != null
      ? { minConfidence: params.minConfidence }
      : {}),
    ...(params.fromUtc ? { fromUtc: params.fromUtc } : {}),
    ...(params.toUtc ? { toUtc: params.toUtc } : {}),
    ...(params.authorId ? { authorId: params.authorId } : {}),
  };
}
