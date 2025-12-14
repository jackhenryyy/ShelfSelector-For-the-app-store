import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SpotifyAlbum } from "./use-spotify";

// Queue types
export interface QueueAlbum {
  id: number;
  userId: number;
  albumId: number;
  addedAt: string;
  album: SpotifyAlbum;
}

export function useQueueAlbums() {
  const queryClient = useQueryClient();

  // Get all albums in queue
  const { data: queueAlbums, isLoading } = useQuery<QueueAlbum[]>({
    queryKey: ['/api/queue'],
  });

  // Add album to queue
  const addToQueueMutation = useMutation({
    mutationFn: async (albumId: number) => {
      console.log('addToQueueMutation called with albumId:', albumId);
      const response = await apiRequest('/api/queue', {
        method: 'POST',
        body: JSON.stringify({ albumId }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Queue API response:', response);
      return response.json();
    },
    onSuccess: () => {
      console.log('Queue mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
    }
  });

  // Remove album from queue
  const removeFromQueueMutation = useMutation({
    mutationFn: async (albumId: number) => {
      await apiRequest(`/api/queue/${albumId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
    }
  });

  // Shuffle and get a random album from queue
  const getRandomQueueAlbum = useCallback(() => {
    if (!queueAlbums || queueAlbums.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * queueAlbums.length);
    return queueAlbums[randomIndex];
  }, [queueAlbums]);

  const isAlbumInQueue = useCallback((albumId: number) => {
    return queueAlbums?.some(qa => qa.albumId === albumId) ?? false;
  }, [queueAlbums]);

  return {
    queueAlbums,
    isLoading,
    addToQueue: (albumId: number) => addToQueueMutation.mutate(albumId),
    removeFromQueue: (albumId: number) => removeFromQueueMutation.mutate(albumId),
    isAddingToQueue: addToQueueMutation.isPending,
    isRemovingFromQueue: removeFromQueueMutation.isPending,
    getRandomQueueAlbum,
    isAlbumInQueue
  };
}

// No Skips types
export interface NoSkipsAlbum {
  id: number;
  userId: number;
  albumId: number;
  addedAt: string;
  isTopFour: boolean;
  topFourPosition?: number;
  album: SpotifyAlbum;
}

export function useNoSkipsAlbums() {
  const queryClient = useQueryClient();

  // Get all no skips albums
  const { data: noSkipsAlbums, isLoading } = useQuery<NoSkipsAlbum[]>({
    queryKey: ['/api/no-skips'],
  });

  // Get top four albums
  const { data: topFourAlbums } = useQuery<NoSkipsAlbum[]>({
    queryKey: ['/api/no-skips/top-four'],
  });

  // Add album to no skips
  const addToNoSkipsMutation = useMutation({
    mutationFn: async (data: { albumId: number; isTopFour?: boolean }) => {
      console.log('addToNoSkipsMutation called with data:', data);
      const response = await apiRequest('/api/no-skips', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('No skips API response:', response);
      return response.json();
    },
    onSuccess: () => {
      console.log('No skips mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/no-skips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/no-skips/top-four'] });
    }
  });

  // Remove album from no skips
  const removeFromNoSkipsMutation = useMutation({
    mutationFn: async (albumId: number) => {
      await apiRequest(`/api/no-skips/${albumId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/no-skips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/no-skips/top-four'] });
    }
  });

  // Update top four albums
  const updateTopFourMutation = useMutation({
    mutationFn: async (topFour: {albumId: number, position: number}[]) => {
      await apiRequest('/api/no-skips/top-four', {
        method: 'POST',
        body: JSON.stringify(topFour),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/no-skips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/no-skips/top-four'] });
    }
  });

  // Shuffle and get a random album from no skips
  const getRandomNoSkipsAlbum = useCallback(() => {
    if (!noSkipsAlbums || noSkipsAlbums.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * noSkipsAlbums.length);
    return noSkipsAlbums[randomIndex];
  }, [noSkipsAlbums]);

  const isAlbumInNoSkips = useCallback((albumId: number) => {
    return noSkipsAlbums?.some(nsa => nsa.albumId === albumId) ?? false;
  }, [noSkipsAlbums]);

  return {
    noSkipsAlbums,
    topFourAlbums,
    isLoading,
    addToNoSkips: (data: { albumId: number; isTopFour?: boolean }) => addToNoSkipsMutation.mutate(data),
    removeFromNoSkips: (albumId: number) => removeFromNoSkipsMutation.mutate(albumId),
    updateTopFour: (topFour: {albumId: number, position: number}[]) => updateTopFourMutation.mutate(topFour),
    isAddingToNoSkips: addToNoSkipsMutation.isPending,
    isRemovingFromNoSkips: removeFromNoSkipsMutation.isPending,
    isUpdatingTopFour: updateTopFourMutation.isPending,
    getRandomNoSkipsAlbum,
    isAlbumInNoSkips
  };
}

// Album Review types
export interface AlbumReview {
  id: number;
  userId: number;
  albumId: number;
  rating: number;
  review?: string;
  reviewedAt: string;
  listenedAt?: string;
  album: SpotifyAlbum;
}

export function useAlbumReviews() {
  const queryClient = useQueryClient();

  // Get all album reviews
  const { data: albumReviews, isLoading } = useQuery<AlbumReview[]>({
    queryKey: ['/api/reviews'],
  });

  // Get review for specific album (async function)
  const getAlbumReview = async (albumId: number): Promise<AlbumReview | null> => {
    try {
      const response = await apiRequest(`/api/reviews/${albumId}`);
      if (response.ok) {
        return await response.json();
      } else if (response.status === 404) {
        return null; // No review found
      } else {
        throw new Error(`Failed to fetch review: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching album review:', error);
      return null;
    }
  };

  // Search reviews
  const searchReviews = async (query: string): Promise<AlbumReview[]> => {
    if (!query.trim()) return albumReviews || [];
    
    const response = await apiRequest(`/api/reviews/search?query=${encodeURIComponent(query)}`);
    return response.json();
  };

  // Create/update review
  const createReviewMutation = useMutation({
    mutationFn: async (data: { albumId: number; rating: number; review?: string; listenedAt?: Date }) => {
      // Convert Date object to ISO string for API
      const formattedData = {
        ...data,
        listenedAt: data.listenedAt ? data.listenedAt.toISOString() : undefined
      };
      
      const response = await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(formattedData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
    }
  });

  // Update review
  const updateReviewMutation = useMutation({
    mutationFn: async (data: { id: number; rating: number; review?: string; listenedAt?: Date }) => {
      const { id, ...rest } = data;
      
      // Convert Date object to ISO string for API
      const formattedData = {
        ...rest,
        listenedAt: rest.listenedAt ? rest.listenedAt.toISOString() : undefined
      };
      
      const response = await apiRequest(`/api/reviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formattedData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews', variables.id] });
    }
  });

  // Delete review
  const deleteReviewMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/reviews/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
    }
  });

  const isAlbumInReviews = useCallback((albumId: number) => {
    return albumReviews?.some(ar => ar.albumId === albumId) ?? false;
  }, [albumReviews]);

  return {
    albumReviews,
    isLoading,
    getAlbumReview,
    searchReviews,
    createReview: (data: { albumId: number; rating: number; review?: string; listenedAt?: Date }) => 
      createReviewMutation.mutate(data),
    updateReview: (data: { id: number; rating: number; review?: string; listenedAt?: Date }) => 
      updateReviewMutation.mutate(data),
    deleteReview: (id: number) => deleteReviewMutation.mutate(id),
    isCreatingReview: createReviewMutation.isPending,
    isUpdatingReview: updateReviewMutation.isPending,
    isDeletingReview: deleteReviewMutation.isPending,
    isAlbumInReviews
  };
}
