/**
 * Opens a Spotify album in the Spotify app or web player
 */
export function openInSpotify(spotifyId: string) {
  // Try to open the Spotify app first
  const spotifyUri = `spotify:album:${spotifyId}`;
  
  // Create a hidden iframe to try opening the Spotify URI
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = spotifyUri;
  document.body.appendChild(iframe);
  
  // After a short timeout, if the Spotify app didn't open, redirect to the web player
  setTimeout(() => {
    document.body.removeChild(iframe);
    window.open(`https://open.spotify.com/album/${spotifyId}`, '_blank');
  }, 500);
}

/**
 * Generates a shareable link for a user's No Skips page
 */
export function generateShareableLink(userId: number) {
  // Get the current domain
  const domain = window.location.origin;
  return `${domain}/shared/${userId}`;
}
