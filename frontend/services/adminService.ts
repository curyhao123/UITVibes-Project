/**
 * Admin Service
 *
 * Wraps admin-only API calls. The backend validates the X-User-Role header
 * automatically — the interceptor already attaches the JWT Bearer token.
 *
 * Admin endpoints (from backend):
 *   GET  /userprofile              → all user profiles (paginated)
 *   GET  /userprofile/reports     → user reports (paginated, filter by status)
 *   GET  /post/post-report        → post reports (paginated, filter by status)
 *   POST /auth/auth/ban-user/{userId}  → ban a user
 *   POST /auth/auth/unban-user/{userId} → unban a user
 */

import apiClient from "./httpClient";
import type {
  BE_AdminUserProfile,
  BE_UserReport,
  BE_PostReport,
  AdminReportStatus,
} from "./backendTypes";

const BASE_USER = "/user/userprofile";
const BASE_POST = "/post";
const BASE_AUTH = "/auth/auth";

export interface PaginatedUsers {
  items: BE_AdminUserProfile[];
  skip: number;
  take: number;
}

export interface PaginatedUserReports {
  items: BE_UserReport[];
  skip: number;
  take: number;
}

export interface PaginatedPostReports {
  items: BE_PostReport[];
  skip: number;
  take: number;
}

// ─── User Management ────────────────────────────────────────────────────────────

/** GET /userprofile?skip=0&take=20 */
export async function getAllUsers(
  skip = 0,
  take = 20,
): Promise<BE_AdminUserProfile[]> {
  const { data } = await apiClient.get<BE_AdminUserProfile[]>(
    `${BASE_USER}`,
    { params: { skip, take } },
  );
  return data;
}

/** GET /userprofile/reports?skip=0&take=20&status=Pending */
export async function getUserReports(
  skip = 0,
  take = 20,
  status?: AdminReportStatus,
): Promise<BE_UserReport[]> {
  const { data } = await apiClient.get<BE_UserReport[]>(
    `${BASE_USER}/reports`,
    { params: { skip, take, ...(status ? { status } : {}) } },
  );
  return data;
}

// ─── Post Reports ──────────────────────────────────────────────────────────────

/** GET /post/post-report?skip=0&take=20&status=Pending */
export async function getPostReports(
  skip = 0,
  take = 20,
  status?: AdminReportStatus,
): Promise<BE_PostReport[]> {
  const { data } = await apiClient.get<BE_PostReport[]>(
    `${BASE_POST}/post-report`,
    { params: { skip, take, ...(status ? { status } : {}) } },
  );
  return data;
}

// ─── Resolve / Reject Reports ───────────────────────────────────────────────────
// The backend does not yet have resolve/reject endpoints.
// These are provided as placeholders so the UI can be wired up when the BE adds them.

export interface ResolveReportBody {
  adminNote?: string;
}

/** PATCH /userprofile/reports/:id/resolve */
export async function resolveUserReport(
  reportId: string,
  body?: ResolveReportBody,
): Promise<void> {
  await apiClient.patch(`${BASE_USER}/reports/${reportId}/resolve`, body ?? {});
}

/** PATCH /userprofile/reports/:id/reject */
export async function rejectUserReport(
  reportId: string,
  body?: ResolveReportBody,
): Promise<void> {
  await apiClient.patch(`${BASE_USER}/reports/${reportId}/reject`, body ?? {});
}

/** PATCH /post/post-report/:id/resolve */
export async function resolvePostReport(
  reportId: string,
  body?: ResolveReportBody,
): Promise<void> {
  await apiClient.patch(`${BASE_POST}/post-report/${reportId}/resolve`, body ?? {});
}

/** PATCH /post/post-report/:id/reject */
export async function rejectPostReport(
  reportId: string,
  body?: ResolveReportBody,
): Promise<void> {
  await apiClient.patch(`${BASE_POST}/post-report/${reportId}/reject`, body ?? {});
}

// ─── Post Visibility Management ─────────────────────────────────────────────────

/**
 * POST /post/{postId}/visibility
 * Change post visibility (Admin can hide any post)
 * @param postId The post to change visibility
 * @param visibility 3 = Hidden, other values = Public/Followers/Private
 */
export async function changePostVisibility(
  postId: string,
  visibility: number,
): Promise<void> {
  await apiClient.post(`${BASE_POST}/${postId}/visibility`, visibility);
}

// ─── Ban / Unban Users ───────────────────────────────────────────────────────

/** POST /auth/auth/ban-user/{userId} */
export async function banUser(userId: string): Promise<void> {
  await apiClient.post(`${BASE_AUTH}/ban-user/${userId}`);
}

/** POST /auth/auth/unban-user/{userId} */
export async function unbanUser(userId: string): Promise<void> {
  await apiClient.post(`${BASE_AUTH}/unban-user/${userId}`);
}
