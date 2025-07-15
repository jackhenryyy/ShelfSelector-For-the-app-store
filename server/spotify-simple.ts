// Simple Spotify authentication - starting fresh
import { storage } from './storage';
import type { User } from '@shared/schema';

// Basic Spotify configuration
export function getSpotifyConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }
  
  return { clientId, clientSecret };
}

// Generate simple auth URL
export function getAuthUrl() {
  const { clientId } = getSpotifyConfig();
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://shelf-selector-thejackattack.replit.app'
    : 'http://localhost:5000';
  
  const redirectUri = `${baseUrl}/api/spotify/callback`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-read-currently-playing user-read-playback-state',
    show_dialog: 'true'
  });
  
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange code for tokens
export async function exchangeCode(code: string) {
  const { clientId, clientSecret } = getSpotifyConfig();
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://shelf-selector-thejackattack.replit.app'
    : 'http://localhost:5000';
  
  const redirectUri = `${baseUrl}/api/spotify/callback`;
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }
  
  return await response.json();
}

// Get user's currently playing track
export async function getCurrentlyPlaying(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  if (response.status === 204) {
    return null; // Nothing playing
  }
  
  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }
  
  return await response.json();
}