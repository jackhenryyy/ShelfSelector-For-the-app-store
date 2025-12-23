import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// We'll keep the spotify imports but they will be optional to use
import { 
  searchSpotifyAlbums,
  getAlbumDetails,
  processAndSaveAlbum,
  getCurrentlyPlaying,
  getSpotifyLoginUrl,
  handleSpotifyAuth
} from "./spotify";
import {
  searchAppleMusicAlbums,
  getAppleMusicAlbumDetails,
  processAndSaveAppleMusicAlbum,
  getAppleMusicNewReleases,
  getCurrentlyPlayingAppleMusic,
  hasAppleMusicCredentials,
  getDeveloperToken
} from "./apple-music";
import { 
  insertQueueAlbumSchema, 
  insertNoSkipsAlbumSchema, 
  insertAlbumReviewSchema,
  insertNoSkipsReviewSchema 
} from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";

import { User } from "@shared/schema";

// Add type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Middleware to check if user is authenticated
function requireAuth(req: Request, res: Response, next: Function) {
  console.log('Auth check:', {
    path: req.path,
    hasSession: !!req.session,
    sessionId: req.session?.id,
    hasPassport: !!(req.session as any)?.passport,
    isAuthenticated: req.isAuthenticated?.(),
    cookies: req.headers.cookie ? 'present' : 'missing'
  });
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication with passport FIRST
  setupAuth(app);
  
  // Simple test route first - no auth
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Test route working', 
      authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
      hasIsAuthenticated: !!req.isAuthenticated,
      user: req.user || null
    });
  });

  // Simple test for auth routes
  app.get('/api/auth/test', (req, res) => {
    console.log('===== AUTH TEST ROUTE HIT =====');
    res.json({ 
      message: 'Auth routes are working', 
      timestamp: new Date().toISOString(),
      path: req.path,
      url: req.url
    });
  });

  // Test endpoint to verify Spotify configuration
  app.get('/api/spotify/test-config', async (req, res) => {
    try {
      const { getAuthUrl } = await import('./spotify-simple');
      const authUrl = getAuthUrl();
      const url = new URL(authUrl);
      const currentRedirectUri = url.searchParams.get('redirect_uri');
      
      res.json({
        status: 'success',
        message: 'Spotify configuration is ready',
        environment: process.env.NODE_ENV || 'development',
        redirectUri: currentRedirectUri,
        authUrl: authUrl,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Get Spotify access token using client credentials flow
  const getClientCredentialsToken = async () => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not found in environment variables');
    }
    
    const params = new URLSearchParams({
      grant_type: 'client_credentials'
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
      throw new Error(`Failed to get token: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.access_token;
  };
  
  // Album routes
  app.get('/api/spotify/albums/search', requireAuth, async (req, res) => {
    const { query } = req.query;
    
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ message: 'Invalid search query' });
    }
    
    try {
      // Get access token using client credentials (no user login required)
      const accessToken = await getClientCredentialsToken();
      
      const results = await searchSpotifyAlbums(accessToken, query);
      
      const albums = [];
      for (const item of results.albums.items) {
        // Pass the access token to ensure genre information can be fetched from artist
        const album = await processAndSaveAlbum(item, accessToken);
        albums.push(album);
      }
      
      res.json(albums);
    } catch (error) {
      console.error('Album search error:', error);
      res.status(500).json({ message: 'Failed to search albums' });
    }
  });
  
  // Get specific album details
  app.get('/api/spotify/albums/:spotifyId', requireAuth, async (req, res) => {
    const { spotifyId } = req.params;
    
    if (!spotifyId) {
      return res.status(400).json({ message: 'Invalid album ID' });
    }
    
    try {
      // First check if we already have the album in our database
      let album = await storage.getAlbumBySpotifyId(spotifyId);
      
      // If not found in database, fetch from Spotify API and save
      if (!album) {
        const accessToken = await getClientCredentialsToken();
        const albumData = await getAlbumDetails(accessToken, spotifyId);
        album = await processAndSaveAlbum(albumData, accessToken);
      }
      
      res.json(album);
    } catch (error) {
      console.error('Album details error:', error);
      res.status(500).json({ message: 'Failed to fetch album details' });
    }
  });
  
  // Get user's saved albums from Spotify (GET /api/spotify/albums/saved)
  app.get('/api/spotify/albums/saved', requireAuth, async (req, res) => {
    try {
      // Since we're not using Spotify login, we'll return a set of featured albums instead
      const accessToken = await getClientCredentialsToken();
      
      // Get new releases instead of saved albums
      try {
        const response = await fetch('https://api.spotify.com/v1/browse/new-releases?limit=20', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch new releases: ${response.statusText}`);
          const errorBody = await response.text();
          console.error('Error response:', errorBody);
          throw new Error(`Failed to fetch new releases: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const albums = [];
        for (const item of data.albums.items) {
          try {
            const album = await processAndSaveAlbum(item, accessToken);
            albums.push(album);
          } catch (albumError) {
            console.error(`Error processing album ${item.id}:`, albumError);
            // Continue with next album
          }
        }
        
        res.json(albums);
      } catch (fetchError) {
        console.error('Error fetching new releases:', fetchError);
        
        // Fallback: if we can't get new releases, just return existing albums from our database
        const existingAlbums = await storage.searchAlbums("");
        res.json(existingAlbums.slice(0, 20)); // Return up to 20 albums
      }
    } catch (error) {
      console.error('Get saved albums error:', error);
      res.status(500).json({ message: 'Failed to fetch albums' });
    }
  });

  // Get currently playing track
  app.get('/api/spotify/currently-playing', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!user.accessToken) {
        return res.status(401).json({ message: 'Spotify access token not found' });
      }
      
      // Use the token refresh wrapper for the API call
      const { makeSpotifyAPICall } = await import('./spotify-token-refresh');
      
      const currentlyPlaying = await makeSpotifyAPICall(user, async (accessToken) => {
        return await getCurrentlyPlaying(accessToken);
      });
      
      if (currentlyPlaying === null) {
        // Token refresh failed or user needs to re-authenticate
        return res.status(401).json({ message: 'Spotify authentication required. Please reconnect your account.' });
      }
      
      res.json(currentlyPlaying);
    } catch (error) {
      console.error('Currently playing error:', error);
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        return res.status(401).json({ message: 'Spotify token expired. Please reconnect.' });
      }
      res.status(500).json({ message: 'Failed to get currently playing track' });
    }
  });

  // Process and save album from Spotify data
  app.post('/api/spotify/albums/process', requireAuth, async (req, res) => {
    try {
      const accessToken = await getClientCredentialsToken();
      const album = await processAndSaveAlbum(req.body, accessToken);
      res.json(album);
    } catch (error) {
      console.error('Process album error:', error);
      res.status(500).json({ message: 'Failed to process album' });
    }
  });

  // Debug endpoint - no auth required
  app.get('/api/debug', async (req, res) => {
    res.json({ message: "Debug endpoint working", timestamp: new Date().toISOString() });
  });

  // Test Spotify configuration
  app.get('/api/debug/spotify', async (req, res) => {
    try {
      const { getRedirectUri, getSpotifyCredentials, getSpotifyLoginUrl } = await import('./spotify');
      const redirectUri = getRedirectUri();
      const { clientId } = getSpotifyCredentials();
      const loginUrl = getSpotifyLoginUrl();
      
      res.json({ 
        redirectUri,
        clientIdExists: !!clientId,
        clientIdPreview: clientId ? clientId.substring(0, 8) + '...' : 'NOT_SET',
        loginUrl: loginUrl.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test endpoint to check redirect URI
  app.get('/api/spotify/config', async (req, res) => {
    try {
      const { getRedirectUri, getSpotifyCredentials } = await import('./spotify');
      const redirectUri = getRedirectUri();
      const { clientId } = getSpotifyCredentials();
      res.json({ 
        redirectUri, 
        clientIdPresent: !!clientId,
        env: process.env.NODE_ENV,
        domains: process.env.REPLIT_DOMAINS 
      });
    } catch (error) {
      console.error('Config check error:', error);
      res.status(500).json({ message: 'Failed to get config' });
    }
  });

  // Log all incoming requests for debugging
  app.use((req, res, next) => {
    if (req.path.includes('/api/auth')) {
      console.log(`===== AUTH REQUEST: ${req.method} ${req.path} =====`);
      console.log('Query:', req.query);
      console.log('Headers:', req.get('user-agent'));
    }
    next();
  });

  // Simple Spotify authentication - fresh start
  app.get('/api/spotify/auth', async (req, res) => {
    console.log('=== SIMPLE SPOTIFY AUTH START ===');
    
    try {
      const { getAuthUrl } = await import('./spotify-simple');
      const authUrl = getAuthUrl();
      console.log('Redirecting to Spotify:', authUrl);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Auth error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });



  app.get('/api/spotify/callback', async (req, res) => {
    console.log('=== SIMPLE SPOTIFY CALLBACK ===');
    console.log('Query:', req.query);
    
    try {
      const { code, error } = req.query;
      
      if (error) {
        console.log('Spotify error:', error);
        return res.redirect('/?error=spotify_denied');
      }
      
      if (!code || typeof code !== 'string') {
        console.log('No code provided');
        return res.redirect('/?error=no_code');
      }
      
      console.log('Exchanging code for tokens...');
      const { exchangeCode } = await import('./spotify-simple');
      const tokens = await exchangeCode(code);
      
      console.log('Got tokens, updating user...');
      
      // Update current user with Spotify tokens
      if (req.user) {
        const userId = (req.user as any).id;
        const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);
        
        await storage.updateUserTokens(
          userId,
          tokens.access_token,
          tokens.refresh_token || '',
          expiryDate
        );
        
        console.log('Tokens saved successfully');
        res.redirect('/?spotify=connected');
      } else {
        console.log('No user logged in');
        res.redirect('/?error=not_logged_in');
      }
    } catch (error) {
      console.error('Callback error:', error.message);
      res.redirect('/?error=callback_failed');
    }
  });

  // ============= APPLE MUSIC ROUTES =============
  
  // Apple Music album search
  app.get('/api/apple-music/albums/search', requireAuth, async (req, res) => {
    const { query } = req.query;
    
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ message: 'Invalid search query' });
    }
    
    try {
      if (!hasAppleMusicCredentials()) {
        return res.status(503).json({ message: 'Apple Music is not configured' });
      }
      
      const results = await searchAppleMusicAlbums(query);
      
      const albums = [];
      if (results.results?.albums?.data) {
        for (const item of results.results.albums.data) {
          const album = await processAndSaveAppleMusicAlbum(item);
          albums.push(album);
        }
      }
      
      res.json(albums);
    } catch (error) {
      console.error('Apple Music album search error:', error);
      res.status(500).json({ message: 'Failed to search albums' });
    }
  });
  
  // Get Apple Music album details
  app.get('/api/apple-music/albums/:appleMusicId', requireAuth, async (req, res) => {
    const { appleMusicId } = req.params;
    
    if (!appleMusicId) {
      return res.status(400).json({ message: 'Invalid album ID' });
    }
    
    try {
      let album = await storage.getAlbumByAppleMusicId(appleMusicId);
      
      if (!album) {
        if (!hasAppleMusicCredentials()) {
          return res.status(503).json({ message: 'Apple Music is not configured' });
        }
        
        const albumData = await getAppleMusicAlbumDetails(appleMusicId);
        if (albumData.data && albumData.data.length > 0) {
          album = await processAndSaveAppleMusicAlbum(albumData.data[0]);
        } else {
          return res.status(404).json({ message: 'Album not found' });
        }
      }
      
      res.json(album);
    } catch (error) {
      console.error('Apple Music album details error:', error);
      res.status(500).json({ message: 'Failed to fetch album details' });
    }
  });
  
  // Get Apple Music new releases/chart albums
  app.get('/api/apple-music/albums/saved', requireAuth, async (req, res) => {
    try {
      if (!hasAppleMusicCredentials()) {
        const existingAlbums = await storage.searchAlbums("");
        return res.json(existingAlbums.slice(0, 20));
      }
      
      const chartAlbums = await getAppleMusicNewReleases();
      
      const albums = [];
      for (const item of chartAlbums) {
        try {
          const album = await processAndSaveAppleMusicAlbum(item);
          albums.push(album);
        } catch (albumError) {
          console.error(`Error processing Apple Music album ${item.id}:`, albumError);
        }
      }
      
      res.json(albums);
    } catch (error) {
      console.error('Get Apple Music albums error:', error);
      res.status(500).json({ message: 'Failed to fetch albums' });
    }
  });
  
  // Get currently playing from Apple Music
  app.get('/api/apple-music/currently-playing', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      if (!user.appleMusicToken) {
        return res.status(401).json({ message: 'Apple Music user token not found' });
      }
      
      const currentlyPlaying = await getCurrentlyPlayingAppleMusic(user.appleMusicToken);
      
      if (currentlyPlaying === null) {
        return res.status(401).json({ message: 'Apple Music authentication required.' });
      }
      
      res.json(currentlyPlaying);
    } catch (error) {
      console.error('Apple Music currently playing error:', error);
      res.status(500).json({ message: 'Failed to get currently playing track' });
    }
  });
  
  // Get developer token for frontend MusicKit JS
  app.get('/api/apple-music/developer-token', requireAuth, async (req, res) => {
    try {
      if (!hasAppleMusicCredentials()) {
        return res.status(503).json({ message: 'Apple Music is not configured' });
      }
      
      const token = getDeveloperToken();
      res.json({ developerToken: token });
    } catch (error) {
      console.error('Get developer token error:', error);
      res.status(500).json({ message: 'Failed to get developer token' });
    }
  });
  
  // Save Apple Music user token (received from MusicKit JS on frontend)
  app.post('/api/apple-music/user-token', requireAuth, async (req, res) => {
    try {
      const { userToken } = req.body;
      
      if (!userToken) {
        return res.status(400).json({ message: 'User token is required' });
      }
      
      const userId = req.user!.id;
      const expiryDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days
      
      await storage.updateUserAppleMusicToken(userId, userToken, expiryDate);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Save Apple Music user token error:', error);
      res.status(500).json({ message: 'Failed to save user token' });
    }
  });

  // ============= UNIFIED ALBUM SEARCH =============
  // This endpoint automatically uses the user's preferred music service
  app.get('/api/music/albums/search', requireAuth, async (req, res) => {
    const { query } = req.query;
    const user = req.user!;
    
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ message: 'Invalid search query' });
    }
    
    try {
      const musicService = user.musicService || 'spotify';
      console.log(`Unified search: User ${user.username} using ${musicService}, query: "${query}"`);
      
      if (musicService === 'apple_music') {
        console.log('Using Apple Music for search...');
        if (!hasAppleMusicCredentials()) {
          console.log('Apple Music credentials not available!');
          return res.status(503).json({ message: 'Apple Music is not configured' });
        }
        
        console.log('Apple Music credentials verified, searching...');
        const results = await searchAppleMusicAlbums(query);
        console.log('Apple Music search completed, processing results...');
        
        const albums = [];
        if (results.results?.albums?.data) {
          console.log(`Found ${results.results.albums.data.length} albums`);
          for (const item of results.results.albums.data) {
            const album = await processAndSaveAppleMusicAlbum(item);
            albums.push(album);
          }
        } else {
          console.log('No albums found in results:', JSON.stringify(results).slice(0, 500));
        }
        
        res.json(albums);
      } else {
        // Default to Spotify
        const accessToken = await getClientCredentialsToken();
        const results = await searchSpotifyAlbums(accessToken, query);
        
        const albums = [];
        for (const item of results.albums.items) {
          const album = await processAndSaveAlbum(item, accessToken);
          albums.push(album);
        }
        
        res.json(albums);
      }
    } catch (error) {
      console.error('Unified album search error:', error);
      res.status(500).json({ message: 'Failed to search albums' });
    }
  });
  
  // Unified endpoint to get featured/new albums based on user's music service
  app.get('/api/music/albums/featured', requireAuth, async (req, res) => {
    const user = req.user!;
    
    try {
      const musicService = user.musicService || 'spotify';
      
      if (musicService === 'apple_music') {
        if (!hasAppleMusicCredentials()) {
          const existingAlbums = await storage.searchAlbums("");
          return res.json(existingAlbums.slice(0, 20));
        }
        
        const chartAlbums = await getAppleMusicNewReleases();
        
        const albums = [];
        for (const item of chartAlbums) {
          try {
            const album = await processAndSaveAppleMusicAlbum(item);
            albums.push(album);
          } catch (albumError) {
            console.error(`Error processing Apple Music album:`, albumError);
          }
        }
        
        res.json(albums);
      } else {
        // Default to Spotify
        const accessToken = await getClientCredentialsToken();
        
        const response = await fetch('https://api.spotify.com/v1/browse/new-releases?limit=20', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch new releases: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const albums = [];
        for (const item of data.albums.items) {
          try {
            const album = await processAndSaveAlbum(item, accessToken);
            albums.push(album);
          } catch (albumError) {
            console.error(`Error processing Spotify album:`, albumError);
          }
        }
        
        res.json(albums);
      }
    } catch (error) {
      console.error('Get featured albums error:', error);
      const existingAlbums = await storage.searchAlbums("");
      res.json(existingAlbums.slice(0, 20));
    }
  });
  
  // Get user's music service configuration
  app.get('/api/music/config', requireAuth, async (req, res) => {
    const user = req.user!;
    
    res.json({
      musicService: user.musicService || 'spotify',
      spotifyConnected: !!user.accessToken,
      appleMusicConnected: !!user.appleMusicToken,
      appleMusicAvailable: hasAppleMusicCredentials()
    });
  });
  
  app.get('/api/albums', requireAuth, async (req, res) => {
    const { query } = req.query;
    
    try {
      let albums = [];
      
      if (query && typeof query === 'string') {
        albums = await storage.searchAlbums(query);
      } else {
        // Return a limited selection of albums
        albums = await storage.searchAlbums("");
      }
      
      res.json(albums);
    } catch (error) {
      console.error('Album search error:', error);
      res.status(500).json({ message: 'Failed to search albums' });
    }
  });
  
  app.get('/api/albums/:id', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid album ID' });
    }
    
    try {
      const album = await storage.getAlbum(id);
      
      if (!album) {
        return res.status(404).json({ message: 'Album not found' });
      }
      
      res.json(album);
    } catch (error) {
      console.error('Album details error:', error);
      res.status(500).json({ message: 'Failed to fetch album details' });
    }
  });
  
  // Update album genre
  app.patch('/api/albums/:id/genre', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { genre } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid album ID' });
      }
      
      if (genre === undefined) {
        return res.status(400).json({ message: 'Genre is required' });
      }
      
      const updatedAlbum = await storage.updateAlbum(id, genre);
      
      if (!updatedAlbum) {
        return res.status(404).json({ message: 'Album not found' });
      }
      
      res.json(updatedAlbum);
    } catch (error) {
      console.error('Album genre update error:', error);
      res.status(500).json({ message: 'Failed to update album genre' });
    }
  });
  
  // Queue routes
  app.get('/api/queue', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const queueAlbums = await storage.getQueueAlbums(userId);
      res.json(queueAlbums);
    } catch (error) {
      console.error('Get queue error:', error);
      res.status(500).json({ message: 'Failed to fetch queue' });
    }
  });
  
  app.post('/api/queue', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = insertQueueAlbumSchema.parse({
        ...req.body,
        userId,
        addedAt: new Date()
      });
      
      const queueAlbum = await storage.addToQueue(data);
      res.json(queueAlbum);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      console.error('Add to queue error:', error);
      res.status(500).json({ message: 'Failed to add album to queue' });
    }
  });
  
  app.delete('/api/queue/:albumId', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const albumId = parseInt(req.params.albumId);
      
      if (isNaN(albumId)) {
        return res.status(400).json({ message: 'Invalid album ID' });
      }
      
      await storage.removeFromQueue(userId, albumId);
      res.json({ success: true });
    } catch (error) {
      console.error('Remove from queue error:', error);
      res.status(500).json({ message: 'Failed to remove album from queue' });
    }
  });
  
  // No Skips routes
  app.get('/api/no-skips', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const noSkipsAlbums = await storage.getNoSkipsAlbums(userId);
      res.json(noSkipsAlbums);
    } catch (error) {
      console.error('Get no skips error:', error);
      res.status(500).json({ message: 'Failed to fetch no skips albums' });
    }
  });
  
  // Public endpoint to get a user's no-skips collection for sharing
  app.get('/api/shared/no-skips/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get the user's no-skips albums, top four, and reviews
      const noSkipsAlbums = await storage.getNoSkipsAlbums(userId);
      const topFourAlbums = await storage.getTopFourAlbums(userId);
      const noSkipsReviews = await storage.getNoSkipsReviews(userId);
      
      // Return collections along with the username (but not email or other private info)
      res.json({
        username: user.username,
        noSkipsAlbums,
        topFourAlbums,
        noSkipsReviews
      });
    } catch (error) {
      console.error('Get shared no skips error:', error);
      res.status(500).json({ message: 'Failed to fetch shared no skips albums' });
    }
  });
  
  app.get('/api/no-skips/top-four', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const topFourAlbums = await storage.getTopFourAlbums(userId);
      res.json(topFourAlbums);
    } catch (error) {
      console.error('Get top four error:', error);
      res.status(500).json({ message: 'Failed to fetch top four albums' });
    }
  });
  
  app.post('/api/no-skips', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = insertNoSkipsAlbumSchema.parse({
        ...req.body,
        userId,
        addedAt: new Date(),
        isTopFour: false
      });
      
      const noSkipsAlbum = await storage.addToNoSkips(data);
      res.json(noSkipsAlbum);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      console.error('Add to no skips error:', error);
      res.status(500).json({ message: 'Failed to add album to no skips' });
    }
  });
  
  app.delete('/api/no-skips/:albumId', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const albumId = parseInt(req.params.albumId);
      
      if (isNaN(albumId)) {
        return res.status(400).json({ message: 'Invalid album ID' });
      }
      
      await storage.removeFromNoSkips(userId, albumId);
      res.json({ success: true });
    } catch (error) {
      console.error('Remove from no skips error:', error);
      res.status(500).json({ message: 'Failed to remove album from no skips' });
    }
  });
  
  app.post('/api/no-skips/top-four', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const schema = z.array(z.object({
        albumId: z.number(),
        position: z.number().min(1).max(4)
      })).max(4);
      
      const topFourAlbums = schema.parse(req.body);
      
      await storage.updateTopFour(userId, topFourAlbums);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      console.error('Update top four error:', error);
      res.status(500).json({ message: 'Failed to update top four albums' });
    }
  });

  app.post('/api/no-skips/custom-order', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate request body
      const schema = z.array(z.object({
        albumId: z.number(),
        customOrder: z.number()
      }));
      
      const albumOrders = schema.parse(req.body);
      
      await storage.updateNoSkipsOrder(userId, albumOrders);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      console.error('Update custom order error:', error);
      res.status(500).json({ message: 'Failed to update custom order' });
    }
  });
  
  // Album reviews routes
  app.get('/api/reviews', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const reviews = await storage.getAlbumReviews(userId);
      res.json(reviews);
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });
  
  app.get('/api/reviews/search', requireAuth, async (req, res) => {
    const { query } = req.query;
    
    if (typeof query !== 'string') {
      return res.status(400).json({ message: 'Invalid search query' });
    }
    
    try {
      const userId = req.user!.id;
      const reviews = await storage.searchAlbumReviews(userId, query);
      res.json(reviews);
    } catch (error) {
      console.error('Search reviews error:', error);
      res.status(500).json({ message: 'Failed to search reviews' });
    }
  });
  
  app.get('/api/reviews/:albumId', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const albumId = parseInt(req.params.albumId);
      
      if (isNaN(albumId)) {
        return res.status(400).json({ message: 'Invalid album ID' });
      }
      
      const review = await storage.getAlbumReview(userId, albumId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      res.json(review);
    } catch (error) {
      console.error('Get review error:', error);
      res.status(500).json({ message: 'Failed to fetch review' });
    }
  });
  
  app.post('/api/reviews', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Extract listened at date from request body if available
      let { listenedAt, ...restBody } = req.body;
      
      // Convert listenedAt string to Date object if provided
      if (listenedAt && typeof listenedAt === 'string') {
        try {
          const date = new Date(listenedAt);
          // Verify that the date is valid
          if (!isNaN(date.getTime())) {
            listenedAt = date;
          } else {
            console.warn('Invalid date format received:', listenedAt);
            listenedAt = null;
          }
        } catch (error) {
          console.error('Error parsing date:', error);
          listenedAt = null;
        }
      }
      
      const data = insertAlbumReviewSchema.parse({
        ...restBody,
        userId,
        reviewedAt: new Date(),
        listenedAt: listenedAt || new Date() // Default to current date if not provided
      });
      
      const review = await storage.createAlbumReview(data);
      res.json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      console.error('Create review error:', error);
      res.status(500).json({ message: 'Failed to create review' });
    }
  });
  
  app.put('/api/reviews/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid review ID' });
      }
      
      // Validate request body
      const schema = z.object({
        rating: z.union([z.number(), z.string()]).transform(val => {
          const num = typeof val === 'string' ? parseFloat(val) : val;
          return num;
        }).refine(val => val >= 0.5 && val <= 5 && val % 0.5 === 0, {
          message: "Rating must be between 0.5 and 5.0 in 0.5 increments"
        }),
        review: z.string().optional(),
        listenedAt: z.string().optional().transform(val => {
          if (!val) return undefined; // Keep undefined to preserve existing date
          try {
            const date = new Date(val);
            // Check if the date is valid
            if (isNaN(date.getTime())) return undefined;
            return date;
          } catch (error) {
            console.error('Invalid date format:', val);
            return undefined;
          }
        })
      });
      
      const { rating, review, listenedAt } = schema.parse(req.body);
      
      const updatedReview = await storage.updateAlbumReview(id, rating, review || '', listenedAt);
      
      if (!updatedReview) {
        return res.status(404).json({ message: 'Review not found' });
      }
      
      res.json(updatedReview);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      console.error('Update review error:', error);
      res.status(500).json({ message: 'Failed to update review' });
    }
  });

  // Delete review
  app.delete('/api/reviews/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid review ID' });
      }

      await storage.deleteAlbumReview(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete review error:', error);
      res.status(500).json({ message: 'Failed to delete review' });
    }
  });
  
  // No Skips reviews routes (separate from The List)
  app.get('/api/no-skips-reviews', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const reviews = await storage.getNoSkipsReviews(userId);
      res.json(reviews);
    } catch (error) {
      console.error('Get no skips reviews error:', error);
      res.status(500).json({ message: 'Failed to fetch no skips reviews' });
    }
  });
  
  app.get('/api/no-skips-reviews/:albumId', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const albumId = parseInt(req.params.albumId);
      
      if (isNaN(albumId)) {
        return res.status(400).json({ message: 'Invalid album ID' });
      }
      
      const review = await storage.getNoSkipsReview(userId, albumId);
      
      if (!review) {
        return res.status(404).json({ message: 'No skips review not found' });
      }
      
      res.json(review);
    } catch (error) {
      console.error('Get no skips review error:', error);
      res.status(500).json({ message: 'Failed to fetch no skips review' });
    }
  });
  
  app.post('/api/no-skips-reviews', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const data = insertNoSkipsReviewSchema.parse({
        ...req.body,
        userId,
        reviewedAt: new Date()
      });
      
      const review = await storage.createNoSkipsReview(data);
      res.json(review);
    } catch (error) {
      console.error('Create no skips review error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Failed to create no skips review' });
    }
  });
  
  app.put('/api/no-skips-reviews/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { review } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid review ID' });
      }
      
      if (typeof review !== 'string') {
        return res.status(400).json({ message: 'Review text is required' });
      }
      
      const updatedReview = await storage.updateNoSkipsReview(id, review);
      
      if (!updatedReview) {
        return res.status(404).json({ message: 'No skips review not found' });
      }
      
      res.json(updatedReview);
    } catch (error) {
      console.error('Update no skips review error:', error);
      res.status(500).json({ message: 'Failed to update no skips review' });
    }
  });
  
  app.delete('/api/no-skips-reviews/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid review ID' });
      }
      
      await storage.deleteNoSkipsReview(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete no skips review error:', error);
      res.status(500).json({ message: 'Failed to delete no skips review' });
    }
  });

  // Get shared user's No Skips collection (GET /api/shared/no-skips/:userId)
  app.get('/api/shared/no-skips/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId, 10);
      
      if (isNaN(userIdNum)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Get user info first to verify they exist
      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get all no skips albums for the user
      const noSkipsAlbums = await storage.getNoSkipsAlbums(userIdNum);
      
      // Get top four albums for the user
      const topFourAlbums = await storage.getTopFourAlbums(userIdNum);
      
      // Return user info (just username) and their collections
      res.json({
        username: user.username,
        noSkipsAlbums,
        topFourAlbums
      });
    } catch (error) {
      console.error('Error fetching shared No Skips collection:', error);
      res.status(500).json({ message: 'Failed to fetch shared collection' });
    }
  });

  // List share token routes
  app.post('/api/list/share', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const token = await storage.createListShareToken(userId);
      res.json(token);
    } catch (error) {
      console.error('Create list share token error:', error);
      res.status(500).json({ message: 'Failed to create share token' });
    }
  });

  app.get('/api/list/share', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const token = await storage.getListShareToken(userId);
      if (!token) {
        return res.status(404).json({ message: 'No share token found' });
      }
      res.json(token);
    } catch (error) {
      console.error('Get list share token error:', error);
      res.status(500).json({ message: 'Failed to get share token' });
    }
  });

  app.delete('/api/list/share', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.deleteListShareToken(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete list share token error:', error);
      res.status(500).json({ message: 'Failed to delete share token' });
    }
  });

  // Public endpoint to get shared list data
  app.get('/api/shared/list/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const data = await storage.getListShareDataByToken(token);
      
      if (!data) {
        return res.status(404).json({ message: 'Shared list not found' });
      }
      
      // Add CORS headers for embedding
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(data);
    } catch (error) {
      console.error('Get shared list error:', error);
      res.status(500).json({ message: 'Failed to get shared list' });
    }
  });

  // Catch-all routes at the end (after all specific routes are registered)
  app.get('/callback', (req, res) => {
    console.log('===== ROOT CALLBACK RECEIVED =====');
    console.log('Query params:', req.query);
    console.log('URL:', req.url);
    console.log('This might be Spotify redirecting to /callback instead of /api/auth/callback');
    res.redirect(`/api/auth/callback${req.url.substring(req.url.indexOf('?'))}`);
  });

  app.get('/api/auth/*', (req, res) => {
    console.log('===== UNHANDLED AUTH ROUTE =====');
    console.log('Path:', req.path);
    console.log('URL:', req.url);
    console.log('Query:', req.query);
    console.log('Headers:', req.headers);
    res.status(404).json({ message: 'Auth route not found', path: req.path, url: req.url });
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
