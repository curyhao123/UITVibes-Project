import AsyncStorage from '@react-native-async-storage/async-storage';

export type ContentVisibility = 'Public' | 'Followers' | 'Private';
export type ContentType = 'post' | 'reels';

export const CONTENT_VISIBILITY_OPTIONS: ContentVisibility[] = [
  'Public',
  'Followers',
  'Private',
];

const DEFAULT_VISIBILITY: ContentVisibility = 'Public';
const STORAGE_KEYS: Record<ContentType, string> = {
  post: 'uitvibes.content.defaultPostVisibility',
  reels: 'uitvibes.content.defaultReelVisibility',
};

function normalizeVisibility(value: string | null): ContentVisibility {
  return CONTENT_VISIBILITY_OPTIONS.includes(value as ContentVisibility)
    ? (value as ContentVisibility)
    : DEFAULT_VISIBILITY;
}

export async function getDefaultContentVisibility(
  type: ContentType,
): Promise<ContentVisibility> {
  const value = await AsyncStorage.getItem(STORAGE_KEYS[type]);
  return normalizeVisibility(value);
}

export async function getDefaultContentVisibilities(): Promise<
  Record<ContentType, ContentVisibility>
> {
  const [post, reels] = await Promise.all([
    getDefaultContentVisibility('post'),
    getDefaultContentVisibility('reels'),
  ]);

  return { post, reels };
}

export async function setDefaultContentVisibility(
  type: ContentType,
  visibility: ContentVisibility,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS[type], visibility);
}

export function contentVisibilityToApiValue(visibility: ContentVisibility): number {
  if (visibility === 'Followers') return 1;
  if (visibility === 'Private') return 2;
  return 0;
}
