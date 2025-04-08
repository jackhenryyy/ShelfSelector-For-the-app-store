import { useEffect, useState } from "react";
import { useSpotifyAlbums } from "@/hooks/use-spotify";
import { BlurredBackground } from "./blurred-background";

interface AlbumCollageBackgroundProps {
  count?: number;
  refreshInterval?: number; // in milliseconds
}

export function AlbumCollageBackground({
  count = 10,
  refreshInterval = 10000,
}: AlbumCollageBackgroundProps) {
  const { searchAlbums } = useSpotifyAlbums();
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // List of search queries for various popular music genres
  const searchQueries = [
    "pop", "rock", "hip hop", "jazz", "classical", 
    "electronic", "indie", "folk", "reggae", "punk",
    "metal", "soul", "r&b", "blues", "country"
  ];

  // Function to get a random album cover
  const getRandomAlbumCover = async () => {
    setIsLoading(true);
    try {
      // Pick a random search query
      const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
      
      // Search for albums with that query
      const albums = await searchAlbums(randomQuery);
      
      if (albums && albums.length > 0) {
        // Pick a random album from the results
        const randomAlbum = albums[Math.floor(Math.random() * albums.length)];
        setBackgroundImageUrl(randomAlbum.imageUrl);
      }
    } catch (error) {
      console.error("Error fetching album cover:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch and setup interval for refreshing
  useEffect(() => {
    getRandomAlbumCover();
    
    // Set up interval to change background
    const interval = setInterval(getRandomAlbumCover, refreshInterval);
    
    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return (
    <>
      {backgroundImageUrl && (
        <BlurredBackground 
          imageUrl={backgroundImageUrl} 
          intensity="medium"
        />
      )}
    </>
  );
}