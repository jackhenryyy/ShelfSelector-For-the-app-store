// Utility functions for Spotify integration

export function openInSpotify(spotifyId: string) {
  const url = `https://open.spotify.com/album/${spotifyId}`;
  window.open(url, '_blank');
}

export function openInAppleMusic(appleMusicId: string) {
  const url = `https://music.apple.com/album/${appleMusicId}`;
  window.open(url, '_blank');
}

export function openInMusicService(album: { spotifyId?: string | null; appleMusicId?: string | null }) {
  if (album.appleMusicId) {
    openInAppleMusic(album.appleMusicId);
  } else if (album.spotifyId) {
    openInSpotify(album.spotifyId);
  }
}

export async function processAndSaveAlbum(albumData: any) {
  const response = await fetch('/api/spotify/albums/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(albumData),
  });

  if (!response.ok) {
    throw new Error('Failed to process album');
  }

  return response.json();
}

export function generateShareableLink(userId: number) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/${userId}`;
}