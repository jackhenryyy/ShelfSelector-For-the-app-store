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
    // Create new user with auto-generated password since InsertUser requires it
    const newUser: InsertUser = {
      username: profileData.display_name || profileData.id,
      // For users created via Spotify, generate a secure random password
      // They won't use this for login as they'll authenticate via Spotify
      password: Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10),
      // Optional email if available from Spotify
      email: profileData.email
    };
    
    // First create the user with the required fields
    user = await storage.createUser(newUser);
    
    // Then update the user with Spotify-specific fields
    user = await storage.updateUserTokens(
      user.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenExpiry
    );
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
  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to get album details for ID ${albumId}: ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error response:', errorBody);
      throw new Error(`Failed to get album details: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching album ${albumId}:`, error);
    throw error;
  }
}

// Get artist details from Spotify to fetch genres
export async function getArtistDetails(accessToken: string, artistId: string) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to get artist details for ID ${artistId}: ${response.statusText}`);
      const errorBody = await response.text();
      console.error('Error response:', errorBody);
      throw new Error(`Failed to get artist details: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching artist ${artistId}:`, error);
    throw error;
  }
}

// Process album data and save to storage
// Helper function to format genre names consistently
function formatGenre(genre: string): string {
  if (!genre) return genre;
  
  // Special cases
  if (genre.toLowerCase().includes('hip hop') || genre.toLowerCase().includes('rap')) {
    return 'Hip-Hop';
  }
  if (genre.toLowerCase().includes('r&b') || genre.toLowerCase().includes('soul')) {
    return 'R&B';
  }
  if (genre.toLowerCase().includes('electronic') || genre.toLowerCase().includes('techno') || 
      genre.toLowerCase().includes('house') || genre.toLowerCase().includes('edm')) {
    return 'Electronic';
  }
  if (genre.toLowerCase().includes('alternative') || genre.toLowerCase().includes('alt')) {
    return 'Alternative';
  }
  if (genre.toLowerCase().includes('indie')) {
    return 'Indie';
  }
  if (genre.toLowerCase().includes('rock')) {
    return 'Rock';
  }
  if (genre.toLowerCase().includes('pop')) {
    return 'Pop';
  }
  if (genre.toLowerCase().includes('jazz')) {
    return 'Jazz';
  }
  if (genre.toLowerCase().includes('classical')) {
    return 'Classical';
  }
  if (genre.toLowerCase().includes('country')) {
    return 'Country';
  }
  if (genre.toLowerCase().includes('folk')) {
    return 'Folk';
  }
  if (genre.toLowerCase().includes('metal')) {
    return 'Metal';
  }
  if (genre.toLowerCase().includes('ambient')) {
    return 'Ambient';
  }
  
  // Default formatting: capitalize first letter of each word
  return genre.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function processAndSaveAlbum(albumData: any, accessToken?: string) {
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
    
    // Try to get genre information
    let genre: string | undefined;
    
    // First check if album has genres
    if (albumData.genres && albumData.genres.length > 0) {
      // Format the genre nicely (capitalize first letter)
      genre = formatGenre(albumData.genres[0]);
    } 
    // If no genre on album and we have access token, try to get genre from primary artist
    else if (accessToken && albumData.artists && albumData.artists.length > 0) {
      try {
        const artistId = albumData.artists[0].id;
        const artistData = await getArtistDetails(accessToken, artistId);
        
        if (artistData.genres && artistData.genres.length > 0) {
          // Process genre list to get a more specific/main genre
          // Spotify often returns genres like "pop rap" or "art rock" - we want to standardize
          let genreList = artistData.genres;
          
          // Try to find a main genre first (simpler genres like "Pop", "Rock", "Hip-Hop" are preferred)
          const mainGenres = ["pop", "rock", "hip hop", "rap", "r&b", "jazz", "electronic", "classical", "country", "folk", "indie"];
          const foundMainGenre = genreList.find((g: string) => mainGenres.some(main => g.includes(main)));
          
          if (foundMainGenre) {
            // Format nicely
            genre = formatGenre(foundMainGenre);
          } else if (genreList.length > 0) {
            // Just use the first genre
            genre = formatGenre(genreList[0]);
          }
        }
      } catch (error) {
        console.log("Failed to fetch artist genres:", error);
        // Continue without genre information
      }
    }
    
    // Create album object
    const newAlbum: InsertAlbum = {
      spotifyId: albumData.id,
      name: albumData.name,
      artist: albumData.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      imageUrl,
      releaseYear,
      genre
    };
    
    album = await storage.createAlbum(newAlbum);
  }
  
  return album;
}
