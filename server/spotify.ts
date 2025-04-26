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
  console.log(`Processing album: ${albumData.name} by ${albumData.artists?.map((a: any) => a.name).join(', ')}`);
  
  // Check if album already exists in storage
  let album = await storage.getAlbumBySpotifyId(albumData.id);
  
  if (!album) {
    // Extract release year and full date from release_date if available
    let releaseYear: number | undefined;
    let releaseDate: string | undefined;
    
    if (albumData.release_date) {
      // Store the full release date for precise sorting
      releaseDate = albumData.release_date;
      
      // Release date can be in formats YYYY, YYYY-MM, or YYYY-MM-DD
      const yearMatch = albumData.release_date.match(/^(\d{4})/);
      if (yearMatch) {
        releaseYear = parseInt(yearMatch[1]);
      }
      
      console.log(`Album release date: ${releaseDate}, extracted year: ${releaseYear}`);
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
      releaseDate, // Include the full release date
      genre
    };
    
    console.log(`Creating new album "${newAlbum.name}" by ${newAlbum.artist} with genre: ${genre || 'None'}`);
    album = await storage.createAlbum(newAlbum);
  } else {
    console.log(`Album already exists in database: ${album.name}`);
    
    // Check if we need to update any missing information
    const needsGenreUpdate = !album.genre || album.genre === "None" || album.genre === "null";
    const needsReleaseDateUpdate = !album.releaseDate && albumData.release_date;
    
    if ((needsGenreUpdate || needsReleaseDateUpdate) && accessToken) {
      console.log(`Album ${album.name} is missing information. Attempting to update...`);
      
      try {
        // Get any missing release date information from the albumData
        let releaseDate = album.releaseDate;
        if (needsReleaseDateUpdate && albumData.release_date) {
          releaseDate = albumData.release_date;
          console.log(`Adding release date for ${album.name}: ${releaseDate}`);
        }
        
        // Get artist name for looking up genre
        const artistName = album.artist;
        let genre = album.genre;
        
        if (needsGenreUpdate) {
          console.log(`Album ${album.name} is missing genre. Attempting to update...`);
          
          // Try to get genre from Spotify API using the artist name
          const searchResult = await searchSpotifyAlbums(accessToken, `artist:${artistName}`, 1);
          
          if (searchResult.albums.items.length > 0) {
            const artistId = searchResult.albums.items[0].artists[0].id;
            
            console.log(`Found artist ID ${artistId} for ${artistName}`);
            
            const artistData = await getArtistDetails(accessToken, artistId);
            
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
            }
          }
        }
        
        // Update the album with any new information we found
        if ((needsGenreUpdate && genre) || (needsReleaseDateUpdate && releaseDate)) {
          console.log(`Updating album ${album.name} with new information`);
          // Update in database
          const updatedAlbum = await storage.updateAlbum(album.id, genre, releaseDate);
          if (updatedAlbum) {
            album = updatedAlbum;
          }
        }
      } catch (error) {
        console.log("Failed to update album information:", error);
      }
    }
  }
  
  return album;
}
