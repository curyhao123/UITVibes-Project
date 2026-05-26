import apiClient from "./httpClient";

export * from "./authService";
export * from "./userService";
export * from "./postService";
export * from "./adminService";
export * from "./reportService";
export {
  getStories,
  getUserStories,
  getStoryDetail,
  getStoryGroupItems,
  createStory,
  markStoryViewed,
  deleteMyStory,
  type Story,
  type StoryItem,
} from "./storyService";
export {
  getUserHighlights,
  getHighlightDetail,
  createHighlightGroup,
  addStoryItemToHighlight,
  deleteHighlightGroup,
  removeHighlightItem,
  type HighlightGroup,
  type HighlightItem,
} from "./highlightService";
export * from "./messageService";
export * from "./onlineTrackingService";
export * from "./notificationService";
export * from "./musicService";
export { patchCurrentUserLocal } from "./session";
export * from "./blockService";

// Backwards-compatible alias for previous getCurrentUser export
export { getCurrentUserProfile as getCurrentUser } from "./userService";

export default apiClient;
