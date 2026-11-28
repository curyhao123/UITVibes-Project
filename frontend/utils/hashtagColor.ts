export const normalizeHashtag = (tag: string): string =>
  tag.trim().replace(/^#+/, '').toLowerCase();

// Same tag always maps to the same palette color, regardless of case or leading '#'.
export function getHashtagColor(tag: string, palette: readonly string[]): string {
  const key = normalizeHashtag(tag);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}
