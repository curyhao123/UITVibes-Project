/**
 * Story & Reel services
 *
 * Flow tạo story:
 * 1. pickMedia() → chọn ảnh/video local
 * 2. uploadStoryMedia(uri) → upload lên Cloudinary
 * 3. createStory(mediaList) → gửi POST /story với URLs đã có
 */
import { Story, Reel, mockStories, mockReels, User } from "../data/mockData";
import apiClient, { delay } from "./httpClient";
import { getCurrentAccount, getCurrentUser } from "./session";
import {
  BE_StoryFeedItem,
  BE_StoryMediaUploadResponse,
  BE_CreateStoryRequest,
} from "./backendTypes";

/** Chuyển đổi BE_StoryFeedItem → Story interface dùng trong UI */
function transformBEStory(s: BE_StoryFeedItem): Story {
  return {
    id: s.id,
    user: {
      id: s.userId,
      username: "",
      displayName: s.displayName,
      avatar: s.avatarUrl || "",
      bio: "",
      followers: 0,
      following: 0,
      posts: 0,
      isVerified: false,
    } as User,
    isViewed: s.isViewed,
    // previewUrl = ảnh đầu tiên trong story group
    images: s.previewUrl ? [s.previewUrl] : [],
  };
}

/** Lấy danh sách story đang hoạt động cho feed */
export async function getStories(): Promise<Story[]> {
  try {
    const { data } = await apiClient.get<BE_StoryFeedItem[]>("/story/active", {
      params: { limit: 20 },
    });
    return data.map(transformBEStory);
  } catch {
    await delay(300);
    if (getCurrentAccount() === "newUser") return [];
    return [...mockStories];
  }
}

/** Upload một media lên Cloudinary cho story */
export async function uploadStoryMedia(
  uri: string,
  type: "image" | "video" = "image",
): Promise<BE_StoryMediaUploadResponse> {
  const formData = new FormData();

  if (uri.startsWith("file://") || uri.startsWith("content://")) {
    const name = uri.split("/").pop() || (type === "video" ? "video.mp4" : "image.jpg");
    const mimeType = type === "video" ? "video/mp4" : "image/jpeg";
    (formData as any).append("File", { uri, type: mimeType, name } as any);
  } else if (typeof fetch !== "undefined" && (uri.startsWith("blob:") || uri.startsWith("data:"))) {
    const res = await fetch(uri);
    const blob = await res.blob();
    const mimeType = blob.type || (type === "video" ? "video/mp4" : "image/jpeg");
    const ext = mimeType.includes("png") ? "png" : type === "video" ? "mp4" : "jpg";
    const name = `story.${ext}`;
    if (typeof File !== "undefined") {
      (formData as any).append("File", new File([blob], name, { type: mimeType }));
    } else {
      (formData as any).append("File", blob as any, name);
    }
  } else {
    throw new Error("Unsupported URI scheme: " + uri);
  }

  const { data } = await apiClient.post<BE_StoryMediaUploadResponse>(
    "/story/media",
    formData as any,
    { headers: { "Content-Type": "multipart/form-data" } as any },
  );
  return data;
}

export interface StoryMediaInput {
  uri: string;
  type: "image" | "video";
}

/** Tạo story: upload media + gửi POST /story */
export async function createStory(
  mediaList: StoryMediaInput[],
  ownerDisplayName: string,
  ownerAvatarUrl: string,
): Promise<Story | null> {
  try {
    // Bước 1: Upload tất cả media lên Cloudinary
    const uploadedMedia = await Promise.all(
      mediaList.map(async (m, index) => {
        const result = await uploadStoryMedia(m.uri, m.type);
        return {
          type: m.type === "video" ? 1 : 0,
          url: result.url,
          publicId: result.publicId,
          thumbnailUrl: result.thumbnailUrl,
          displayOrder: index,
          duration: result.duration,
        };
      }),
    );

    // Bước 2: Tạo story với URLs đã có
    const body: BE_CreateStoryRequest = {
      ownerDisplayName,
      ownerAvatarUrl,
      media: uploadedMedia,
    };

    await apiClient.post("/story", body);

    // Tạo mock Story object cho UI (vì API không trả về feed item)
    const currentUser = getCurrentUser();
    return {
      id: `story-${Date.now()}`,
      user: {
        id: currentUser?.id || "current",
        username: "",
        displayName: ownerDisplayName,
        avatar: ownerAvatarUrl,
        bio: "",
        followers: 0,
        following: 0,
        posts: 0,
        isVerified: false,
      } as User,
      isViewed: false,
      images: uploadedMedia.map((m) => m.url),
    };
  } catch {
    await delay(500);
    return null;
  }
}

/** Đánh dấu đã xem story item (item ID, không phải group ID) */
export async function markStoryViewed(storyItemId: string): Promise<void> {
  try {
    await apiClient.post(`/story/${storyItemId}/view`);
  } catch {
    await delay(100);
    const story = mockStories.find((s) => s.id === storyItemId);
    if (story) story.isViewed = true;
  }
}

/** Xóa story group của user hiện tại */
export async function deleteMyStory(storyGroupId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/story/${storyGroupId}`);
    return true;
  } catch {
    await delay(200);
    return false;
  }
}

// ============= REELS (chưa có backend — dùng mock) =============

export async function getReels(): Promise<Reel[]> {
  await delay(300);
  return [...mockReels];
}

export async function toggleReelLike(reelId: string): Promise<boolean> {
  await delay(100);
  const reel = mockReels.find((r) => r.id === reelId);
  if (reel) {
    reel.isLiked = !reel.isLiked;
    reel.likes += reel.isLiked ? 1 : -1;
    return reel.isLiked;
  }
  return false;
}

export async function toggleReelBookmark(reelId: string): Promise<boolean> {
  await delay(100);
  const reel = mockReels.find((r) => r.id === reelId);
  if (reel) {
    reel.isBookmarked = !reel.isBookmarked;
    return reel.isBookmarked;
  }
  return false;
}
