import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'

// Spotify API configuration
// Get your credentials from: https://developer.spotify.com/dashboard
const SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'

// Spotify authorization endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
}

// Scopes needed for the app
const scopes = [
  'user-read-currently-playing',
  'user-read-playback-state',
]

// Get redirect URI for Expo
export function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'theshelf', // Must match the scheme in your app.json
    path: 'spotify-callback',
  })
}

// Build Spotify authorization URL
export function getSpotifyAuthUrl() {
  const redirectUri = getRedirectUri()
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
  })
  return `${discovery.authorizationEndpoint}?${params.toString()}`
}

// Search for albums using Spotify API
export async function searchSpotifyAlbums(accessToken: string, query: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`)
  }

  return response.json()
}

// Get album details from Spotify
export async function getAlbumDetails(accessToken: string, albumId: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/albums/${albumId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`)
  }

  return response.json()
}

// Get currently playing track
export async function getCurrentlyPlaying(accessToken: string) {
  const response = await fetch(
    'https://api.spotify.com/v1/me/player/currently-playing',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (response.status === 204) {
    return null // Nothing playing
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`)
  }

  return response.json()
}

// Open album in Spotify app
export function openInSpotify(spotifyId: string) {
  const url = `spotify:album:${spotifyId}`
  const webUrl = `https://open.spotify.com/album/${spotifyId}`
  
  // Try to open in Spotify app, fall back to web
  WebBrowser.openBrowserAsync(webUrl)
}

// Get client credentials token (for searching without user login)
export async function getClientCredentialsToken(clientId: string, clientSecret: string) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}
