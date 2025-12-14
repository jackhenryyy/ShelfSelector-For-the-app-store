-- =====================================================
-- THE SHELF - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run this entire file in Supabase SQL Editor to set up your database
-- Go to: Your Project > SQL Editor > New Query > Paste this > Run

-- =====================================================
-- STEP 1: CREATE TABLES
-- =====================================================

-- Users table (extends Supabase auth.users)
-- Note: Supabase handles auth.users automatically, this stores additional profile data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  spotify_id TEXT UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Albums table - stores Spotify album metadata
CREATE TABLE IF NOT EXISTS public.albums (
  id SERIAL PRIMARY KEY,
  spotify_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  image_url TEXT NOT NULL,
  release_year INTEGER,
  genre TEXT,
  energy_level TEXT CHECK (energy_level IN ('high', 'medium', 'low'))
);

-- Queue albums - user's listening queue
CREATE TABLE IF NOT EXISTS public.queue_albums (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  album_id INTEGER REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, album_id)
);

-- No Skips albums - user's favorite albums
CREATE TABLE IF NOT EXISTS public.no_skips_albums (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  album_id INTEGER REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_top_four BOOLEAN DEFAULT FALSE NOT NULL,
  top_four_position INTEGER CHECK (top_four_position >= 1 AND top_four_position <= 4),
  custom_order INTEGER,
  UNIQUE(user_id, album_id)
);

-- Album reviews - user's diary/reviews (The List)
CREATE TABLE IF NOT EXISTS public.album_reviews (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  album_id INTEGER REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
  review TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  listened_at TIMESTAMPTZ,
  UNIQUE(user_id, album_id)
);

-- No Skips reviews - separate from The List
CREATE TABLE IF NOT EXISTS public.no_skips_reviews (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  album_id INTEGER REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
  review TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, album_id)
);

-- List share tokens - for embedding/sharing
CREATE TABLE IF NOT EXISTS public.list_share_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_queue_albums_user_id ON public.queue_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_no_skips_albums_user_id ON public.no_skips_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_album_reviews_user_id ON public.album_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_no_skips_reviews_user_id ON public.no_skips_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_albums_spotify_id ON public.albums(spotify_id);

-- =====================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================
-- This ensures users can only access their own data

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_skips_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.no_skips_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_share_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow public viewing of profiles for sharing features
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Albums policies (albums are shared/public since they're just metadata)
CREATE POLICY "Anyone can view albums"
  ON public.albums FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert albums"
  ON public.albums FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update albums"
  ON public.albums FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Queue albums policies
CREATE POLICY "Users can view their own queue"
  ON public.queue_albums FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own queue"
  ON public.queue_albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own queue"
  ON public.queue_albums FOR DELETE
  USING (auth.uid() = user_id);

-- No Skips albums policies
CREATE POLICY "Users can view their own no skips"
  ON public.no_skips_albums FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own no skips"
  ON public.no_skips_albums FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own no skips"
  ON public.no_skips_albums FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own no skips"
  ON public.no_skips_albums FOR DELETE
  USING (auth.uid() = user_id);

-- Public viewing for shared no skips
CREATE POLICY "Public can view no skips for sharing"
  ON public.no_skips_albums FOR SELECT
  USING (true);

-- Album reviews policies
CREATE POLICY "Users can view their own reviews"
  ON public.album_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reviews"
  ON public.album_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.album_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.album_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- No Skips reviews policies
CREATE POLICY "Users can view their own no skips reviews"
  ON public.no_skips_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own no skips reviews"
  ON public.no_skips_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own no skips reviews"
  ON public.no_skips_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own no skips reviews"
  ON public.no_skips_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Public viewing for shared no skips reviews
CREATE POLICY "Public can view no skips reviews for sharing"
  ON public.no_skips_reviews FOR SELECT
  USING (true);

-- List share tokens policies
CREATE POLICY "Users can view their own share token"
  ON public.list_share_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own share token"
  ON public.list_share_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own share token"
  ON public.list_share_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can lookup by token (for embed feature)
CREATE POLICY "Anyone can lookup by token"
  ON public.list_share_tokens FOR SELECT
  USING (true);

-- =====================================================
-- STEP 5: CREATE FUNCTIONS FOR COMPLEX OPERATIONS
-- =====================================================

-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get random album from queue
CREATE OR REPLACE FUNCTION public.get_random_queue_album(p_user_id UUID)
RETURNS TABLE (
  id INTEGER,
  album_id INTEGER,
  name TEXT,
  artist TEXT,
  image_url TEXT,
  genre TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.id,
    qa.album_id,
    a.name,
    a.artist,
    a.image_url,
    a.genre
  FROM public.queue_albums qa
  JOIN public.albums a ON qa.album_id = a.id
  WHERE qa.user_id = p_user_id
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's top four albums
CREATE OR REPLACE FUNCTION public.get_top_four(p_user_id UUID)
RETURNS TABLE (
  position INTEGER,
  album_id INTEGER,
  name TEXT,
  artist TEXT,
  image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nsa.top_four_position,
    nsa.album_id,
    a.name,
    a.artist,
    a.image_url
  FROM public.no_skips_albums nsa
  JOIN public.albums a ON nsa.album_id = a.id
  WHERE nsa.user_id = p_user_id AND nsa.is_top_four = true
  ORDER BY nsa.top_four_position;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

GRANT ALL ON public.albums TO authenticated;
GRANT SELECT ON public.albums TO anon;

GRANT ALL ON public.queue_albums TO authenticated;
GRANT SELECT ON public.queue_albums TO anon;

GRANT ALL ON public.no_skips_albums TO authenticated;
GRANT SELECT ON public.no_skips_albums TO anon;

GRANT ALL ON public.album_reviews TO authenticated;
GRANT SELECT ON public.album_reviews TO anon;

GRANT ALL ON public.no_skips_reviews TO authenticated;
GRANT SELECT ON public.no_skips_reviews TO anon;

GRANT ALL ON public.list_share_tokens TO authenticated;
GRANT SELECT ON public.list_share_tokens TO anon;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- DONE! Your Supabase database is ready.
-- =====================================================
