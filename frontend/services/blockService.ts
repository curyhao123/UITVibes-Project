/**
 * BlockService — thin client for the /user/block/* gateway routes.
 * Authentication: JWT Bearer token is sent via Authorization header (intercepted
 * by httpClient). The YARP gateway reads the JWT claim and injects X-User-Id
 * when forwarding to UserService.
 */
import apiClient from "./httpClient";

export interface BlockDto {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface BlockListDto {
  blockedId: string;
  blockedAt: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
}

export interface BlockStatusDto {
  blockedByMe: boolean;
  blockedMe: boolean;
}

/** Normalize raw API response to frontend BlockListDto — handles camelCase and PascalCase */
function normalizeBlockListItem(raw: Record<string, unknown>): BlockListDto {
  const blockedId =
    typeof raw.blockedId === 'string'
      ? raw.blockedId
      : typeof raw.blockedUserId === 'string'
        ? raw.blockedUserId
        : typeof (raw as { BlockedUserId?: string }).BlockedUserId === 'string'
          ? (raw as { BlockedUserId: string }).BlockedUserId
          : '';
  const blockedAt =
    typeof raw.blockedAt === 'string'
      ? raw.blockedAt
      : typeof (raw as { BlockedAt?: string }).BlockedAt === 'string'
        ? (raw as { BlockedAt: string }).BlockedAt
        : new Date().toISOString();
  const displayName =
    (raw.displayName as string) ||
    (raw.DisplayName as string) ||
    '';
  const username =
    (raw.username as string) ||
    (raw.Username as string) ||
    displayName.replace(/\s+/g, '').toLowerCase();
  const avatarUrl =
    (raw.avatarUrl as string | null) ||
    (raw.AvatarUrl as string | null) ||
    null;
  const bio =
    (raw.bio as string) ||
    (raw.Bio as string) ||
    '';
  return { blockedId, blockedAt, displayName, username, avatarUrl, bio };
}

/** POST /user/block/{blockedId} — block a user */
export async function blockUser(blockedId: string): Promise<BlockDto> {
  const res = await apiClient.post<BlockDto>(`/user/block/${blockedId}`);
  return res.data;
}

/** DELETE /user/block/{blockedId} — unblock a user */
export async function unblockUser(blockedId: string): Promise<void> {
  await apiClient.delete(`/user/block/${blockedId}`);
}

/** GET /user/block — list all blocked users */
export async function getBlockedUsers(
  skip = 0,
  take = 50,
): Promise<BlockListDto[]> {
  const res = await apiClient.get<Record<string, unknown>[] | BlockListDto[]>('/user/block', {
    params: { skip, take },
  });
  return res.data.map((item) =>
    typeof item === 'object' && item !== null
      ? normalizeBlockListItem(item as Record<string, unknown>)
      : (item as BlockListDto),
  );
}

/** GET /user/block/{blockedId}/is-blocked */
export async function checkIsBlocked(blockedId: string): Promise<boolean> {
  const res = await apiClient.get<{ isBlocked: boolean }>(
    `/user/block/${blockedId}/is-blocked`,
  );
  return res.data.isBlocked;
}

/** GET /user/block/{userId}/status */
export async function getBlockStatus(userId: string): Promise<BlockStatusDto> {
  const res = await apiClient.get<Record<string, unknown>>(
    `/user/block/${userId}/status`,
  );
  const data = res.data as {
    blockedByMe?: boolean;
    blockedMe?: boolean;
    BlockedByMe?: boolean;
    BlockedMe?: boolean;
  };
  return {
    blockedByMe: data.blockedByMe ?? data.BlockedByMe ?? false,
    blockedMe: data.blockedMe ?? data.BlockedMe ?? false,
  };
}
