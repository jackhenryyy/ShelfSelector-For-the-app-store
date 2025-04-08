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
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  releaseYear?: number;
  genre?: string;
}

export function useSpotifyAlbums() {
  const queryClient = useQueryClient();
  const [searchResults, setSearchResults] = useState<SpotifyAlbum[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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
    
    try {
      setIsSearching(true);
      const response = await apiRequest('GET', `/api/spotify/albums/search?query=${encodeURIComponent(query)}`);
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

  // Get album details
  const getAlbumDetails = async (spotifyId: string): Promise<SpotifyAlbum> => {
    const response = await apiRequest('GET', `/api/spotify/albums/${spotifyId}`);
    return response.json();
  };

  return {
    savedAlbums,
    isLoadingSaved,
    searchAlbums,
    getAlbumDetails,
    searchResults,
    isSearching
  };
}
