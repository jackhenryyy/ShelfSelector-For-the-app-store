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
  try {
    // Get the current domain
    const domain = window.location.origin;
    const shareUrl = `${domain}/shared/${userId}`;
    console.log("Generated share URL:", shareUrl, "for userId:", userId);
    return shareUrl;
  } catch (error) {
    console.error("Error generating shareable link:", error);
    // Fallback to relative URL in case of error
    return `/shared/${userId}`;
  }
}
