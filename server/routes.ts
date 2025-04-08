import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  getSpotifyLoginUrl, 
  handleSpotifyAuth, 
  refreshAccessToken,
  getUserSavedAlbums,
  searchSpotifyAlbums,
  getAlbumDetails,
  processAndSaveAlbum
} from "./spotify";
import { 
  insertQueueAlbumSchema, 
  insertNoSkipsAlbumSchema, 
  insertAlbumReviewSchema 
} from "@shared/schema";
import { z } from "zod";

// Middleware to check if user is authenticated
async function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "User not found" });
  }
  
  // Check if token is expired and refresh if needed
  if (new Date(user.tokenExpiry) <= new Date()) {
    try {
      const tokenData = await refreshAccessToken(user.refreshToken);
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
      
      await storage.updateUserTokens(
        user.id,
        tokenData.access_token,
        tokenData.refresh_token || user.refreshToken,
        tokenExpiry
      );
    } catch (error) {
      console.error("Failed to refresh token:", error);
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Authentication expired" });
    }
  }
  
  next();
}

// Adding session type definitions
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session
  const session = await import('express-session');
  const memorystore = await import('memorystore');
  const MemoryStore = memorystore.default(session.default);
  
  app.use(session.default({
    cookie: { maxAge: 86400000 }, // 1 day
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'the-shelf-secret'
  }));
  
  // Authentication routes
  app.get('/api/auth/login', (req, res) => {
    const loginUrl = getSpotifyLoginUrl();
    res.json({ loginUrl });
  });
  
  app.get('/api/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (typeof code !== 'string') {
      return res.status(400).json({ message: 'Missing authorization code' });
    }
    
    try {
      const user = await handleSpotifyAuth(code);
      req.session.userId = user.id;
      res.redirect('/');
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });
  
  app.get('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  
  app.get('/api/auth/user', requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    res.json({
      id: user?.id,
      username: user?.username,
      spotifyId: user?.spotifyId
    });
  });
  
  // Album routes
  app.get('/api/spotify/albums/search', requireAuth, async (req, res) => {
    const { query } = req.query;
    
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ message: 'Invalid search query' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId!);
      const results = await searchSpotifyAlbums(user!.accessToken, query);
      
      const albums = [];
      for (const item of results.albums.items) {
        const album = await processAndSaveAlbum(item);
        albums.push(album);
      }
      
      res.json(albums);
    } catch (error) {
      console.error('Album search error:', error);
      res.status(500).json({ message: 'Failed to search albums' });
    }
  });
  
  app.get('/api/spotify/albums/saved', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      const results = await getUserSavedAlbums(user!.accessToken);
      
      const albums = [];
      for (const item of results.items) {
        const album = await processAndSaveAlbum(item.album);
        albums.push(album);
      }
      
      res.json(albums);
    } catch (error) {
      console.error('Saved albums error:', error);
      res.status(500).json({ message: 'Failed to fetch saved albums' });
    }
  });
  
  app.get('/api/spotify/albums/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    
    try {
      // First check if we have this album in our database
      let album = await storage.getAlbumBySpotifyId(id);
      
      if (!album) {
        // If not, fetch from Spotify API
        const user = await storage.getUser(req.session.userId!);
        const albumData = await getAlbumDetails(user!.accessToken, id);
        album = await processAndSaveAlbum(albumData);
      }
      
      res.json(album);
    } catch (error) {
      console.error('Album details error:', error);
      res.status(500).json({ message: 'Failed to fetch album details' });
    }
  });
  
  // Queue routes
  app.get('/api/queue', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const queueAlbums = await storage.getQueueAlbums(userId);
      res.json(queueAlbums);
    } catch (error) {
      console.error('Get queue error:', error);
      res.status(500).json({ message: 'Failed to fetch queue' });
    }
  });
  
  app.post('/api/queue', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const noSkipsAlbums = await storage.getNoSkipsAlbums(userId);
      res.json(noSkipsAlbums);
    } catch (error) {
      console.error('Get no skips error:', error);
      res.status(500).json({ message: 'Failed to fetch no skips albums' });
    }
  });
  
  app.get('/api/no-skips/top-four', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const topFourAlbums = await storage.getTopFourAlbums(userId);
      res.json(topFourAlbums);
    } catch (error) {
      console.error('Get top four error:', error);
      res.status(500).json({ message: 'Failed to fetch top four albums' });
    }
  });
  
  app.post('/api/no-skips', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      
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
  
  // Album reviews routes
  app.get('/api/reviews', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const reviews = await storage.searchAlbumReviews(userId, query);
      res.json(reviews);
    } catch (error) {
      console.error('Search reviews error:', error);
      res.status(500).json({ message: 'Failed to search reviews' });
    }
  });
  
  app.get('/api/reviews/:albumId', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
      const userId = req.session.userId!;
      const data = insertAlbumReviewSchema.parse({
        ...req.body,
        userId,
        reviewedAt: new Date()
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
        rating: z.number().min(1).max(5),
        review: z.string().optional()
      });
      
      const { rating, review } = schema.parse(req.body);
      
      const updatedReview = await storage.updateAlbumReview(id, rating, review || '');
      
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
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
