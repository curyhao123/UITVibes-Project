import {
  Track,
  MusicArtist,
  mockTracks,
  mockMusicArtists,
} from "../data/mockData";
import { delay } from "./httpClient";

export async function getTracks(): Promise<Track[]> {
  await delay(300);
  return [...mockTracks];
}

export async function toggleTrackLike(trackId: string): Promise<boolean> {
  await delay(100);
  const track = mockTracks.find((t) => t.id === trackId);
  if (track) {
    track.isLiked = !track.isLiked;
    track.likes += track.isLiked ? 1 : -1;
    return track.isLiked;
  }
  return false;
}

export async function getMusicArtists(): Promise<MusicArtist[]> {
  await delay(300);
  return [...mockMusicArtists];
}

export async function toggleMusicArtistFollow(
  artistId: string,
): Promise<boolean> {
  await delay(200);
  const artist = mockMusicArtists.find((a) => a.id === artistId);
  if (artist) {
    artist.isFollowing = !artist.isFollowing;
    return artist.isFollowing;
  }
  return false;
}
