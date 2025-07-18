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
import { EditableGenre } from "@/components/ui/editable-genre";
import { CompactNowPlayingWidget } from "@/components/ui/compact-now-playing-widget";

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
    
    // Apply filtering - only filter by genre on home page
    if (Object.keys(filterOptions).length > 0) {
      sourceData = sourceData.filter(item => {
        // Filter by genre only
        if (filterOptions.genre && item.album.genre !== filterOptions.genre) {
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
  
  // Function to get unique genres from both sources
  const getUniqueGenres = () => {
    const allAlbums = [...(queueAlbums || []), ...(noSkipsAlbums || [])];
    const genresSet = new Set<string>();
    
    allAlbums.forEach(item => {
      if (item.album.genre) {
        genresSet.add(item.album.genre);
      }
    });
    
    return Array.from(genresSet);
  };
  
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
        
        <div className="p-3 relative z-10">
          <h1 className="text-lg sm:text-xl md:text-2xl font-mono text-center mb-3">t h e  s h e l f</h1>
          
          <div className="flex justify-between mb-4 mx-1 sm:mx-4 gap-2 flex-wrap">
            <div className="flex">
              <button 
                className={`px-2 py-1 border border-black ${!shuffleSource ? 'bg-green-300' : 'bg-white'} text-black font-mono text-xs`}
                onClick={() => setShuffleSource(false)}
              >
                the queue
              </button>
              <button 
                className={`px-2 py-1 border border-black border-l-0 ${shuffleSource ? 'bg-green-300' : 'bg-white'} text-black font-mono text-xs`}
                onClick={() => setShuffleSource(true)}
              >
                no skips
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Genre Filter */}
              <AlbumFilterSort
                onFilterChange={setFilterOptions}
                showFilterOptions={true}
                showGenreOnly={true}
                totalCount={filteredSource.length}
                uniqueGenres={getUniqueGenres()}
              />
              
              <button 
                className="px-2 py-1 border border-black bg-white text-black font-mono text-xs"
                onClick={handleShuffle}
              >
                shuffle
              </button>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            {currentAlbum ? (
              <div 
                className="block w-40 sm:w-56 md:w-64 shadow-md cursor-pointer"
                onClick={handleOpenInSpotify}
              >
                <AlbumArt 
                  src={currentAlbum.imageUrl} 
                  alt={currentAlbum.name}
                  size="large"
                />
              </div>
            ) : (
              <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-gray-100 flex flex-col items-center justify-center p-2 text-center">
                <p className="font-mono text-xs text-gray-500 mb-2">No albums available</p>
                <p className="font-mono text-xs text-gray-500">
                  Add albums to get started!
                </p>
              </div>
            )}
          </div>
          
          {currentAlbum && (
            <div className="text-center mt-2">
              <h2 className="text-sm sm:text-base font-mono uppercase">{currentAlbum.name}</h2>
              <p className="text-xs font-mono">{currentAlbum.artist}</p>
              <div className="mt-0.5">
                <EditableGenre albumId={currentAlbum.id} genre={currentAlbum.genre} className="justify-center" />
              </div>
            </div>
          )}
          

        </div>
      </div>
    </Layout>
  );
}
