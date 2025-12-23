import type { User } from "./schema";

interface AlbumWithIds {
  spotifyId?: string | null;
  appleMusicId?: string | null;
}

export function getAlbumExternalUrl(album: AlbumWithIds, user: { musicService?: string | null }): string | null {
  const musicProvider = user.musicService || "spotify";
  
  if (musicProvider === "apple_music" && album.appleMusicId) {
    return `https://music.apple.com/album/${album.appleMusicId}`;
  }
  
  if (album.spotifyId) {
    return `https://open.spotify.com/album/${album.spotifyId}`;
  }
  
  if (album.appleMusicId) {
    return `https://music.apple.com/album/${album.appleMusicId}`;
  }
  
  return null;
}
