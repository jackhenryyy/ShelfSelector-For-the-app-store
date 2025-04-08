import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSpotifyAuth } from "@/hooks/use-spotify";
import { useQueueAlbums, useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { AlbumArt } from "@/components/ui/album-art";
import { openInSpotify } from "@/lib/spotify";
import { SpotifyAlbum } from "@/hooks/use-spotify";

export default function HomePage() {
  const { isAuthenticated } = useSpotifyAuth();
  const [, setLocation] = useLocation();
  
  // Shuffle source state (false = queue, true = no skips)
  const [shuffleSource, setShuffleSource] = useState(false);
  
  // Current displayed album
  const [currentAlbum, setCurrentAlbum] = useState<SpotifyAlbum | null>(null);
  
  const { queueAlbums, getRandomQueueAlbum } = useQueueAlbums();
  const { noSkipsAlbums, getRandomNoSkipsAlbum } = useNoSkipsAlbums();
  
  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);
  
  // Get a random album on mount
  useEffect(() => {
    handleShuffle();
  }, [queueAlbums, noSkipsAlbums, shuffleSource]);
  
  // Function to shuffle and get a random album
  const handleShuffle = () => {
    let album = null;
    
    if (shuffleSource) {
      // Get from No Skips
      const noSkipsAlbum = getRandomNoSkipsAlbum();
      if (noSkipsAlbum) {
        album = noSkipsAlbum.album;
      }
    } else {
      // Get from Queue
      const queueAlbum = getRandomQueueAlbum();
      if (queueAlbum) {
        album = queueAlbum.album;
      }
    }
    
    setCurrentAlbum(album);
  };
  
  // Handle opening album in Spotify
  const handleOpenInSpotify = () => {
    if (currentAlbum) {
      openInSpotify(currentAlbum.spotifyId);
    }
  };

  return (
    <Layout
      backgroundImage={currentAlbum?.imageUrl}
    >
      <div className="p-6">
        <h1 className="text-2xl font-medium tracking-widest text-center mb-10 text-black">t h e &nbsp; s h e l f</h1>
        
        <div className="flex justify-center mb-4">
          <button 
            className="text-sm text-black/80 hover:text-black"
            onClick={handleShuffle}
          >
            shuffle
          </button>
        </div>
        
        <div className="flex justify-center items-center mb-6">
          <ToggleSwitch 
            leftLabel="the queue" 
            rightLabel="no skips" 
            defaultChecked={shuffleSource}
            onChange={setShuffleSource}
          />
        </div>
        
        <div className="flex justify-center">
          {currentAlbum ? (
            <div 
              className="block w-64 h-64 shadow-lg cursor-pointer"
              onClick={handleOpenInSpotify}
            >
              <AlbumArt 
                src={currentAlbum.imageUrl} 
                alt={currentAlbum.name}
                size="large"
              />
            </div>
          ) : (
            <div className="w-64 h-64 bg-gray-200 flex items-center justify-center text-gray-500 rounded shadow-lg">
              <p>No albums available</p>
            </div>
          )}
        </div>
        
        {currentAlbum && (
          <div className="text-center mt-6">
            <h2 className="text-xl font-medium text-black">{currentAlbum.name}</h2>
            <p className="text-sm text-black/60">{currentAlbum.artist}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
