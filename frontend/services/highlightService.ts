/**
 * Highlight service — Instagram-like Highlights system.
 *
 * Backend API contract (PostService HighlightController):
 *   POST /post/highlight/group              → HighlightGroupDto
 *   POST /post/highlight/{groupId}/item     → HighlightGroupDto
 *   GET  /post/highlight/user/{userId}     → HighlightGroupSummaryDto[]
 *   GET  /post/highlight/{groupId}         → HighlightGroupDto
 *   DELETE /post/highlight/{groupId}        → 204
 *   DELETE /post/highlight/{groupId}/item/{itemId} → 204
 *
 * All endpoints except GET user/{userId} require auth.
 */
import apiClient, { delay } from "./httpClient";

// ============================================================
// UI-LEVEL TYPES
// ============================================================

export interface HighlightItem {
  id: string;
  storyItemId: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  mediaType: 0 | 1;
  createdAt: string;
}

export interface HighlightGroup {
  id: string;
  userId: string;
  title: string;
  coverImage: string | null;
  itemCount: number;
  createdAt: string;
  items?: HighlightItem[];
}

// ============================================================
// API FUNCTIONS
// ============================================================

/** GET /post/highlight/user/{userId} — list all highlights for a user profile */
export async function getUserHighlights(userId: string): Promise<HighlightGroup[]> {
  try {
    const { data } = await apiClient.get<BE_HighlightGroupSummary[]>(
      `/post/highlight/user/${userId}`,
    );
    return data.map(transformSummary);
  } catch {
    await delay(200);
    return [];
  }
}

/** GET /post/highlight/{groupId} — full highlight group detail */
export async function getHighlightDetail(groupId: string): Promise<HighlightGroup | null> {
  try {
    const { data } = await apiClient.get<BE_HighlightGroupDetail>(
      `/post/highlight/${groupId}`,
    );
    return transformDetail(data);
  } catch {
    await delay(200);
    return null;
  }
}

/** POST /post/highlight/group — create a new highlight group */
export async function createHighlightGroup(
  title: string,
  coverImage?: string,
): Promise<HighlightGroup | null> {
  try {
    const { data } = await apiClient.post<BE_HighlightGroupDetail>(
      "/post/highlight/group",
      { title: title.trim(), coverImage: coverImage ?? null },
    );
    return transformDetail(data);
  } catch {
    await delay(200);
    return null;
  }
}

/** POST /post/highlight/{groupId}/item — add a story item to a highlight group */
export async function addStoryItemToHighlight(
  groupId: string,
  storyItemId: string,
): Promise<HighlightGroup | null> {
  try {
    const { data } = await apiClient.post<BE_HighlightGroupDetail>(
      `/post/highlight/${groupId}/item`,
      { storyItemId },
    );
    return transformDetail(data);
  } catch {
    await delay(200);
    return null;
  }
}

/** DELETE /post/highlight/{groupId} — delete a highlight group */
export async function deleteHighlightGroup(groupId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/post/highlight/${groupId}`);
    return true;
  } catch {
    await delay(200);
    return false;
  }
}

/** DELETE /post/highlight/{groupId}/item/{itemId} — remove an item from a highlight group */
export async function removeHighlightItem(
  groupId: string,
  itemId: string,
): Promise<boolean> {
  try {
    await apiClient.delete(`/post/highlight/${groupId}/item/${itemId}`);
    return true;
  } catch {
    await delay(200);
    return false;
  }
}

// ============================================================
// TRANSFORM HELPERS
// ============================================================

function transformSummary(s: BE_HighlightGroupSummary): HighlightGroup {
  return {
    id: s.id,
    userId: s.userId ?? "",
    title: s.title,
    coverImage: s.coverImage ?? null,
    itemCount: s.itemCount,
    createdAt: "",
    items: [],
  };
}

function transformDetail(d: BE_HighlightGroupDetail): HighlightGroup {
  return {
    id: d.id,
    userId: d.userId,
    title: d.title,
    coverImage: d.coverImage ?? null,
    itemCount: d.itemCount,
    createdAt: d.createdAt,
    items: (d.items ?? []).map((item) => ({
      id: item.id,
      storyItemId: item.storyItemId,
      mediaUrl: item.mediaUrl ?? null,
      thumbnailUrl: item.thumbnailUrl ?? null,
      mediaType: (item.mediaType ?? 0) as 0 | 1,
      createdAt: item.createdAt,
    })),
  };
}

// ============================================================
// BACKEND RESPONSE TYPES (raw shapes from API)
// ============================================================

interface BE_HighlightGroupSummary {
  id: string;
  userId?: string;
  title: string;
  coverImage: string | null;
  itemCount: number;
}

interface BE_HighlightGroupDetail {
  id: string;
  userId: string;
  title: string;
  coverImage: string | null;
  itemCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    storyItemId: string;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    mediaType: number;
    createdAt: string;
  }>;
}
