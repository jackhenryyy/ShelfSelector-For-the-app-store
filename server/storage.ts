import { and, eq, ilike, or } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";

import { db } from "./db";

import {
  albums,
  albumNotes,
  albumReviews,
  listShareTokens,
  noSkipsAlbums,
  noSkipsReviews,
  queueAlbums,
  users,
} from "@shared/schema";

import type {
  Album,
  AlbumNote,
  AlbumReview,
  InsertAlbum,
  InsertAlbumReview,
  InsertNoSkipsAlbum,
  InsertNoSkipsReview,
  InsertQueueAlbum,
  InsertUser,
  ListShareToken,
  NoSkipsAlbum,
  NoSkipsReview,
  QueueAlbum,
  User,
} from "@shared/schema";

export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySpotifyId(spotifyId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(
    id: number,
    accessToken: string,
    refreshToken: string,
    tokenExpiry: Date
  ): Promise<User | undefined>;

  // Album operations
  getAlbum(id: number): Promise<Album | undefined>;
  getAlbumBySpotifyId(spotifyId: string): Promise<Album | undefined>;
  getAlbumByAppleMusicId(appleMusicId: string): Promise<Album | undefined>;
  createAlbum(album: InsertAlbum): Promise<Album>;
  updateAlbum(id: number, genre: string | null): Promise<Album | undefined>;
  searchAlbums(query: string): Promise<Album[]>;

  // User music service operations
  updateUserMusicService(id: number, musicService: string): Promise<User | undefined>;
  updateUserAppleMusicToken(id: number, token: string, expiry: Date): Promise<User | undefined>;

  // Queue operations
  getQueueAlbums(userId: number): Promise<(QueueAlbum & { album: Album })[]>;
  addToQueue(queueAlbum: InsertQueueAlbum): Promise<QueueAlbum>;
  removeFromQueue(userId: number, albumId: number): Promise<void>;

  // No Skips operations
  getNoSkipsAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]>;
  getTopFourAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]>;
  addToNoSkips(noSkipsAlbum: InsertNoSkipsAlbum): Promise<NoSkipsAlbum>;
  removeFromNoSkips(userId: number, albumId: number): Promise<void>;
  updateTopFour(userId: number, topFourAlbums: { albumId: number; position: number }[]): Promise<void>;

  // Album reviews operations (The List)
  getAlbumReviews(userId: number): Promise<(AlbumReview & { album: Album })[]>;
  getAlbumReview(userId: number, albumId: number): Promise<(AlbumReview & { album: Album }) | undefined>;
  createAlbumReview(review: InsertAlbumReview): Promise<AlbumReview>;
  updateAlbumReview(
    id: number,
    rating: number,
    review: string,
    listenedAt?: Date | null
  ): Promise<AlbumReview | undefined>;
  deleteAlbumReview(id: number): Promise<void>;
  searchAlbumReviews(userId: number, query: string): Promise<(AlbumReview & { album: Album })[]>;

  // Album notes operations (per-user, like reviews)
  getAlbumNote(userId: number, albumId: number): Promise<AlbumNote | undefined>;
  upsertAlbumNote(userId: number, albumId: number, note: string | null): Promise<AlbumNote>;

  // No Skips reviews operations (separate from The List)
  getNoSkipsReviews(userId: number): Promise<(NoSkipsReview & { album: Album })[]>;
  getNoSkipsReview(userId: number, albumId: number): Promise<(NoSkipsReview & { album: Album }) | undefined>;
  createNoSkipsReview(review: InsertNoSkipsReview): Promise<NoSkipsReview>;
  updateNoSkipsReview(id: number, review: string): Promise<NoSkipsReview | undefined>;
  deleteNoSkipsReview(id: number): Promise<void>;

  // List share token operations
  createListShareToken(userId: number): Promise<ListShareToken>;
  getListShareToken(userId: number): Promise<ListShareToken | undefined>;
  getListShareDataByToken(
    token: string
  ): Promise<
    | {
        username: string;
        reviews: {
          rating: string;
          review: string | null;
          reviewedAt: Date;
          listenedAt: Date | null;
          album: {
            name: string;
            artist: string;
            imageUrl: string;
            spotifyId: string;
            genre: string | null;
          };
        }[];
      }
    | undefined
  >;
  deleteListShareToken(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private albums: Map<number, Album> = new Map();
  private queueAlbums: Map<number, QueueAlbum> = new Map();
  private noSkipsAlbums: Map<number, NoSkipsAlbum> = new Map();
  private albumReviews: Map<number, AlbumReview> = new Map();
  // Notes are per-user per-album, so a composite key is the simplest.
  private albumNotes: Map<string, AlbumNote> = new Map();

  private currentIds = {
    user: 1,
    album: 1,
    queueAlbum: 1,
    noSkipsAlbum: 1,
    albumReview: 1,
    albumNote: 1,
  };

  sessionStore: session.SessionStore;

  constructor() {
    // Mem session store for local/dev fallback
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const MemoryStore = require("memorystore")(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // --------------------
  // User operations
  // --------------------
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async getUserBySpotifyId(spotifyId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.spotifyId === spotifyId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.user++;

    // Fill in fields that the DB would default.
    const user: User = {
      ...(insertUser as any),
      id,
      createdAt: new Date(),
      musicService: (insertUser as any).musicService ?? "spotify",
      spotifyId: (insertUser as any).spotifyId ?? null,
      accessToken: (insertUser as any).accessToken ?? null,
      refreshToken: (insertUser as any).refreshToken ?? null,
      tokenExpiry: (insertUser as any).tokenExpiry ?? null,
      appleMusicToken: (insertUser as any).appleMusicToken ?? null,
      appleMusicTokenExpiry: (insertUser as any).appleMusicTokenExpiry ?? null,
    };

    this.users.set(id, user);
    return user;
  }

  async updateUserTokens(
    id: number,
    accessToken: string,
    refreshToken: string,
    tokenExpiry: Date
  ): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const updatedUser: User = { ...user, accessToken, refreshToken, tokenExpiry };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // --------------------
  // Album operations
  // --------------------
  async getAlbum(id: number): Promise<Album | undefined> {
    return this.albums.get(id);
  }

  async getAlbumBySpotifyId(spotifyId: string): Promise<Album | undefined> {
    return Array.from(this.albums.values()).find((a) => a.spotifyId === spotifyId);
  }

  async getAlbumByAppleMusicId(appleMusicId: string): Promise<Album | undefined> {
    return Array.from(this.albums.values()).find((a) => a.appleMusicId === appleMusicId);
  }

  async createAlbum(insertAlbum: InsertAlbum): Promise<Album> {
    const id = this.currentIds.album++;
    const album: Album = { ...(insertAlbum as any), id };
    this.albums.set(id, album);
    return album;
  }

  async updateAlbum(id: number, genre: string | null): Promise<Album | undefined> {
    const album = this.albums.get(id);
    if (!album) return undefined;
    const updated: Album = { ...album, genre };
    this.albums.set(id, updated);
    return updated;
  }

  async searchAlbums(query: string): Promise<Album[]> {
    const q = query.toLowerCase();
    return Array.from(this.albums.values()).filter(
      (a) => a.name.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
    );
  }

  // --------------------
  // User music service operations
  // --------------------
  async updateUserMusicService(id: number, musicService: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const updated: User = { ...user, musicService };
    this.users.set(id, updated);
    return updated;
  }

  async updateUserAppleMusicToken(id: number, token: string, expiry: Date): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const updated: User = { ...user, appleMusicToken: token, appleMusicTokenExpiry: expiry };
    this.users.set(id, updated);
    return updated;
  }

  // --------------------
  // Queue operations
  // --------------------
  async getQueueAlbums(userId: number): Promise<(QueueAlbum & { album: Album })[]> {
    const rows = Array.from(this.queueAlbums.values()).filter((qa) => qa.userId === userId);
    return rows.map((qa) => {
      const album = this.albums.get(qa.albumId);
      if (!album) throw new Error(`Album with ID ${qa.albumId} not found`);
      return { ...qa, album };
    });
  }

  async addToQueue(insertQueueAlbum: InsertQueueAlbum): Promise<QueueAlbum> {
    const id = this.currentIds.queueAlbum++;
    const qa: QueueAlbum = { ...(insertQueueAlbum as any), id };
    this.queueAlbums.set(id, qa);
    return qa;
  }

  async removeFromQueue(userId: number, albumId: number): Promise<void> {
    const key = Array.from(this.queueAlbums.entries()).find(
      ([, qa]) => qa.userId === userId && qa.albumId === albumId
    )?.[0];
    if (key !== undefined) this.queueAlbums.delete(key);
  }

  // --------------------
  // No Skips operations
  // --------------------
  async getNoSkipsAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const rows = Array.from(this.noSkipsAlbums.values()).filter((ns) => ns.userId === userId);
    return rows.map((ns) => {
      const album = this.albums.get(ns.albumId);
      if (!album) throw new Error(`Album with ID ${ns.albumId} not found`);
      return { ...ns, album };
    });
  }

  async getTopFourAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const rows = Array.from(this.noSkipsAlbums.values())
      .filter((ns) => ns.userId === userId && ns.isTopFour)
      .sort((a, b) => (a.topFourPosition ?? 0) - (b.topFourPosition ?? 0));
    return rows.map((ns) => {
      const album = this.albums.get(ns.albumId);
      if (!album) throw new Error(`Album with ID ${ns.albumId} not found`);
      return { ...ns, album };
    });
  }

  async addToNoSkips(insertNoSkipsAlbum: InsertNoSkipsAlbum): Promise<NoSkipsAlbum> {
    const id = this.currentIds.noSkipsAlbum++;
    const ns: NoSkipsAlbum = { ...(insertNoSkipsAlbum as any), id };
    this.noSkipsAlbums.set(id, ns);
    return ns;
  }

  async removeFromNoSkips(userId: number, albumId: number): Promise<void> {
    const key = Array.from(this.noSkipsAlbums.entries()).find(
      ([, ns]) => ns.userId === userId && ns.albumId === albumId
    )?.[0];
    if (key !== undefined) this.noSkipsAlbums.delete(key);
  }

  async updateTopFour(userId: number, topFourAlbums: { albumId: number; position: number }[]): Promise<void> {
    // Reset
    for (const [id, ns] of this.noSkipsAlbums.entries()) {
      if (ns.userId === userId && ns.isTopFour) {
        this.noSkipsAlbums.set(id, { ...ns, isTopFour: false, topFourPosition: null });
      }
    }

    // Apply
    for (const { albumId, position } of topFourAlbums) {
      const key = Array.from(this.noSkipsAlbums.entries()).find(
        ([, ns]) => ns.userId === userId && ns.albumId === albumId
      )?.[0];
      if (key === undefined) continue;
      const existing = this.noSkipsAlbums.get(key);
      if (!existing) continue;
      this.noSkipsAlbums.set(key, { ...existing, isTopFour: true, topFourPosition: position });
    }
  }

  // --------------------
  // Album reviews operations
  // --------------------
  async getAlbumReviews(userId: number): Promise<(AlbumReview & { album: Album })[]> {
    const rows = Array.from(this.albumReviews.values()).filter((r) => r.userId === userId);
    return rows.map((r) => {
      const album = this.albums.get(r.albumId);
      if (!album) throw new Error(`Album with ID ${r.albumId} not found`);
      return { ...r, album };
    });
  }

  async getAlbumReview(userId: number, albumId: number): Promise<(AlbumReview & { album: Album }) | undefined> {
    const review = Array.from(this.albumReviews.values()).find(
      (r) => r.userId === userId && r.albumId === albumId
    );
    if (!review) return undefined;
    const album = this.albums.get(review.albumId);
    if (!album) throw new Error(`Album with ID ${review.albumId} not found`);
    return { ...review, album };
  }

  async createAlbumReview(insertReview: InsertAlbumReview): Promise<AlbumReview> {
    const id = this.currentIds.albumReview++;
    const review: AlbumReview = { ...(insertReview as any), id };
    this.albumReviews.set(id, review);
    return review;
  }

  async updateAlbumReview(
    id: number,
    rating: number,
    review: string,
    listenedAt: Date | null = null
  ): Promise<AlbumReview | undefined> {
    const existing = this.albumReviews.get(id);
    if (!existing) return undefined;
    const updated: AlbumReview = {
      ...existing,
      rating,
      review,
      listenedAt,
    };
    this.albumReviews.set(id, updated);
    return updated;
  }

  async deleteAlbumReview(id: number): Promise<void> {
    this.albumReviews.delete(id);
  }

  async searchAlbumReviews(userId: number, query: string): Promise<(AlbumReview & { album: Album })[]> {
    const q = query.toLowerCase();
    const rows = Array.from(this.albumReviews.values()).filter((r) => r.userId === userId);

    const out: (AlbumReview & { album: Album })[] = [];
    for (const r of rows) {
      const album = this.albums.get(r.albumId);
      if (!album) continue;
      if (
        album.name.toLowerCase().includes(q) ||
        album.artist.toLowerCase().includes(q) ||
        (r.review && r.review.toLowerCase().includes(q))
      ) {
        out.push({ ...r, album });
      }
    }
    return out;
  }

  // --------------------
  // Album notes operations
  // --------------------
  private makeNoteKey(userId: number, albumId: number) {
    return `${userId}:${albumId}`;
  }

  async getAlbumNote(userId: number, albumId: number): Promise<AlbumNote | undefined> {
    return this.albumNotes.get(this.makeNoteKey(userId, albumId));
  }

  async upsertAlbumNote(userId: number, albumId: number, note: string | null): Promise<AlbumNote> {
    const key = this.makeNoteKey(userId, albumId);
    const existing = this.albumNotes.get(key);

    if (existing) {
      const updated: AlbumNote = { ...existing, note, updatedAt: new Date() };
      this.albumNotes.set(key, updated);
      return updated;
    }

    const created: AlbumNote = {
      id: this.currentIds.albumNote++,
      userId,
      albumId,
      note,
      updatedAt: new Date(),
    };

    this.albumNotes.set(key, created);
    return created;
  }

  // --------------------
  // No Skips reviews operations (stub - not implemented for MemStorage)
  // --------------------
  async getNoSkipsReviews(_userId: number): Promise<(NoSkipsReview & { album: Album })[]> {
    return [];
  }

  async getNoSkipsReview(_userId: number, _albumId: number): Promise<(NoSkipsReview & { album: Album }) | undefined> {
    return undefined;
  }

  async createNoSkipsReview(_review: InsertNoSkipsReview): Promise<NoSkipsReview> {
    throw new Error("Not implemented in MemStorage");
  }

  async updateNoSkipsReview(_id: number, _review: string): Promise<NoSkipsReview | undefined> {
    return undefined;
  }

  async deleteNoSkipsReview(_id: number): Promise<void> {
    // Not implemented
  }

  // --------------------
  // List share token operations (stub - not implemented for MemStorage)
  // --------------------
  async createListShareToken(_userId: number): Promise<ListShareToken> {
    throw new Error("Not implemented in MemStorage");
  }

  async getListShareToken(_userId: number): Promise<ListShareToken | undefined> {
    return undefined;
  }

  async getListShareDataByToken(
    _token: string
  ): Promise<
    | {
        username: string;
        reviews: {
          rating: string;
          review: string | null;
          reviewedAt: Date;
          listenedAt: Date | null;
          album: { name: string; artist: string; imageUrl: string; spotifyId: string; genre: string | null };
        }[];
      }
    | undefined
  > {
    return undefined;
  }

  async deleteListShareToken(_userId: number): Promise<void> {
    // Not implemented
  }
}

