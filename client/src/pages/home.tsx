import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueueAlbums, useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { openInSpotify } from "@/lib/spotify";
import { useAuth } from "@/hooks/use-auth";
import { Album } from "@shared/schema";
import { BlurredBackground } from "@/components/ui/blurred-background";
import { AlbumFilterSort, FilterOption } from "@/components/ui/album-filter-sort";

export default function HomePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Shuffle source state (false = queue, true = no skips)
  const [shuffleSource, setShuffleSource] = useState(false);
  
  // Current displayed album
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [sortOption, setSortOption] = useState("date-added-newest");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const [filteredSource, setFilteredSource] = useState<any[]>([]);
  
  const { queueAlbums, getRandomQueueAlbum } = useQueueAlbums();
  const { noSkipsAlbums, getRandomNoSkipsAlbum } = useNoSkipsAlbums();
  
  // Update filtered source when data changes
  useEffect(() => {
    let sourceData = shuffleSource ? noSkipsAlbums || [] : queueAlbums || [];
    
    // Apply filtering
    if (Object.keys(filterOptions).length > 0) {
      sourceData = sourceData.filter(item => {
        // Filter by artist
        if (filterOptions.artist && item.album.artist !== filterOptions.artist) {
          return false;
        }
        
        // Filter by genre
        if (filterOptions.genre && item.album.genre !== filterOptions.genre) {
          return false;
        }
        
        // Filter by year
        if (filterOptions.year !== undefined && item.album.releaseYear !== filterOptions.year) {
          return false;
        }
        
        return true;
      });
    }
    
    setFilteredSource(sourceData);
  }, [queueAlbums, noSkipsAlbums, shuffleSource, filterOptions]);
  
  // Get a random album on mount
  useEffect(() => {
    handleShuffle();
  }, [filteredSource]);
  
  // Function to shuffle and get a random album
  const handleShuffle = () => {
    let album = null;
    
    if (filteredSource.length > 0) {
      // Get random album from filtered source
      const randomIndex = Math.floor(Math.random() * filteredSource.length);
      const randomItem = filteredSource[randomIndex];
      album = randomItem.album;
    } else if (shuffleSource && noSkipsAlbums && noSkipsAlbums.length > 0) {
      // Fallback to unfiltered No Skips
      const noSkipsAlbum = getRandomNoSkipsAlbum();
      if (noSkipsAlbum) {
        album = noSkipsAlbum.album;
      }
    } else if (!shuffleSource && queueAlbums && queueAlbums.length > 0) {
      // Fallback to unfiltered Queue
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
        
        <div className="p-4 pt-6 relative z-10">
          <h1 className="text-4xl font-mono text-center mb-10">t h e  s h e l f</h1>
          
          <div className="flex justify-between mb-4 mx-4">
            <div className="flex">
              <button 
                className={`px-4 py-1 border border-black ${!shuffleSource ? 'bg-green-300' : 'bg-white'} text-black font-mono text-sm`}
                onClick={() => setShuffleSource(false)}
              >
                the queue
              </button>
              <button 
                className={`px-4 py-1 border border-black border-l-0 ${shuffleSource ? 'bg-green-300' : 'bg-white'} text-black font-mono text-sm`}
                onClick={() => setShuffleSource(true)}
              >
                no skips
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlbumFilterSort
                onSortChange={(sort) => setSortOption(sort)}
                onFilterChange={(filter) => setFilterOptions(filter)}
                selectedSort={sortOption as any}
                showFilterOptions={true}
                totalCount={filteredSource.length}
                uniqueArtists={Array.from(new Set(filteredSource.map(item => item.album.artist)))}
                uniqueGenres={Array.from(new Set(filteredSource.filter(item => item.album.genre).map(item => item.album.genre || '')))}
                uniqueYears={Array.from(new Set(filteredSource.filter(item => item.album.releaseYear).map(item => item.album.releaseYear || 0)))}
              />
              
              <button 
                className="px-4 py-1 border border-black bg-white text-black font-mono text-sm"
                onClick={handleShuffle}
              >
                shuffle
              </button>
            </div>
          </div>
          
          <div className="flex justify-center mt-8">
            {currentAlbum ? (
              <div 
                className="block w-64 shadow-lg cursor-pointer"
                onClick={handleOpenInSpotify}
              >
                <AlbumArt 
                  src={currentAlbum.imageUrl} 
                  alt={currentAlbum.name}
                  size="large"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <p className="font-mono text-gray-500 mb-4">No albums available</p>
                <p className="font-mono text-xs text-gray-500">
                  To get started, add some albums to "the queue" and "no skips" and then click the shuffle button!
                </p>
              </div>
            )}
          </div>
          
          {currentAlbum && (
            <div className="text-center mt-6">
              <h2 className="text-xl font-mono uppercase">{currentAlbum.name}</h2>
              <p className="text-sm font-mono">{currentAlbum.artist}</p>
              {currentAlbum.genre && (
                <p className="text-xs font-mono text-gray-500 mt-1">Genre: {currentAlbum.genre}</p>
              )}
              {currentAlbum.releaseYear && (
                <p className="text-xs font-mono text-gray-500 mt-1">Year: {currentAlbum.releaseYear}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
