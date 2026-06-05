/**
 * Module-level user cache for Reels screen.
 * This cache stores user data to avoid re-fetching on every reel transform.
 * Must be cleared when follow state changes to ensure correct follow button display.
 */

import type { User } from '../data/mockData';

export const reelsUserCache: Map<string, User> = new Map();

export function clearReelsUserCache(): void {
  reelsUserCache.clear();
}
