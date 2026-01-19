import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model with native authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  musicService: text("music_service").default("spotify"), // 'spotify' or 'apple_music'
  spotifyId: text("spotify_id").unique(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  // Apple Music specific fields
  appleMusicToken: text("apple_music_token"),
  appleMusicTokenExpiry: timestamp("apple_music_token_expiry"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  spotifyId: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiry: true,
  appleMusicToken: true,
  appleMusicTokenExpiry: true,
});

// Album model - supports both Spotify and Apple Music
export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  spotifyId: text("spotify_id").unique(), // Made nullable for Apple Music albums
  appleMusicId: text("apple_music_id").unique(), // Apple Music catalog ID
  name: text("name").notNull(),
  artist: text("artist").notNull(),
  imageUrl: text("image_url").notNull(),
  releaseYear: integer("release_year"),
  genre: text("genre"),
  energyLevel: text("energy_level"), // 'high', 'medium', or 'low'
});

export const insertAlbumSchema = createInsertSchema(albums).omit({
  id: true,
});

// User album collection (queue)
export const queueAlbums = pgTable("queue_albums", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  albumId: integer("album_id").notNull(),
  addedAt: timestamp("added_at").notNull(),
});

export const insertQueueAlbumSchema = createInsertSchema(queueAlbums).omit({
  id: true,
});

// User favorite albums (no skips)
export const noSkipsAlbums = pgTable("no_skips_albums", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  albumId: integer("album_id").notNull(),
  addedAt: timestamp("added_at").notNull(),
  isTopFour: boolean("is_top_four").default(false).notNull(),
  topFourPosition: integer("top_four_position"), // 1-4 if in top four
  customOrder: integer("custom_order"), // For custom drag-and-drop ordering
});

export const insertNoSkipsAlbumSchema = createInsertSchema(noSkipsAlbums).omit({
  id: true,
});

// User album reviews (the list)
export const albumReviews = pgTable("album_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  albumId: integer("album_id").notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull(), // 0.5-5.0 stars (half-star increments)
  review: text("review"), // One sentence review
  reviewedAt: timestamp("reviewed_at").notNull(),
  listenedAt: timestamp("listened_at"), // When the user listened to the album
});
// User album notes (per-user, like reviews)
export const albumNotes = pgTable("album_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  albumId: integer("album_id").notNull(),
  note: text("note"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAlbumNoteSchema = createInsertSchema(albumNotes).omit({
  id: true,
  updatedAt: true,
});

export const insertAlbumReviewSchema = createInsertSchema(albumReviews).omit({
  id: true,
}).extend({
  rating: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num;
  }).refine(val => val >= 0.5 && val <= 5 && val % 0.5 === 0, {
    message: "Rating must be between 0.5 and 5.0 in 0.5 increments"
  }),
});

// Separate table for No Skips reviews (not part of "The List")
export const noSkipsReviews = pgTable("no_skips_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  albumId: integer("album_id").notNull(),
  review: text("review"),
  reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
});

export const insertNoSkipsReviewSchema = createInsertSchema(noSkipsReviews).omit({
  id: true,
});

// List share tokens for embedding
export const listShareTokens = pgTable("list_share_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertListShareTokenSchema = createInsertSchema(listShareTokens).omit({
  id: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;

export type QueueAlbum = typeof queueAlbums.$inferSelect;
export type InsertQueueAlbum = z.infer<typeof insertQueueAlbumSchema>;

export type NoSkipsAlbum = typeof noSkipsAlbums.$inferSelect;
export type InsertNoSkipsAlbum = z.infer<typeof insertNoSkipsAlbumSchema>;

export type AlbumReview = typeof albumReviews.$inferSelect;
export type InsertAlbumReview = z.infer<typeof insertAlbumReviewSchema>;

export type AlbumNote = typeof albumNotes.$inferSelect;
export type InsertAlbumNote = z.infer<typeof insertAlbumNoteSchema>;

export type NoSkipsReview = typeof noSkipsReviews.$inferSelect;
export type InsertNoSkipsReview = z.infer<typeof insertNoSkipsReviewSchema>;

export type ListShareToken = typeof listShareTokens.$inferSelect;
export type InsertListShareToken = z.infer<typeof insertListShareTokenSchema>;