export class DatabaseStorage implements IStorage {
  // Using `any` here because connect-pg-simple's types don't line up cleanly with express-session.
  sessionStore: any;

  constructor() {
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    });
  }

  // --------------------
  // User operations
  // --------------------
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

  async updateUserTokens(id: number, accessToken: string, refreshToken: string, tokenExpiry: Date): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ accessToken, refreshToken, tokenExpiry })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // --------------------
  // Album operations
  // --------------------
  async getAlbum(id: number): Promise<Album | undefined> {
    const [album] = await db.select().from(albums).where(eq(albums.id, id));
    return album;
  }

  async getAlbumBySpotifyId(spotifyId: string): Promise<Album | undefined> {
    if (!spotifyId) return undefined;
    const [album] = await db.select().from(albums).where(eq(albums.spotifyId, spotifyId));
    return album;
  }

  async getAlbumByAppleMusicId(appleMusicId: string): Promise<Album | undefined> {
    if (!appleMusicId) return undefined;
    const [album] = await db.select().from(albums).where(eq(albums.appleMusicId, appleMusicId));
    return album;
  }

  async updateUserMusicService(id: number, musicService: string): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set({ musicService }).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async updateUserAppleMusicToken(id: number, token: string, expiry: Date): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ appleMusicToken: token, appleMusicTokenExpiry: expiry })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async createAlbum(album: InsertAlbum): Promise<Album> {
    const [newAlbum] = await db.insert(albums).values(album).returning();
    return newAlbum;
  }

  async updateAlbum(id: number, genre: string | null): Promise<Album | undefined> {
    const [updatedAlbum] = await db.update(albums).set({ genre }).where(eq(albums.id, id)).returning();
    return updatedAlbum;
  }

  async searchAlbums(query: string): Promise<Album[]> {
    return db
      .select()
      .from(albums)
      .where(or(ilike(albums.name, `%${query}%`), ilike(albums.artist, `%${query}%`)));
  }

  // --------------------
  // Queue operations
  // --------------------
  async getQueueAlbums(userId: number): Promise<(QueueAlbum & { album: Album })[]> {
    const result = await db
      .select({ queueAlbum: queueAlbums, album: albums })
      .from(queueAlbums)
      .innerJoin(albums, eq(queueAlbums.albumId, albums.id))
      .where(eq(queueAlbums.userId, userId));

    return result.map((item) => ({ ...item.queueAlbum, album: item.album }));
  }

  async addToQueue(queueAlbum: InsertQueueAlbum): Promise<QueueAlbum> {
    const [newQueueAlbum] = await db.insert(queueAlbums).values(queueAlbum).returning();
    return newQueueAlbum;
  }

  async removeFromQueue(userId: number, albumId: number): Promise<void> {
    await db.delete(queueAlbums).where(and(eq(queueAlbums.userId, userId), eq(queueAlbums.albumId, albumId)));
  }

  // --------------------
  // No Skips operations
  // --------------------
  async getNoSkipsAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const result = await db
      .select({ noSkipsAlbum: noSkipsAlbums, album: albums })
      .from(noSkipsAlbums)
      .innerJoin(albums, eq(noSkipsAlbums.albumId, albums.id))
      .where(eq(noSkipsAlbums.userId, userId));

    return result.map((item) => ({ ...item.noSkipsAlbum, album: item.album }));
  }

  async getTopFourAlbums(userId: number): Promise<(NoSkipsAlbum & { album: Album })[]> {
    const result = await db
      .select({ noSkipsAlbum: noSkipsAlbums, album: albums })
      .from(noSkipsAlbums)
      .innerJoin(albums, eq(noSkipsAlbums.albumId, albums.id))
      .where(and(eq(noSkipsAlbums.userId, userId), eq(noSkipsAlbums.isTopFour, true)))
      .orderBy(noSkipsAlbums.topFourPosition);

    return result.map((item) => ({ ...item.noSkipsAlbum, album: item.album }));
  }

  async addToNoSkips(noSkipsAlbum: InsertNoSkipsAlbum): Promise<NoSkipsAlbum> {
    const [newNoSkipsAlbum] = await db.insert(noSkipsAlbums).values(noSkipsAlbum).returning();
    return newNoSkipsAlbum;
  }

  // This exists in the project already (even though it's not in IStorage) and is used by the UI.
  async updateNoSkipsOrder(userId: number, albumOrders: { albumId: number; customOrder: number }[]): Promise<void> {
    for (const { albumId, customOrder } of albumOrders) {
      await db
        .update(noSkipsAlbums)
        .set({ customOrder })
        .where(and(eq(noSkipsAlbums.userId, userId), eq(noSkipsAlbums.albumId, albumId)));
    }
  }

  async removeFromNoSkips(userId: number, albumId: number): Promise<void> {
    await db.delete(noSkipsAlbums).where(and(eq(noSkipsAlbums.userId, userId), eq(noSkipsAlbums.albumId, albumId)));
  }

  async updateTopFour(userId: number, topFourAlbums: { albumId: number; position: number }[]): Promise<void> {
    // First, reset all top four flags for this user
    await db
      .update(noSkipsAlbums)
      .set({ isTopFour: false, topFourPosition: null })
      .where(and(eq(noSkipsAlbums.userId, userId), eq(noSkipsAlbums.isTopFour, true)));

    // Then set the new top four
    for (const { albumId, position } of topFourAlbums) {
      await db
        .update(noSkipsAlbums)
        .set({ isTopFour: true, topFourPosition: position })
        .where(and(eq(noSkipsAlbums.userId, userId), eq(noSkipsAlbums.albumId, albumId)));
    }
  }

  // --------------------
  // Album reviews operations
  // --------------------
  async getAlbumReviews(userId: number): Promise<(AlbumReview & { album: Album })[]> {
    const result = await db
      .select({ albumReview: albumReviews, album: albums })
      .from(albumReviews)
      .innerJoin(albums, eq(albumReviews.albumId, albums.id))
      .where(eq(albumReviews.userId, userId));

    return result.map((item) => ({ ...item.albumReview, album: item.album }));
  }

  async getAlbumReview(userId: number, albumId: number): Promise<(AlbumReview & { album: Album }) | undefined> {
    const [result] = await db
      .select({ albumReview: albumReviews, album: albums })
      .from(albumReviews)
      .innerJoin(albums, eq(albumReviews.albumId, albums.id))
      .where(and(eq(albumReviews.userId, userId), eq(albumReviews.albumId, albumId)));

    if (!result) return undefined;
    return { ...result.albumReview, album: result.album };
  }

  async createAlbumReview(review: InsertAlbumReview): Promise<AlbumReview> {
    const [newReview] = await db.insert(albumReviews).values(review).returning();
    return newReview;
  }

  async updateAlbumReview(id: number, rating: number, review: string, listenedAt: Date | null = null): Promise<AlbumReview | undefined> {
    const [updatedReview] = await db
      .update(albumReviews)
      .set({ rating, review, listenedAt })
      .where(eq(albumReviews.id, id))
      .returning();
    return updatedReview;
  }

  async deleteAlbumReview(id: number): Promise<void> {
    await db.delete(albumReviews).where(eq(albumReviews.id, id));
  }

  async searchAlbumReviews(userId: number, query: string): Promise<(AlbumReview & { album: Album })[]> {
    const result = await db
      .select({ albumReview: albumReviews, album: albums })
      .from(albumReviews)
      .innerJoin(albums, eq(albumReviews.albumId, albums.id))
      .where(
        and(
          eq(albumReviews.userId, userId),
          or(ilike(albums.name, `%${query}%`), ilike(albums.artist, `%${query}%`), ilike(albumReviews.review, `%${query}%`))
        )
      );

    return result.map((item) => ({ ...item.albumReview, album: item.album }));
  }

  // --------------------
  // Album notes operations
  // --------------------
  async getAlbumNote(userId: number, albumId: number): Promise<AlbumNote | undefined> {
    const [row] = await db
      .select()
      .from(albumNotes)
      .where(and(eq(albumNotes.userId, userId), eq(albumNotes.albumId, albumId)));
    return row;
  }

  async upsertAlbumNote(userId: number, albumId: number, note: string | null): Promise<AlbumNote> {
    const now = new Date();
    const [row] = await db
      .insert(albumNotes)
      .values({ userId, albumId, note, updatedAt: now } as any)
      .onConflictDoUpdate({
        target: [albumNotes.userId, albumNotes.albumId],
        set: { note, updatedAt: now },
      })
      .returning();

    return row;
  }

  // --------------------
  // No Skips reviews operations (separate from The List)
  // --------------------
  async getNoSkipsReviews(userId: number): Promise<(NoSkipsReview & { album: Album })[]> {
    const result = await db
      .select({ noSkipsReview: noSkipsReviews, album: albums })
      .from(noSkipsReviews)
      .innerJoin(albums, eq(noSkipsReviews.albumId, albums.id))
      .where(eq(noSkipsReviews.userId, userId));

    return result.map((item) => ({ ...item.noSkipsReview, album: item.album }));
  }

  async getNoSkipsReview(userId: number, albumId: number): Promise<(NoSkipsReview & { album: Album }) | undefined> {
    const [result] = await db
      .select({ noSkipsReview: noSkipsReviews, album: albums })
      .from(noSkipsReviews)
      .innerJoin(albums, eq(noSkipsReviews.albumId, albums.id))
      .where(and(eq(noSkipsReviews.userId, userId), eq(noSkipsReviews.albumId, albumId)));

    if (!result) return undefined;
    return { ...result.noSkipsReview, album: result.album };
  }

  async createNoSkipsReview(review: InsertNoSkipsReview): Promise<NoSkipsReview> {
    const [newReview] = await db.insert(noSkipsReviews).values(review).returning();
    return newReview;
  }

  async updateNoSkipsReview(id: number, review: string): Promise<NoSkipsReview | undefined> {
    const [updatedReview] = await db.update(noSkipsReviews).set({ review }).where(eq(noSkipsReviews.id, id)).returning();
    return updatedReview;
  }

  async deleteNoSkipsReview(id: number): Promise<void> {
    await db.delete(noSkipsReviews).where(eq(noSkipsReviews.id, id));
  }

  // --------------------
  // List share token operations
  // --------------------
  async createListShareToken(userId: number): Promise<ListShareToken> {
    const token = crypto.randomUUID();
    const [newToken] = await db
      .insert(listShareTokens)
      .values({ userId, token, createdAt: new Date() })
      .onConflictDoUpdate({
        target: listShareTokens.userId,
        set: { token, createdAt: new Date() },
      })
      .returning();
    return newToken;
  }

  async getListShareToken(userId: number): Promise<ListShareToken | undefined> {
    const [token] = await db.select().from(listShareTokens).where(eq(listShareTokens.userId, userId));
    return token;
  }

  async getListShareDataByToken(token: string): Promise<
    | {
        username: string;
        reviews: {
          rating: string;
          review: string | null;
          reviewedAt: Date;
          listenedAt: Date | null;
          album: { name: string; artist: string; imageUrl: string; spotifyId: string; genre: string | null };
        }[];
      }
    | undefined
  > {
    const [shareToken] = await db.select().from(listShareTokens).where(eq(listShareTokens.token, token));
    if (!shareToken) return undefined;

    const [user] = await db.select().from(users).where(eq(users.id, shareToken.userId));
    if (!user) return undefined;

    const result = await db
      .select({ albumReview: albumReviews, album: albums })
      .from(albumReviews)
      .innerJoin(albums, eq(albumReviews.albumId, albums.id))
      .where(eq(albumReviews.userId, shareToken.userId));

    const reviews = result.map((item) => ({
      rating: item.albumReview.rating,
      review: item.albumReview.review,
      reviewedAt: item.albumReview.reviewedAt,
      listenedAt: item.albumReview.listenedAt,
      album: {
        name: item.album.name,
        artist: item.album.artist,
        imageUrl: item.album.imageUrl,
        spotifyId: item.album.spotifyId,
        genre: item.album.genre,
      },
    }));

    return { username: user.username, reviews };
  }

  async deleteListShareToken(userId: number): Promise<void> {
    await db.delete(listShareTokens).where(eq(listShareTokens.userId, userId));
  }
}

// Use database storage by default
export const storage = new DatabaseStorage();
