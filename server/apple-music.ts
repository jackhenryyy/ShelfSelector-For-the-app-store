import jwt from 'jsonwebtoken';
import { storage } from './storage';
import type { User, InsertAlbum } from '@shared/schema';

function getAppleMusicCredentials() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY;
  
  if (!teamId || !keyId || !privateKey) {
    throw new Error('Apple Music credentials not found. Please set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY environment variables.');
  }
  
  return { teamId, keyId, privateKey };
}

export function generateDeveloperToken(): string {
  const { teamId, keyId, privateKey } = getAppleMusicCredentials();
  
  // Handle private key formatting - env vars often have literal \n instead of actual newlines
  let formattedKey = privateKey.replace(/\\n/g, '\n');
  
  // Ensure the key has proper PEM headers
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
  }
  
  console.log('Apple Music: Generating developer token with Team ID:', teamId, 'Key ID:', keyId);
  console.log('Apple Music: Private key length:', formattedKey.length, 'Has proper headers:', formattedKey.includes('-----BEGIN PRIVATE KEY-----'));
  
  try {
    const token = jwt.sign({}, formattedKey, {
      algorithm: 'ES256',
      expiresIn: '180d',
      issuer: teamId,
      header: {
        alg: 'ES256',
        kid: keyId
      }
    });
    
    console.log('Apple Music: Developer token generated successfully');
    return token;
  } catch (error) {
    console.error('Apple Music: Failed to generate developer token:', error);
    throw error;
  }
}

let cachedDeveloperToken: string | null = null;
let tokenExpiry: Date | null = null;

export function getDeveloperToken(): string {
  if (cachedDeveloperToken && tokenExpiry && tokenExpiry > new Date()) {
    return cachedDeveloperToken;
  }
  
  cachedDeveloperToken = generateDeveloperToken();
  tokenExpiry = new Date(Date.now() + 170 * 24 * 60 * 60 * 1000);
  
  return cachedDeveloperToken;
}

export async function searchAppleMusicAlbums(query: string, limit = 10): Promise<any> {
  const developerToken = getDeveloperToken();
  
  const params = new URLSearchParams({
    term: query,
    types: 'albums',
    limit: limit.toString()
  });
  
  const response = await fetch(`https://api.music.apple.com/v1/catalog/us/search?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${developerToken}`
    }
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Apple Music search failed:', response.status, errorBody);
    throw new Error(`Failed to search Apple Music: ${response.statusText}`);
  }
  
  return await response.json();
}

export async function getAppleMusicAlbumDetails(albumId: string): Promise<any> {
  const developerToken = getDeveloperToken();
  
  const response = await fetch(`https://api.music.apple.com/v1/catalog/us/albums/${albumId}`, {
    headers: {
      'Authorization': `Bearer ${developerToken}`
    }
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Apple Music album details failed:', response.status, errorBody);
    throw new Error(`Failed to get Apple Music album details: ${response.statusText}`);
  }
  
  return await response.json();
}

export async function getCurrentlyPlayingAppleMusic(userMusicToken: string): Promise<any> {
  const developerToken = getDeveloperToken();
  
  const response = await fetch('https://api.music.apple.com/v1/me/recent/played/tracks', {
    headers: {
      'Authorization': `Bearer ${developerToken}`,
      'Music-User-Token': userMusicToken
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    const errorBody = await response.text();
    console.error('Apple Music currently playing failed:', response.status, errorBody);
    throw new Error(`Failed to get currently playing: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.data && data.data.length > 0) {
    const recentTrack = data.data[0];
    return {
      isPlaying: true,
      track: {
        name: recentTrack.attributes?.name,
        artist: recentTrack.attributes?.artistName,
        album: recentTrack.attributes?.albumName,
        albumArt: recentTrack.attributes?.artwork?.url?.replace('{w}', '300').replace('{h}', '300')
      }
    };
  }
  
  return { isPlaying: false };
}

function formatGenre(genre: string): string {
  if (!genre) return genre;
  
  const lowerGenre = genre.toLowerCase();
  
  if (lowerGenre.includes('hip hop') || lowerGenre.includes('hip-hop') || lowerGenre.includes('rap')) {
    return 'Hip-Hop';
  }
  if (lowerGenre.includes('r&b') || lowerGenre.includes('soul')) {
    return 'R&B';
  }
  if (lowerGenre.includes('electronic') || lowerGenre.includes('techno') || 
      lowerGenre.includes('house') || lowerGenre.includes('edm')) {
    return 'Electronic';
  }
  if (lowerGenre.includes('alternative') || lowerGenre.includes('alt')) {
    return 'Alternative';
  }
  if (lowerGenre.includes('indie')) {
    return 'Indie';
  }
  if (lowerGenre.includes('rock')) {
    return 'Rock';
  }
  if (lowerGenre.includes('pop')) {
    return 'Pop';
  }
  if (lowerGenre.includes('jazz')) {
    return 'Jazz';
  }
  if (lowerGenre.includes('classical')) {
    return 'Classical';
  }
  if (lowerGenre.includes('country')) {
    return 'Country';
  }
  if (lowerGenre.includes('folk')) {
    return 'Folk';
  }
  if (lowerGenre.includes('metal')) {
    return 'Metal';
  }
  if (lowerGenre.includes('ambient')) {
    return 'Ambient';
  }
  
  return genre.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function processAndSaveAppleMusicAlbum(albumData: any): Promise<any> {
  const attributes = albumData.attributes || albumData;
  const appleMusicId = albumData.id;
  
  console.log(`Processing Apple Music album: ${attributes.name} by ${attributes.artistName}`);
  
  let album = await storage.getAlbumByAppleMusicId(appleMusicId);
  
  if (!album) {
    let releaseYear: number | undefined;
    if (attributes.releaseDate) {
      const yearMatch = attributes.releaseDate.match(/^(\d{4})/);
      if (yearMatch) {
        releaseYear = parseInt(yearMatch[1]);
      }
    }
    
    let imageUrl = '';
    if (attributes.artwork?.url) {
      imageUrl = attributes.artwork.url.replace('{w}', '640').replace('{h}', '640');
    }
    
    let genre: string | undefined;
    if (attributes.genreNames && attributes.genreNames.length > 0) {
      const mainGenre = attributes.genreNames.find((g: string) => g.toLowerCase() !== 'music');
      if (mainGenre) {
        genre = formatGenre(mainGenre);
      }
    }
    
    const newAlbum: InsertAlbum = {
      appleMusicId: appleMusicId,
      spotifyId: null,
      name: attributes.name,
      artist: attributes.artistName,
      imageUrl: imageUrl,
      releaseYear: releaseYear,
      genre: genre
    };
    
    album = await storage.createAlbum(newAlbum);
    console.log(`Created new Apple Music album in database: ${album.name}`);
  }
  
  return album;
}

export async function getAppleMusicNewReleases(limit = 20): Promise<any[]> {
  const developerToken = getDeveloperToken();
  
  const params = new URLSearchParams({
    types: 'albums',
    limit: limit.toString()
  });
  
  const response = await fetch(`https://api.music.apple.com/v1/catalog/us/charts?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${developerToken}`
    }
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Apple Music new releases failed:', response.status, errorBody);
    throw new Error(`Failed to get new releases: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.results?.albums?.[0]?.data) {
    return data.results.albums[0].data;
  }
  
  return [];
}

export function hasAppleMusicCredentials(): boolean {
  try {
    getAppleMusicCredentials();
    return true;
  } catch {
    return false;
  }
}
