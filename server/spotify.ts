import { storage } from './storage';
import { InsertUser, InsertAlbum } from '@shared/schema';

// Function to get the base URL from environment or fallback
export function getAppBaseUrl(): string {
  // First priority: explicit APP_BASE_URL environment variable
  if (process.env.APP_BASE_URL) {
    // Remove trailing slash if present
    return process.env.APP_BASE_URL.replace(/\/$/, '');
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:5000';
}

// Function to get the redirect URI from request headers (for dynamic detection)
export function getRedirectUriFromRequest(req: { headers: { host?: string; 'x-forwarded-proto'?: string } }): string {
  if (process.env.APP_BASE_URL) {
    return `${getAppBaseUrl()}/api/auth/callback`;
  }
  
  // Try to derive from request headers
  if (req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${req.headers.host}/api/auth/callback`;
  }
  
  // Fallback
  return `${getAppBaseUrl()}/api/auth/callback`;
}

// Function to get the redirect URI (static version for when request is not available)
export function getRedirectUri(): string {
  return `${getAppBaseUrl()}/api/auth/callback`;
}

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

// Generate a login URL for Spotify
export function getSpotifyLoginUrl(userId?: number) {
  const { clientId, redirectUri } = getSpotifyCredentials();

  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-library-read',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-currently-playing',
    'user-read-playback-state'
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    show_dialog: 'true',
  });

  // Pass user ID in state so the callback can identify the user
  // even when the session doesn't carry over (e.g. native app → Safari)
  if (userId) {
    params.set('state', String(userId));
  }

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string) {
  const { clientId, clientSecret, redirectUri } = getSpotifyCredentials();
  
  console.log('Attempting token exchange with redirect URI:', redirectUri);
  
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
    const errorBody = await response.text();
    console.error('Token exchange failed:', response.status, response.statusText, errorBody);
    throw new Error(`Failed to exchange code for token: ${response.statusText} - ${errorBody}`);
  }
  
  const tokenData = await response.json();
  console.log('Token exchange successful');
  return tokenData;
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
  console.log(`Processing album: ${albumData.name} by ${albumData.artists?.map((a: any) => a.name).join(', ')}`);
  
  // Check if album already exists in storage
  let album = await storage.getAlbumBySpotifyId(albumData.id);
  
  if (!album) {
    // Extract release year from release_date if available
    let releaseYear: number | undefined;
    if (albumData.release_date) {
      // Release date can be in formats YYYY, YYYY-MM, or YYYY-MM-DD
      const yearMatch = albumData.release_date.match(/^(\d{4})/);
      if (yearMatch) {
        releaseYear = parseInt(yearMatch[1]);
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
    
    // Get artist name for genre inference if Spotify API doesn't return genres
    const artistName = albumData.artists?.[0]?.name || '';
    
    // First check if album has genres (rare in Spotify API)
    if (albumData.genres && albumData.genres.length > 0) {
      console.log(`Album has genres: ${albumData.genres.join(', ')}`);
      // Format the genre nicely
      genre = formatGenre(albumData.genres[0]);
    } 
    // If no genre on album and we have access token, try to get genre from primary artist
    else if (accessToken && albumData.artists && albumData.artists.length > 0) {
      const artistId = albumData.artists[0].id;
      
      console.log(`Fetching genre information for artist: ${artistName} (${artistId})`);
      
      try {
        const artistData = await getArtistDetails(accessToken, artistId);
        
        // If artist has genres, process them
        if (artistData.genres && artistData.genres.length > 0) {
          console.log(`Artist genres for ${artistData.name}:`, artistData.genres);
          
          // Process genre list to get a more specific/main genre
          // Spotify often returns genres like "pop rap" or "art rock" - we want to standardize
          let genreList = artistData.genres;
          
          // Try to find a main genre first (simpler genres like "Pop", "Rock", "Hip-Hop" are preferred)
          const mainGenres = ["pop", "rock", "hip hop", "rap", "r&b", "jazz", "electronic", "classical", "country", "folk", "indie"];
          const foundMainGenre = genreList.find((g: string) => 
            mainGenres.some(main => g.toLowerCase().includes(main.toLowerCase()))
          );
          
          if (foundMainGenre) {
            // Format nicely
            genre = formatGenre(foundMainGenre);
            console.log(`Found main genre: ${foundMainGenre} -> formatted as: ${genre}`);
          } else if (genreList.length > 0) {
            // Just use the first genre
            genre = formatGenre(genreList[0]);
            console.log(`Using first genre: ${genreList[0]} -> formatted as: ${genre}`);
          }
        } else {
          console.log(`No genres returned from Spotify for artist: ${artistData.name}`);
        }
      } catch (error) {
        console.log("Failed to fetch artist genres:", error);
        // Continue without genre information
      }
    }
    
    // For well-known artists with missing genres in Spotify API, assign a reasonable default
    if (!genre && artistName) {
      // Map of well-known artists to their primary genres
      // This helps with artists like Taylor Swift who don't have genres in the Spotify API
      const knownArtistGenres: Record<string, string> = {
        'Taylor Swift': 'Pop',
        'The Weeknd': 'R&B',
        'Ariana Grande': 'Pop',
        'Justin Bieber': 'Pop',
        'Beyoncé': 'R&B',
        'Adele': 'Pop',
        'Billie Eilish': 'Pop',
        'Dua Lipa': 'Pop',
        'Ed Sheeran': 'Pop',
        'Harry Styles': 'Pop',
        'Kendrick Lamar': 'Hip-Hop',
        'Lady Gaga': 'Pop',
        'Post Malone': 'Hip-Hop',
        'BTS': 'Pop',
        'Bad Bunny': 'Latin',
        'Bruno Mars': 'Pop'
      };
      
      // Check if artist is in our known list
      if (knownArtistGenres[artistName]) {
        genre = knownArtistGenres[artistName];
        console.log(`Using known genre for ${artistName}: ${genre}`);
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
    
    console.log(`Creating new album "${newAlbum.name}" by ${newAlbum.artist} with genre: ${genre || 'None'}`);
    album = await storage.createAlbum(newAlbum);
  } else {
    console.log(`Album already exists in database: ${album.name}`);
    
    // Check and update genre if it's missing - this helps with CSV imports for No Skips
    if ((!album.genre || album.genre === "None" || album.genre === "null") && accessToken) {
      console.log(`Album ${album.name} is missing genre. Attempting to update...`);
      
      try {
        // Get artist name
        const artistName = album.artist;
        
        // Try to get genre from Spotify API using the artist name
        const searchResult = await searchSpotifyAlbums(accessToken, `artist:${artistName}`, 1);
        
        if (searchResult.albums.items.length > 0) {
          const artistId = searchResult.albums.items[0].artists[0].id;
          
          console.log(`Found artist ID ${artistId} for ${artistName}`);
          
          const artistData = await getArtistDetails(accessToken, artistId);
          
          let genre: string | undefined;
          
          // If artist has genres, process them
          if (artistData.genres && artistData.genres.length > 0) {
            console.log(`Artist genres for ${artistData.name}:`, artistData.genres);
            
            // Process genre list to get a more specific/main genre
            let genreList = artistData.genres;
            
            // Try to find a main genre first
            const mainGenres = ["pop", "rock", "hip hop", "rap", "r&b", "jazz", "electronic", "classical", "country", "folk", "indie"];
            const foundMainGenre = genreList.find((g: string) => 
              mainGenres.some(main => g.toLowerCase().includes(main.toLowerCase()))
            );
            
            if (foundMainGenre) {
              // Format nicely
              genre = formatGenre(foundMainGenre);
              console.log(`Found main genre: ${foundMainGenre} -> formatted as: ${genre}`);
            } else if (genreList.length > 0) {
              // Just use the first genre
              genre = formatGenre(genreList[0]);
              console.log(`Using first genre: ${genreList[0]} -> formatted as: ${genre}`);
            }
            
            // Update the album with the new genre
            if (genre) {
              console.log(`Updating album ${album.name} with genre: ${genre}`);
              // Update in database
              const updatedAlbum = await storage.updateAlbum(album.id, genre);
              if (updatedAlbum) {
                album = updatedAlbum;
              }
            }
          }
        }
      } catch (error) {
        console.log("Failed to update album genre:", error);
      }
    }
  }
  
  return album;
}

// Get user's currently playing track
export async function getCurrentlyPlaying(accessToken: string) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || response.status === 202) {
      return null; // No track currently playing
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - token may have expired');
      }
      throw new Error(`Failed to get currently playing: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.item || data.item.type !== 'track') {
      return null; // Not playing a track (could be podcast, etc.)
    }

    // Extract album information
    const track = data.item;
    const album = track.album;
    
    return {
      isPlaying: data.is_playing,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist: any) => artist.name),
        album: {
          id: album.id,
          name: album.name,
          artist: album.artists[0]?.name || 'Unknown Artist',
          imageUrl: album.images[0]?.url || '',
          spotifyId: album.id,
          releaseYear: album.release_date ? new Date(album.release_date).getFullYear() : undefined
        }
      },
      progressMs: data.progress_ms,
      durationMs: track.duration_ms
    };
  } catch (error) {
    console.error('Error fetching currently playing:', error);
    throw error;
  }
}
