import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "./db";
import connectPg from "connect-pg-simple";
import session from "express-session";
import {
  users, albums, queueAlbums, noSkipsAlbums, albumReviews,
  User, InsertUser,
  Album, InsertAlbum,
  QueueAlbum, InsertQueueAlbum,
  NoSkipsAlbum, InsertNoSkipsAlbum,
  AlbumReview, InsertAlbumReview
} from "@shared/schema";

export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySpotifyId(spotifyId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: number, accessToken: string, refreshToken: string, tokenExpiry: Date): Promise<User | undefined>;

  // Album operations
  getAlbum(id: number): Promise<Album | undefined>;
  getAlbumBySpotifyId(spotifyId: string): Promise<Album | undefined>;
  createAlbum(album: InsertAlbum): Promise<Album>;
  updateAlbum(id: number, genre: string | null): Promise<Album | undefined>;
  searchAlbums(query: string): Promise<Album[]>;

  // Queue operations
  getQueueAlbums(userId: number): Promise<(QueueAlbum & { album: Album })[]>;
  addToQueue(queueAlbum: InsertQueueAlbum): Promise<QueueAlbum>;
  removeFromQueue(userId: number, albumId: number): Promise<void>;

  // No Skips operations
  getNoSkipsAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]>;
  getTopFourAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]>;
  addToNoSkips(noSkipsAlbum: InsertNoSkipsAlbum): Promise<NoSkipsAlbum>;
  removeFromNoSkips(userId: number, albumId: number): Promise<void>;
  updateTopFour(userId: number, topFourAlbums: {albumId: number, position: number}[]): Promise<void>;

  // Album reviews operations
  getAlbumReviews(userId: number): Promise<(AlbumReview & { album: Album })[]>;
  getAlbumReview(userId: number, albumId: number): Promise<(AlbumReview & { album: Album }) | undefined>;
  createAlbumReview(review: InsertAlbumReview): Promise<AlbumReview>;
  updateAlbumReview(id: number, rating: number, review: string, listenedAt?: Date | null): Promise<AlbumReview | undefined>;
  searchAlbumReviews(userId: number, query: string): Promise<(AlbumReview & { album: Album })[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private albums: Map<number, Album>;
  private queueAlbums: Map<number, QueueAlbum>;
  private noSkipsAlbums: Map<number, NoSkipsAlbum>;
  private albumReviews: Map<number, AlbumReview>;
  private currentIds: {
    user: number;
    album: number;
    queueAlbum: number;
    noSkipsAlbum: number;
    albumReview: number;
  };
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.albums = new Map();
    this.queueAlbums = new Map();
    this.noSkipsAlbums = new Map();
    this.albumReviews = new Map();
    this.currentIds = {
      user: 1,
      album: 1,
      queueAlbum: 1,
      noSkipsAlbum: 1,
      albumReview: 1,
    };
    
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserBySpotifyId(spotifyId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.spotifyId === spotifyId
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.user++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUserTokens(id: number, accessToken: string, refreshToken: string, tokenExpiry: Date): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = { 
      ...user, 
      accessToken, 
      refreshToken, 
      tokenExpiry 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Album operations
  async getAlbum(id: number): Promise<Album | undefined> {
    return this.albums.get(id);
  }

  async getAlbumBySpotifyId(spotifyId: string): Promise<Album | undefined> {
    return Array.from(this.albums.values()).find(
      (album) => album.spotifyId === spotifyId
    );
  }

  async createAlbum(insertAlbum: InsertAlbum): Promise<Album> {
    const id = this.currentIds.album++;
    const album: Album = { ...insertAlbum, id };
    this.albums.set(id, album);
    return album;
  }

  async updateAlbum(id: number, genre: string | null): Promise<Album | undefined> {
    const album = this.albums.get(id);
    if (!album) return undefined;
    
    const updatedAlbum: Album = {
      ...album,
      genre
    };
    
    this.albums.set(id, updatedAlbum);
    return updatedAlbum;
  }

  async searchAlbums(query: string): Promise<Album[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.albums.values()).filter(
      (album) => 
        album.name.toLowerCase().includes(lowercaseQuery) || 
        album.artist.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Queue operations
  async getQueueAlbums(userId: number): Promise<(QueueAlbum & { album: Album })[]> {
    const queueAlbums = Array.from(this.queueAlbums.values()).filter(
      (queueAlbum) => queueAlbum.userId === userId
    );

    return queueAlbums.map(queueAlbum => {
      const album = this.albums.get(queueAlbum.albumId);
      if (!album) throw new Error(`Album with ID ${queueAlbum.albumId} not found`);
      return { ...queueAlbum, album };
    });
  }

  async addToQueue(insertQueueAlbum: InsertQueueAlbum): Promise<QueueAlbum> {
    const id = this.currentIds.queueAlbum++;
    const queueAlbum: QueueAlbum = { ...insertQueueAlbum, id };
    this.queueAlbums.set(id, queueAlbum);
    return queueAlbum;
  }

  async removeFromQueue(userId: number, albumId: number): Promise<void> {
    const queueAlbumId = Array.from(this.queueAlbums.entries()).find(
      ([_, queueAlbum]) => queueAlbum.userId === userId && queueAlbum.albumId === albumId
    )?.[0];

    if (queueAlbumId !== undefined) {
      this.queueAlbums.delete(queueAlbumId);
    }
  }

  // No Skips operations
  async getNoSkipsAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const noSkipsAlbums = Array.from(this.noSkipsAlbums.values()).filter(
      (noSkipsAlbum) => noSkipsAlbum.userId === userId
    );

    return noSkipsAlbums.map(noSkipsAlbum => {
      const album = this.albums.get(noSkipsAlbum.albumId);
      if (!album) throw new Error(`Album with ID ${noSkipsAlbum.albumId} not found`);
      return { ...noSkipsAlbum, album };
    });
  }

  async getTopFourAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const topFourAlbums = Array.from(this.noSkipsAlbums.values()).filter(
      (noSkipsAlbum) => noSkipsAlbum.userId === userId && noSkipsAlbum.isTopFour
    ).sort((a, b) => {
      if (a.topFourPosition !== undefined && b.topFourPosition !== undefined) {
        return a.topFourPosition - b.topFourPosition;
      }
      return 0;
    });

    return topFourAlbums.map(noSkipsAlbum => {
      const album = this.albums.get(noSkipsAlbum.albumId);
      if (!album) throw new Error(`Album with ID ${noSkipsAlbum.albumId} not found`);
      return { ...noSkipsAlbum, album };
    });
  }

  async addToNoSkips(insertNoSkipsAlbum: InsertNoSkipsAlbum): Promise<NoSkipsAlbum> {
    const id = this.currentIds.noSkipsAlbum++;
    const noSkipsAlbum: NoSkipsAlbum = { ...insertNoSkipsAlbum, id };
    this.noSkipsAlbums.set(id, noSkipsAlbum);
    return noSkipsAlbum;
  }

  async removeFromNoSkips(userId: number, albumId: number): Promise<void> {
    const noSkipsAlbumId = Array.from(this.noSkipsAlbums.entries()).find(
      ([_, noSkipsAlbum]) => noSkipsAlbum.userId === userId && noSkipsAlbum.albumId === albumId
    )?.[0];

    if (noSkipsAlbumId !== undefined) {
      this.noSkipsAlbums.delete(noSkipsAlbumId);
    }
  }

  async updateTopFour(userId: number, topFourAlbums: {albumId: number, position: number}[]): Promise<void> {
    // First reset all top four flags
    for (const [id, noSkipsAlbum] of this.noSkipsAlbums.entries()) {
      if (noSkipsAlbum.userId === userId && noSkipsAlbum.isTopFour) {
        this.noSkipsAlbums.set(id, {
          ...noSkipsAlbum,
          isTopFour: false,
          topFourPosition: undefined
        });
      }
    }

    // Then set the new top four
    for (const {albumId, position} of topFourAlbums) {
      const noSkipsAlbumId = Array.from(this.noSkipsAlbums.entries()).find(
        ([_, noSkipsAlbum]) => noSkipsAlbum.userId === userId && noSkipsAlbum.albumId === albumId
      )?.[0];

      if (noSkipsAlbumId !== undefined) {
        const noSkipsAlbum = this.noSkipsAlbums.get(noSkipsAlbumId);
        if (noSkipsAlbum) {
          this.noSkipsAlbums.set(noSkipsAlbumId, {
            ...noSkipsAlbum,
            isTopFour: true,
            topFourPosition: position
          });
        }
      }
    }
  }

  // Album reviews operations
  async getAlbumReviews(userId: number): Promise<(AlbumReview & { album: Album })[]> {
    const reviews = Array.from(this.albumReviews.values()).filter(
      (review) => review.userId === userId
    );

    return reviews.map(review => {
      const album = this.albums.get(review.albumId);
      if (!album) throw new Error(`Album with ID ${review.albumId} not found`);
      return { ...review, album };
    });
  }

  async getAlbumReview(userId: number, albumId: number): Promise<(AlbumReview & { album: Album }) | undefined> {
    const review = Array.from(this.albumReviews.values()).find(
      (review) => review.userId === userId && review.albumId === albumId
    );

    if (!review) return undefined;

    const album = this.albums.get(review.albumId);
    if (!album) throw new Error(`Album with ID ${review.albumId} not found`);

    return { ...review, album };
  }

  async createAlbumReview(insertReview: InsertAlbumReview): Promise<AlbumReview> {
    const id = this.currentIds.albumReview++;
    const review: AlbumReview = { ...insertReview, id };
    this.albumReviews.set(id, review);
    return review;
  }

  async updateAlbumReview(
    id: number, 
    rating: number, 
    review: string, 
    listenedAt: Date | null = null
  ): Promise<AlbumReview | undefined> {
    const existingReview = this.albumReviews.get(id);
    if (!existingReview) return undefined;

    const updatedReview: AlbumReview = {
      ...existingReview,
      rating,
      review,
      ...(listenedAt !== null && { listenedAt })
    };

    this.albumReviews.set(id, updatedReview);
    return updatedReview;
  }

  async searchAlbumReviews(userId: number, query: string): Promise<(AlbumReview & { album: Album })[]> {
    const lowercaseQuery = query.toLowerCase();
    const reviews = Array.from(this.albumReviews.values()).filter(
      (review) => review.userId === userId
    );

    const result: (AlbumReview & { album: Album })[] = [];

    for (const review of reviews) {
      const album = this.albums.get(review.albumId);
      if (!album) continue;

      if (
        album.name.toLowerCase().includes(lowercaseQuery) ||
        album.artist.toLowerCase().includes(lowercaseQuery) ||
        (review.review && review.review.toLowerCase().includes(lowercaseQuery))
      ) {
        result.push({ ...review, album });
      }
    }

    return result;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using 'any' temporarily to bypass type issues

  constructor() {
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserBySpotifyId(spotifyId: string): Promise<User | undefined> {
    if (!spotifyId) return undefined;
    const [user] = await db.select().from(users).where(eq(users.spotifyId, spotifyId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserTokens(
    id: number, 
    accessToken: string, 
    refreshToken: string, 
    tokenExpiry: Date
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ accessToken, refreshToken, tokenExpiry })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Album operations
  async getAlbum(id: number): Promise<Album | undefined> {
    const [album] = await db.select().from(albums).where(eq(albums.id, id));
    return album;
  }

  async getAlbumBySpotifyId(spotifyId: string): Promise<Album | undefined> {
    if (!spotifyId) return undefined;
    const [album] = await db.select().from(albums).where(eq(albums.spotifyId, spotifyId));
    return album;
  }

  async createAlbum(album: InsertAlbum): Promise<Album> {
    const [newAlbum] = await db.insert(albums).values(album).returning();
    return newAlbum;
  }

  async updateAlbum(id: number, genre: string | null): Promise<Album | undefined> {
    const [updatedAlbum] = await db
      .update(albums)
      .set({ genre })
      .where(eq(albums.id, id))
      .returning();
    return updatedAlbum;
  }

  async searchAlbums(query: string): Promise<Album[]> {
    return db
      .select()
      .from(albums)
      .where(
        or(
          ilike(albums.name, `%${query}%`),
          ilike(albums.artist, `%${query}%`)
        )
      );
  }

  // Queue operations
  async getQueueAlbums(userId: number): Promise<(QueueAlbum & { album: Album })[]> {
    const result = await db
      .select({
        queueAlbum: queueAlbums,
        album: albums
      })
      .from(queueAlbums)
      .innerJoin(albums, eq(queueAlbums.albumId, albums.id))
      .where(eq(queueAlbums.userId, userId));

    return result.map(item => ({
      ...item.queueAlbum,
      album: item.album
    }));
  }

  async addToQueue(queueAlbum: InsertQueueAlbum): Promise<QueueAlbum> {
    const [newQueueAlbum] = await db
      .insert(queueAlbums)
      .values(queueAlbum)
      .returning();
    return newQueueAlbum;
  }

  async removeFromQueue(userId: number, albumId: number): Promise<void> {
    await db
      .delete(queueAlbums)
      .where(
        and(
          eq(queueAlbums.userId, userId),
          eq(queueAlbums.albumId, albumId)
        )
      );
  }

  // No Skips operations
  async getNoSkipsAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const result = await db
      .select({
        noSkipsAlbum: noSkipsAlbums,
        album: albums
      })
      .from(noSkipsAlbums)
      .innerJoin(albums, eq(noSkipsAlbums.albumId, albums.id))
      .where(eq(noSkipsAlbums.userId, userId));

    return result.map(item => ({
      ...item.noSkipsAlbum,
      album: item.album
    }));
  }

  async getTopFourAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const result = await db
      .select({
        noSkipsAlbum: noSkipsAlbums,
        album: albums
      })
      .from(noSkipsAlbums)
      .innerJoin(albums, eq(noSkipsAlbums.albumId, albums.id))
      .where(
        and(
          eq(noSkipsAlbums.userId, userId),
          eq(noSkipsAlbums.isTopFour, true)
        )
      )
      .orderBy(noSkipsAlbums.topFourPosition);

    return result.map(item => ({
      ...item.noSkipsAlbum,
      album: item.album
    }));
  }

  async addToNoSkips(noSkipsAlbum: InsertNoSkipsAlbum): Promise<NoSkipsAlbum> {
    const [newNoSkipsAlbum] = await db
      .insert(noSkipsAlbums)
      .values(noSkipsAlbum)
      .returning();
    return newNoSkipsAlbum;
  }

  async removeFromNoSkips(userId: number, albumId: number): Promise<void> {
    await db
      .delete(noSkipsAlbums)
      .where(
        and(
          eq(noSkipsAlbums.userId, userId),
          eq(noSkipsAlbums.albumId, albumId)
        )
      );
  }

  async updateTopFour(userId: number, topFourAlbums: {albumId: number, position: number}[]): Promise<void> {
    // First, reset all top four flags for this user
    await db
      .update(noSkipsAlbums)
      .set({ isTopFour: false, topFourPosition: null })
      .where(
        and(
          eq(noSkipsAlbums.userId, userId),
          eq(noSkipsAlbums.isTopFour, true)
        )
      );

    // Then set the new top four
    for (const { albumId, position } of topFourAlbums) {
      await db
        .update(noSkipsAlbums)
        .set({ isTopFour: true, topFourPosition: position })
        .where(
          and(
            eq(noSkipsAlbums.userId, userId),
            eq(noSkipsAlbums.albumId, albumId)
          )
        );
    }
  }

  // Album reviews operations
  async getAlbumReviews(userId: number): Promise<(AlbumReview & { album: Album })[]> {
    const result = await db
      .select({
        albumReview: albumReviews,
        album: albums
      })
      .from(albumReviews)
      .innerJoin(albums, eq(albumReviews.albumId, albums.id))
      .where(eq(albumReviews.userId, userId));

    return result.map(item => ({
      ...item.albumReview,
      album: item.album
    }));
  }

  async getAlbumReview(userId: number, albumId: number): Promise<(AlbumReview & { album: Album }) | undefined> {
    const [result] = await db
      .select({
        albumReview: albumReviews,
        album: albums
      })
      .from(albumReviews)
      .innerJoin(albums, eq(albumReviews.albumId, albums.id))
      .where(
        and(
          eq(albumReviews.userId, userId),
          eq(albumReviews.albumId, albumId)
        )
      );

    if (!result) return undefined;

    return {
      ...result.albumReview,
      album: result.album
    };
  }

  async createAlbumReview(review: InsertAlbumReview): Promise<AlbumReview> {
    const [newReview] = await db
      .insert(albumReviews)
      .values(review)
      .returning();
    return newReview;
  }

  async updateAlbumReview(
    id: number, 
    rating: number, 
    review: string, 
    listenedAt: Date | null = null
  ): Promise<AlbumReview | undefined> {
    const [updatedReview] = await db
      .update(albumReviews)
      .set({ 
        rating, 
        review,
        listenedAt
      })
      .where(eq(albumReviews.id, id))
      .returning();
    return updatedReview;
  }

  async searchAlbumReviews(userId: number, query: string): Promise<(AlbumReview & { album: Album })[]> {
    const result = await db
      .select({
        albumReview: albumReviews,
        album: albums
      })
      .from(albumReviews)
      .innerJoin(albums, eq(albumReviews.albumId, albums.id))
      .where(
        and(
          eq(albumReviews.userId, userId),
          or(
            ilike(albums.name, `%${query}%`),
            ilike(albums.artist, `%${query}%`),
            ilike(albumReviews.review, `%${query}%`)
          )
        )
      );

    return result.map(item => ({
      ...item.albumReview,
      album: item.album
    }));
  }
}

// Use database storage
export const storage = new DatabaseStorage();
