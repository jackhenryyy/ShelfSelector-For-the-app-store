import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Album, QueueAlbum, NoSkipsAlbum, AlbumReview } from '../lib/types'
import { useAuth } from './useAuth'

// Hook for managing queue albums
export function useQueueAlbums() {
  const { user } = useAuth()
  const [queueAlbums, setQueueAlbums] = useState<QueueAlbum[]>([])
  const [loading, setLoading] = useState(false)

  const fetchQueueAlbums = useCallback(async () => {
    if (!user) return
    setLoading(true)
    
    const { data, error } = await supabase
      .from('queue_albums')
      .select(`
        *,
        album:albums(*)
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    if (!error && data) {
      setQueueAlbums(data as QueueAlbum[])
    }
    setLoading(false)
  }, [user])

  const addToQueue = async (albumId: number) => {
    if (!user) return
    
    const { error } = await supabase
      .from('queue_albums')
      .insert({
        user_id: user.id,
        album_id: albumId,
        added_at: new Date().toISOString(),
      })

    if (!error) {
      await fetchQueueAlbums()
    }
    return error
  }

  const removeFromQueue = async (albumId: number) => {
    if (!user) return
    
    const { error } = await supabase
      .from('queue_albums')
      .delete()
      .eq('user_id', user.id)
      .eq('album_id', albumId)

    if (!error) {
      await fetchQueueAlbums()
    }
    return error
  }

  const getRandomQueueAlbum = () => {
    if (queueAlbums.length === 0) return null
    const randomIndex = Math.floor(Math.random() * queueAlbums.length)
    return queueAlbums[randomIndex]
  }

  return {
    queueAlbums,
    loading,
    fetchQueueAlbums,
    addToQueue,
    removeFromQueue,
    getRandomQueueAlbum,
  }
}

// Hook for managing no skips albums
export function useNoSkipsAlbums() {
  const { user } = useAuth()
  const [noSkipsAlbums, setNoSkipsAlbums] = useState<NoSkipsAlbum[]>([])
  const [topFourAlbums, setTopFourAlbums] = useState<NoSkipsAlbum[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNoSkipsAlbums = useCallback(async () => {
    if (!user) return
    setLoading(true)
    
    const { data, error } = await supabase
      .from('no_skips_albums')
      .select(`
        *,
        album:albums(*)
      `)
      .eq('user_id', user.id)
      .order('custom_order', { ascending: true, nullsFirst: false })

    if (!error && data) {
      const albums = data as NoSkipsAlbum[]
      setNoSkipsAlbums(albums)
      setTopFourAlbums(
        albums
          .filter(a => a.is_top_four)
          .sort((a, b) => (a.top_four_position || 0) - (b.top_four_position || 0))
      )
    }
    setLoading(false)
  }, [user])

  const addToNoSkips = async (albumId: number) => {
    if (!user) return
    
    const { error } = await supabase
      .from('no_skips_albums')
      .insert({
        user_id: user.id,
        album_id: albumId,
        added_at: new Date().toISOString(),
        is_top_four: false,
      })

    if (!error) {
      await fetchNoSkipsAlbums()
    }
    return error
  }

  const removeFromNoSkips = async (albumId: number) => {
    if (!user) return
    
    const { error } = await supabase
      .from('no_skips_albums')
      .delete()
      .eq('user_id', user.id)
      .eq('album_id', albumId)

    if (!error) {
      await fetchNoSkipsAlbums()
    }
    return error
  }

  const updateTopFour = async (albums: { albumId: number; position: number }[]) => {
    if (!user) return

    // First, reset all top four
    await supabase
      .from('no_skips_albums')
      .update({ is_top_four: false, top_four_position: null })
      .eq('user_id', user.id)
      .eq('is_top_four', true)

    // Then set the new top four
    for (const { albumId, position } of albums) {
      await supabase
        .from('no_skips_albums')
        .update({ is_top_four: true, top_four_position: position })
        .eq('user_id', user.id)
        .eq('album_id', albumId)
    }

    await fetchNoSkipsAlbums()
  }

  return {
    noSkipsAlbums,
    topFourAlbums,
    loading,
    fetchNoSkipsAlbums,
    addToNoSkips,
    removeFromNoSkips,
    updateTopFour,
  }
}

// Hook for managing album reviews (The List)
export function useAlbumReviews() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<AlbumReview[]>([])
  const [loading, setLoading] = useState(false)

  const fetchReviews = useCallback(async () => {
    if (!user) return
    setLoading(true)
    
    const { data, error } = await supabase
      .from('album_reviews')
      .select(`
        *,
        album:albums(*)
      `)
      .eq('user_id', user.id)
      .order('reviewed_at', { ascending: false })

    if (!error && data) {
      setReviews(data as AlbumReview[])
    }
    setLoading(false)
  }, [user])

  const createReview = async (
    albumId: number,
    rating: number,
    review?: string,
    listenedAt?: Date
  ) => {
    if (!user) return

    const { error } = await supabase
      .from('album_reviews')
      .insert({
        user_id: user.id,
        album_id: albumId,
        rating,
        review: review || null,
        reviewed_at: new Date().toISOString(),
        listened_at: listenedAt?.toISOString() || null,
      })

    if (!error) {
      await fetchReviews()
    }
    return error
  }

  const updateReview = async (
    reviewId: number,
    rating: number,
    review?: string,
    listenedAt?: Date
  ) => {
    const { error } = await supabase
      .from('album_reviews')
      .update({
        rating,
        review: review || null,
        listened_at: listenedAt?.toISOString() || null,
      })
      .eq('id', reviewId)

    if (!error) {
      await fetchReviews()
    }
    return error
  }

  const deleteReview = async (reviewId: number) => {
    const { error } = await supabase
      .from('album_reviews')
      .delete()
      .eq('id', reviewId)

    if (!error) {
      await fetchReviews()
    }
    return error
  }

  return {
    reviews,
    loading,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
  }
}

// Hook for saving/getting albums from database
export function useAlbumDatabase() {
  const saveAlbum = async (spotifyAlbum: {
    spotify_id: string
    name: string
    artist: string
    image_url: string
    release_year?: number
    genre?: string
  }) => {
    // Check if album already exists
    const { data: existing } = await supabase
      .from('albums')
      .select('*')
      .eq('spotify_id', spotifyAlbum.spotify_id)
      .single()

    if (existing) {
      return existing as Album
    }

    // Insert new album
    const { data, error } = await supabase
      .from('albums')
      .insert(spotifyAlbum)
      .select()
      .single()

    if (error) throw error
    return data as Album
  }

  const getAlbum = async (id: number) => {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Album
  }

  const updateAlbumGenre = async (id: number, genre: string) => {
    const { data, error } = await supabase
      .from('albums')
      .update({ genre })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Album
  }

  return {
    saveAlbum,
    getAlbum,
    updateAlbumGenre,
  }
}
