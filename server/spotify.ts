import { storage } from './storage';
import { InsertUser, InsertAlbum } from '@shared/schema';

// Function to get Spotify API credentials
export function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not found in environment variables');
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri: getRedirectUri()
  };
}

// Function to get the redirect URI
export function getRedirectUri() {
  // Use REPLIT_DOMAINS environment variable if available
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const domains = replitDomains.split(',');
    if (domains.length > 0) {
      return `https://${domains[0]}/api/auth/callback`;
    }
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:5000/api/auth/callback';
}

// Generate a login URL for Spotify
export function getSpotifyLoginUrl() {
  const { clientId, redirectUri } = getSpotifyCredentials();
  
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'playlist-read-private',
    'playlist-read-collaborative'
  ];
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    show_dialog: 'true'
  });
  
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string) {
  const { clientId, clientSecret, redirectUri } = getSpotifyCredentials();
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.statusText}`);
  }
  
  return await response.json();
}

// Refresh an access token
export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getSpotifyCredentials();
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.statusText}`);
  }
  
  return await response.json();
}

// Get user profile from Spotify
export async function getSpotifyUserProfile(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user profile: ${response.statusText}`);
  }
  
  return await response.json();
}

// Function to handle Spotify authentication
export async function handleSpotifyAuth(code: string) {
  // Exchange code for token
  const tokenData = await exchangeCodeForToken(code);
  
  // Get user profile
  const profileData = await getSpotifyUserProfile(tokenData.access_token);
  
  // Calculate token expiry time
  const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if not provided
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
  
  // Check if user already exists
  let user = await storage.getUserBySpotifyId(profileData.id);
  
  if (user) {
    // Update tokens
    user = await storage.updateUserTokens(
      user.id,
      tokenData.access_token,
      tokenData.refresh_token || user.refreshToken, // Keep old refresh token if new one not provided
      tokenExpiry
    );
  } else {
    // Create new user
    const newUser: InsertUser = {
      spotifyId: profileData.id,
      username: profileData.display_name || profileData.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiry
    };
    
    user = await storage.createUser(newUser);
  }
  
  return user;
}

// Get user's saved albums from Spotify
export async function getUserSavedAlbums(accessToken: string, limit = 50, offset = 0) {
  const response = await fetch(`https://api.spotify.com/v1/me/albums?limit=${limit}&offset=${offset}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get saved albums: ${response.statusText}`);
  }
  
  return await response.json();
}

// Search for albums on Spotify
export async function searchSpotifyAlbums(accessToken: string, query: string, limit = 10) {
  const params = new URLSearchParams({
    q: query,
    type: 'album',
    limit: limit.toString()
  });
  
  const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to search albums: ${response.statusText}`);
  }
  
  return await response.json();
}

// Get album details from Spotify
export async function getAlbumDetails(accessToken: string, albumId: string) {
  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get album details: ${response.statusText}`);
  }
  
  return await response.json();
}

// Process album data and save to storage
export async function processAndSaveAlbum(albumData: any) {
  // Check if album already exists in storage
  let album = await storage.getAlbumBySpotifyId(albumData.id);
  
  if (!album) {
    // Extract release year from release_date if available
    let releaseYear: number | undefined;
    if (albumData.release_date) {
      const releaseDate = new Date(albumData.release_date);
      if (!isNaN(releaseDate.getTime())) {
        releaseYear = releaseDate.getFullYear();
      }
    }
    
    // Extract image URL (preferably large size)
    let imageUrl = '';
    if (albumData.images && albumData.images.length > 0) {
      // Get the largest image
      imageUrl = albumData.images[0].url;
    }
    
    // Create album object
    const newAlbum: InsertAlbum = {
      spotifyId: albumData.id,
      name: albumData.name,
      artist: albumData.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      imageUrl,
      releaseYear,
      genre: albumData.genres && albumData.genres.length > 0 ? albumData.genres[0] : undefined
    };
    
    album = await storage.createAlbum(newAlbum);
  }
  
  return album;
}
