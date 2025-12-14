// Type definitions for The Shelf app
// These match the Supabase database schema

export interface Profile {
  id: string
  username: string
  email: string | null
  spotify_id: string | null
  access_token: string | null
  refresh_token: string | null
  token_expiry: string | null
  created_at: string
}

export interface Album {
  id: number
  spotify_id: string
  name: string
  artist: string
  image_url: string
  release_year: number | null
  genre: string | null
  energy_level: 'high' | 'medium' | 'low' | null
}

export interface QueueAlbum {
  id: number
  user_id: string
  album_id: number
  added_at: string
  album?: Album
}

export interface NoSkipsAlbum {
  id: number
  user_id: string
  album_id: number
  added_at: string
  is_top_four: boolean
  top_four_position: number | null
  custom_order: number | null
  album?: Album
}

export interface AlbumReview {
  id: number
  user_id: string
  album_id: number
  rating: number
  review: string | null
  reviewed_at: string
  listened_at: string | null
  album?: Album
}

export interface NoSkipsReview {
  id: number
  user_id: string
  album_id: number
  review: string | null
  reviewed_at: string
  album?: Album
}

export interface ListShareToken {
  id: number
  user_id: string
  token: string
  created_at: string
}

// Spotify API response types
export interface SpotifyAlbum {
  id: string
  name: string
  artists: { name: string }[]
  images: { url: string; height: number; width: number }[]
  release_date: string
  genres?: string[]
}

export interface SpotifySearchResponse {
  albums: {
    items: SpotifyAlbum[]
    total: number
  }
}
