import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueueAlbums, useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { AlbumArt } from "@/components/ui/album-art";
import { openInSpotify } from "@/lib/spotify";
import { useAuth } from "@/hooks/use-auth";
import { Album } from "@shared/schema";
import { BlurredBackground } from "@/components/ui/blurred-background";

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Shuffle source state (false = queue, true = no skips)
  const [shuffleSource, setShuffleSource] = useState(false);
  
  // Current displayed album
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  
  const { queueAlbums, getRandomQueueAlbum } = useQueueAlbums();
  const { noSkipsAlbums, getRandomNoSkipsAlbum } = useNoSkipsAlbums();
  
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
    <Layout hideNav={false}>
      <div className="relative min-h-screen">
        {currentAlbum && (
          <BlurredBackground 
            imageUrl={currentAlbum.imageUrl} 
            intensity="medium"
          />
        )}
        
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]"></div>
        
        <div className="p-4 pt-6 relative z-10">
          <h1 className="text-3xl font-mono text-center mb-10">the shelf</h1>
          
          <div className="flex justify-end mb-4">
            <button 
              className="px-4 py-1 border border-black bg-white text-black font-mono text-sm"
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
          
          <div className="flex justify-center mt-8">
            {currentAlbum ? (
              <div 
                className="block w-64 shadow-lg cursor-pointer bg-white p-1 border border-black"
                onClick={handleOpenInSpotify}
              >
                <AlbumArt 
                  src={currentAlbum.imageUrl} 
                  alt={currentAlbum.name}
                  size="large"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 flex items-center justify-center text-gray-500 border border-black">
                <p className="font-mono">No albums available</p>
              </div>
            )}
          </div>
          
          {currentAlbum && (
            <div className="text-center mt-6">
              <h2 className="text-xl font-mono uppercase">{currentAlbum.name}</h2>
              <p className="text-sm font-mono">{currentAlbum.artist}</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
