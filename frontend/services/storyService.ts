import { Story, Reel, mockStories, mockReels, User } from "../data/mockData";
import apiClient, { delay } from "./httpClient";
import { getCurrentAccount } from "./session";

export async function getStories(): Promise<Story[]> {
  try {
    const { data } = await apiClient.get<
      Array<{
        id: string;
        userId: string;
        displayName: string;
        avatarUrl: string;
        mediaUrls: string[];
        isViewed: boolean;
      }>
    >("/story/active", { params: { limit: 20 } });

    return data.map((s) => ({
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
      images: s.mediaUrls,
    }));
  } catch {
    await delay(300);
    if (getCurrentAccount() === "newUser") return [];
    return [...mockStories];
  }
}

export async function markStoryViewed(storyId: string): Promise<void> {
  try {
    await apiClient.post(`/story/${storyId}/view`);
  } catch {
    await delay(100);
    const story = mockStories.find((s) => s.id === storyId);
    if (story) story.isViewed = true;
  }
}

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
