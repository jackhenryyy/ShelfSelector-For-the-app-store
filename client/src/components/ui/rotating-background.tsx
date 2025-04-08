import { useEffect, useState } from 'react';
import { useSpotifyAlbums } from '@/hooks/use-spotify';
import { BlurredBackground } from './blurred-background';
import { useQuery } from '@tanstack/react-query';

// Array of popular album covers to use when no albums are loaded
const popularAlbumCovers = [
  'https://i.scdn.co/image/ab67616d0000b273e13de7b8662b085b0a367285',  // Dark Side of the Moon
  'https://i.scdn.co/image/ab67616d0000b273f175a89e644ef9a3ca91a78d',  // Abbey Road
  'https://i.scdn.co/image/ab67616d0000b273a7ea08ab3914c5fb2084a8ac',  // Thriller
  'https://i.scdn.co/image/ab67616d0000b27336b9a74a8ed32703c36d2bc7',  // Rumours
  'https://i.scdn.co/image/ab67616d0000b273d79c395d8a40c3c13af7db41',  // Nevermind
];

interface RotatingBackgroundProps {
  interval?: number; // Time in ms between album changes
  intensity?: "light" | "medium" | "heavy";
}

export function RotatingBackground({ 
  interval = 5000, 
  intensity = "medium" 
}: RotatingBackgroundProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Fetch albums from Spotify API 
  const { data: albums = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/spotify/albums/saved'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Use the albums list for rotation, defaulting to popular albums if necessary
  const imagesList = albums.length > 0 
    ? albums.map((album: any) => album.imageUrl) 
    : popularAlbumCovers;

  useEffect(() => {
    if (imagesList.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex >= imagesList.length - 1 ? 0 : prevIndex + 1
      );
    }, interval);
    
    return () => clearInterval(timer);
  }, [imagesList, interval]);

  if (imagesList.length === 0) {
    return null;
  }

  const currentImageUrl = imagesList[currentImageIndex];
  
  return (
    <BlurredBackground 
      imageUrl={currentImageUrl} 
      intensity={intensity} 
    />
  );
}