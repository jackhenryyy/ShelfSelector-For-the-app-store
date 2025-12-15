import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface SpotifyUser {
  id: number;
  username: string;
  spotifyId: string;
}

// This auth function is no longer needed as we're using native auth system now
// Keeping the interface definition for type compatibility
export function useSpotifyAuth() {
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: () => {},
    logout: () => {}
  };
}

export interface SpotifyAlbum {
  id: number;
  spotifyId?: string | null;
  appleMusicId?: string | null;
  name: string;
  artist: string;
  imageUrl: string;
  releaseYear?: number;
  genre?: string;
}

export interface MusicConfig {
  musicService: 'spotify' | 'apple_music';
  spotifyConnected: boolean;
  appleMusicConnected: boolean;
  appleMusicAvailable: boolean;
}

export function useMusicConfig() {
  return useQuery<MusicConfig>({
    queryKey: ['/api/music/config']
  });
}

export function useSpotifyAlbums() {
  const queryClient = useQueryClient();
  const [searchResults, setSearchResults] = useState<SpotifyAlbum[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Get featured albums based on user's preferred music service
  const { data: savedAlbums, isLoading: isLoadingSaved } = useQuery<SpotifyAlbum[]>({
    queryKey: ['/api/music/albums/featured']
  });

  // Search albums using the unified endpoint (automatically uses user's preferred service)
  const searchAlbums = async (query: string): Promise<SpotifyAlbum[]> => {
    if (!query.trim()) return [];
    
    try {
      setIsSearching(true);
      const response = await apiRequest(`/api/music/albums/search?query=${encodeURIComponent(query)}`, {
        method: "GET",
      });
      const data = await response.json();
      setSearchResults(data);
      return data;
    } catch (error) {
      console.error('Error searching albums:', error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Get album details by database ID
  const getAlbumDetails = async (albumId: number): Promise<SpotifyAlbum> => {
    const response = await apiRequest(`/api/albums/${albumId}`, {
      method: "GET",
    });
    return response.json();
  };
  
  // Get album details by Spotify ID (backward compatibility)
  const getAlbumBySpotifyId = async (spotifyId: string): Promise<SpotifyAlbum> => {
    const response = await apiRequest(`/api/spotify/albums/${spotifyId}`, {
      method: "GET",
    });
    return response.json();
  };

  return {
    savedAlbums,
    isLoadingSaved,
    searchAlbums,
    getAlbumDetails,
    getAlbumBySpotifyId,
    searchResults,
    isSearching
  };
}

// Hook for Apple Music specific functionality (MusicKit JS integration)
export function useAppleMusic() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get developer token for initializing MusicKit
  const { data: tokenData } = useQuery<{ developerToken: string }>({
    queryKey: ['/api/apple-music/developer-token'],
    enabled: false // Only fetch when needed
  });
  
  // Save user token mutation
  const saveUserToken = useMutation({
    mutationFn: async (userToken: string) => {
      const response = await apiRequest('/api/apple-music/user-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken })
      });
      return response.json();
    }
  });
  
  return {
    isAuthorized,
    isInitialized,
    developerToken: tokenData?.developerToken,
    saveUserToken: saveUserToken.mutate
  };
}
