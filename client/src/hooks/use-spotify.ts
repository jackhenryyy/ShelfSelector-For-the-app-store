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
  const [musicKit, setMusicKit] = useState<any>(null);
  const queryClient = useQueryClient();
  
  // Get developer token for initializing MusicKit
  const { data: tokenData, refetch: fetchDeveloperToken } = useQuery<{ developerToken: string }>({
    queryKey: ['/api/apple-music/developer-token'],
    enabled: false
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
    },
    onSuccess: () => {
      setIsAuthorized(true);
      queryClient.invalidateQueries({ queryKey: ['/api/music/config'] });
    }
  });
  
  // Initialize MusicKit
  const initialize = useCallback(async () => {
    if (isInitialized || !window.MusicKit) {
      return;
    }
    
    try {
      // Fetch developer token
      const { data } = await fetchDeveloperToken();
      if (!data?.developerToken) {
        console.error('No developer token available');
        return;
      }
      
      // Configure and initialize MusicKit
      await window.MusicKit.configure({
        developerToken: data.developerToken,
        app: {
          name: 'the shelf',
          build: '1.0.0'
        }
      });
      
      const music = window.MusicKit.getInstance();
      setMusicKit(music);
      setIsInitialized(true);
      
      // Check if already authorized
      if (music.isAuthorized) {
        setIsAuthorized(true);
        // Save the user token to backend
        const userToken = music.musicUserToken;
        if (userToken) {
          saveUserToken.mutate(userToken);
        }
      }
    } catch (error) {
      console.error('Failed to initialize MusicKit:', error);
    }
  }, [isInitialized, fetchDeveloperToken, saveUserToken]);
  
  // Authorize user
  const authorize = useCallback(async () => {
    if (!musicKit) {
      console.error('MusicKit not initialized');
      return;
    }
    
    try {
      const userToken = await musicKit.authorize();
      if (userToken) {
        saveUserToken.mutate(userToken);
      }
    } catch (error) {
      console.error('Authorization failed:', error);
    }
  }, [musicKit, saveUserToken]);
  
  // Unauthorize user
  const unauthorize = useCallback(async () => {
    if (!musicKit) {
      return;
    }
    
    try {
      await musicKit.unauthorize();
      setIsAuthorized(false);
    } catch (error) {
      console.error('Unauthorization failed:', error);
    }
  }, [musicKit]);
  
  return {
    isAuthorized,
    isInitialized,
    musicKit,
    initialize,
    authorize,
    unauthorize,
    developerToken: tokenData?.developerToken,
    saveUserToken: saveUserToken.mutate
  };
}
