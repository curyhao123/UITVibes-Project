/**
 * Story service — integrates with PostService backend.
 *
 * Backend API contract (PostService StoryController):
 *   GET  /post/story/active?limit=20        → BE_StoryFeedItem[]
 *   POST /post/story (multipart/form-data)   → BE_StoryDetailResponse
 *   GET  /post/story/{storyGroupId}          → BE_StoryDetailResponse
 *   POST /post/story/{storyItemId}/view      → 204 No Content
 *   DELETE /post/story/{storyGroupId}        → 204 No Content
 *
 * All endpoints except GET /active require auth (X-User-Id header injected
 * by the API gateway from the JWT Bearer token).
 */
import apiClient, { delay } from "./httpClient";
import { getCurrentUserId } from "./session";
import {
  BE_StoryFeedItem,
  BE_StoryDetailResponse,
} from "./backendTypes";

// ============================================================
// UI-LEVEL STORY TYPE
// (local shape used by StoryBar, story viewer, AppContext)
// ============================================================

export interface Story {
  id: string;
  userId: string;
  username: string;        // same as displayName (BE denormalizes displayName only)
  displayName: string;
  avatar: string;
  expiresAt: string;
  createdAt: string;
  isViewed: boolean;
  previewUrl: string;
  totalItems: number;
  items?: StoryItem[];      // only populated when fetching single story detail
}

export interface StoryItem {
  id: string;
  type: 0 | 1;             // 0 = image, 1 = video
  url: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  duration: number | null;
  createdAt: string;
}

// ============================================================
// TRANSFORM HELPERS
// ============================================================

function transformFeedItem(s: BE_StoryFeedItem): Story {
  return {
    id: s.id,
    userId: s.userId,
    username: s.displayName, // BE only returns displayName
    displayName: s.displayName,
    avatar: s.avatarUrl || "",
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
    isViewed: s.isViewed,
    previewUrl: s.previewUrl || "",
    totalItems: s.totalItems,
  };
}

function transformDetail(s: BE_StoryDetailResponse): Story {
  return {
    id: s.id,
    userId: s.userId,
    username: s.displayName,
    displayName: s.displayName,
    avatar: s.avatarUrl || "",
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
    isViewed: false,
    previewUrl: s.items?.[0]?.url || "",
    totalItems: s.items?.length || 0,
    items: s.items?.map((item) => ({
      id: item.id,
      type: item.type as 0 | 1,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl ?? null,
      displayOrder: item.displayOrder,
      duration: item.duration ?? null,
      createdAt: item.createdAt,
    })),
  };
}

// ============================================================
// API FUNCTIONS
// ============================================================

/** GET /post/story/active — list of active story groups for the feed */
export async function getStories(): Promise<Story[]> {
  try {
    const { data } = await apiClient.get<BE_StoryFeedItem[]>("/post/story/active", {
      params: { limit: 20 },
    });
    return data.map(transformFeedItem);
  } catch {
    await delay(300);
    return [];
  }
}

/** GET /post/story/user/{userId} — all story groups for a specific user (profile page) */
export async function getUserStories(userId: string): Promise<Story[]> {
  try {
    const { data } = await apiClient.get<BE_StoryFeedItem[]>(
      `/post/story/user/${userId}`,
      { params: { limit: 20 } },
    );
    if (!data || !Array.isArray(data)) {
      console.warn("[getUserStories] Expected array, got:", data);
      return [];
    }
    return data.map(transformFeedItem);
  } catch (err: any) {
    console.error("[getUserStories] API error:", err?.response?.status, err?.response?.data, err?.message);
    await delay(200);
    return [];
  }
}

/** GET /post/story/group/{storyGroupId}/items — all items in a story group */
export async function getStoryGroupItems(storyGroupId: string): Promise<StoryItem[]> {
  try {
    const { data } = await apiClient.get<BE_StoryItemDetail[]>(
      `/post/story/group/${storyGroupId}/items`,
    );
    return data.map((item) => ({
      id: item.id,
      type: item.type as 0 | 1,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl ?? null,
      displayOrder: item.displayOrder,
      duration: item.duration ?? null,
      createdAt: item.createdAt,
    }));
  } catch {
    await delay(200);
    return [];
  }
}

/** GET /post/story/{storyGroupId} — full story detail (all items) */
export async function getStoryDetail(storyGroupId: string): Promise<Story | null> {
  try {
    const { data } = await apiClient.get<BE_StoryDetailResponse>(
      `/post/story/${storyGroupId}`,
    );
    return transformDetail(data);
  } catch {
    await delay(200);
    return null;
  }
}

/** POST /post/story — create story (multipart: files + optional displayOrders) */
export async function createStory(
  mediaUris: Array<{ uri: string; type: "image" | "video" }>,
): Promise<Story | null> {
  if (mediaUris.length === 0) return null;

  try {
    const formData = new FormData();

    // Append each file with correct MIME type
    for (const media of mediaUris) {
      const { uri, type } = media;
      const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
      const name = uri.split("/").pop() || (type === "video" ? "video.mp4" : "image.jpg");

      if (typeof File !== "undefined") {
        // Web / React Native with File constructor support
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("Files", new File([blob], name, { type: mimeType }));
      } else {
        // React Native (no File constructor) — object shape works when Content-Type is auto-set
        formData.append("Files", {
          uri,
          type: mimeType,
          name,
        } as unknown as File);
      }
    }

    // DisplayOrders as individual form fields (not a JSON string)
    for (let i = 0; i < mediaUris.length; i++) {
      formData.append("DisplayOrders", String(i));
    }

    // Let axios auto-set Content-Type with correct boundary by passing FormData directly
    const { data } = await apiClient.post<BE_StoryDetailResponse>(
      "/post/story",
      formData,
    );

    return transformDetail(data);
  } catch {
    await delay(300);
    return null;
  }
}

/** POST /post/story/{storyItemId}/view — mark a story item as viewed */
export async function markStoryViewed(storyItemId: string): Promise<void> {
  try {
    await apiClient.post(`/post/story/${storyItemId}/view`);
  } catch {
    await delay(100);
  }
}

/** DELETE /post/story/{storyGroupId} — delete own story group */
export async function deleteMyStory(storyGroupId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/post/story/${storyGroupId}`);
    return true;
  } catch {
    await delay(200);
    return false;
  }
}
