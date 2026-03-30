import apiClient from "./httpClient";

export * from "./authService";
export * from "./userService";
export * from "./postService";
export * from "./storyService";
export * from "./messageService";
export * from "./notificationService";
export * from "./musicService";
export { patchCurrentUserLocal } from "./session";

// Backwards-compatible alias for previous getCurrentUser export
export { getCurrentUserProfile as getCurrentUser } from "./userService";

export default apiClient;
