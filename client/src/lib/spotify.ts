// Utility functions for Spotify integration

export function openInSpotify(spotifyId: string) {
  const url = `https://open.spotify.com/album/${spotifyId}`;
  window.open(url, '_blank');
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