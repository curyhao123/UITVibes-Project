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
