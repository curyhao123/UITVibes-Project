/**
 * Online Tracking Service — REST API integration for the MessageService's
 * online-tracking controller.
 *
 * Endpoints:
 *  - GET  /message/onlinetracking/online-friends  → List<OnlineFriendDto>
 *  - POST /message/onlinetracking/online-users     → List<Guid> (online subset)
 */

import apiClient from "./httpClient";

const GW = "/message";

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface OnlineFriendDto {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
}

export interface GetOnlineUsersRequest {
  userIds: string[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /message/onlinetracking/online-friends
 *
 * Returns all friends (mutual follows) with their current online status.
 * The server internally calls RabbitMQ → UserService → GetFriendListsAsync
 * and merges with Redis online data.
 */
export async function getOnlineFriends(
  skip = 0,
  take = 50
): Promise<OnlineFriendDto[]> {
  const { data } = await apiClient.get<OnlineFriendDto[]>(
    `${GW}/onlinetracking/online-friends`,
    { params: { skip, take } }
  );
  return data;
}

/**
 * POST /message/onlinetracking/online-users
 *
 * Given a list of user IDs, returns only those who are currently online.
 * Useful for batch-checking members of a conversation.
 */
export async function getOnlineUsers(
  userIds: string[]
): Promise<string[]> {
  const { data } = await apiClient.post<string[]>(
    `${GW}/onlinetracking/online-users`,
    { userIds } as GetOnlineUsersRequest
  );
  return data;
}
