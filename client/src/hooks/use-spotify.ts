import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SpotifyUser {
  id: number;
  username: string;
  spotifyId: string;
}

export function useSpotifyAuth() {
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: user, isLoading: isLoadingUser, refetch } = useQuery<SpotifyUser | null>({
    queryKey: ['/api/auth/user'],
    throwOnError: false,
    retry: false,
    onError: () => null,
    staleTime: 0
  });

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('GET', '/api/auth/login');
      const { loginUrl } = await response.json();
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiRequest('GET', '/api/auth/logout');
      // Force refetch to update auth state
      await refetch();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refetch]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || isLoadingUser,
    login,
    logout
  };
}

export interface SpotifyAlbum {
  id: number;
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  releaseYear?: number;
  genre?: string;
}

export function useSpotifyAlbums() {
  const queryClient = useQueryClient();
  
  // Get saved albums from Spotify
  const { data: savedAlbums, isLoading: isLoadingSaved } = useQuery<SpotifyAlbum[]>({
    queryKey: ['/api/spotify/albums/saved'],
    onError: (error) => {
      console.error('Error fetching saved albums:', error);
    }
  });

  // Search albums
  const searchAlbums = async (query: string): Promise<SpotifyAlbum[]> => {
    if (!query.trim()) return [];
    
    const response = await apiRequest('GET', `/api/spotify/albums/search?query=${encodeURIComponent(query)}`);
    return response.json();
  };

  // Get album details
  const getAlbumDetails = async (spotifyId: string): Promise<SpotifyAlbum> => {
    const response = await apiRequest('GET', `/api/spotify/albums/${spotifyId}`);
    return response.json();
  };

  return {
    savedAlbums,
    isLoadingSaved,
    searchAlbums,
    getAlbumDetails
  };
}
