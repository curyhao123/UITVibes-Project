/**
 * ReportService — thin client for the /user/userprofile/reports gateway route.
 * Authentication: JWT Bearer token is sent via Authorization header (intercepted
 * by httpClient). The YARP gateway reads the JWT claim and injects X-User-Id
 * when forwarding to UserService.
 */
import apiClient from './httpClient';
import {
  BE_ReportUserRequest,
  BE_ReportUserResponse,
  ReportReason,
} from './backendTypes';

/**
 * POST /user/reports — submit a user report.
 * @param targetUserId       The user being reported (GUID)
 * @param reason             One of the predefined ReportReason values
 * @param additionalDetails  Optional free-text description from the user
 */
export async function reportUser(
  targetUserId: string,
  reason: ReportReason,
  additionalDetails?: string,
): Promise<BE_ReportUserResponse> {
  const body: BE_ReportUserRequest = {
    TargetUserId: targetUserId,
    Reason: reason,
    ...(additionalDetails?.trim() ? { AdditionalDetails: additionalDetails.trim() } : {}),
  };
  const res = await apiClient.post<BE_ReportUserResponse>('/user/userprofile/reports', body);
  return res.data;
}

// ─── Post Reports ─────────────────────────────────────────────────────────────────

/** Request body for POST /post/post-report */
export interface ReportPostRequest {
  PostId: string;
  Reason: string;
  AdditionalDetails?: string;
}

/** Response from the post-report endpoint */
export interface ReportPostResponse {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  status: string;
}

/**
 * POST /post/post-report — submit a post report.
 * @param postId  The post being reported
 * @param reason  Free-text reason string
 * @param additionalDetails  Optional free-text description from the user
 */
export async function reportPost(
  postId: string,
  reason: string,
  additionalDetails?: string,
): Promise<ReportPostResponse> {
  const body: ReportPostRequest = {
    PostId: postId,
    Reason: reason,
    ...(additionalDetails?.trim() ? { AdditionalDetails: additionalDetails.trim() } : {}),
  };
  const res = await apiClient.post<ReportPostResponse>('/post/post-report', body);
  return res.data;
}
