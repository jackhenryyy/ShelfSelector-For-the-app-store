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
        
        <div className="p-4 relative z-10">
          <h1 className="text-4xl font-mono text-center mb-10 tracking-widest">t h e &nbsp; s h e l f</h1>
          
          <div className="flex justify-between mb-4">
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
            
            <button 
              className="px-4 py-1 border border-black bg-white text-black font-mono text-sm"
              onClick={handleShuffle}
            >
              shuffle
            </button>
          </div>
          
          <div className="mb-4 hidden">
            <div className="relative">
              <select
                className={`appearance-none cursor-pointer whitespace-nowrap px-4 py-1 border border-black ${Object.keys(filterOptions).length > 0 ? 'bg-green-300' : 'bg-white'} text-black font-mono text-sm pr-8 w-full`}
                value={filterOptions.genre || ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    setFilterOptions({});
                  } else {
                    setFilterOptions({ genre: e.target.value });
                  }
                }}
              >
                <option value="">genre: all</option>
                {Array.from(new Set(filteredSource.filter(item => item.album.genre).map(item => item.album.genre || '')))
                  .sort()
                  .map(genre => (
                    <option key={genre} value={genre}>genre: {genre}</option>
                  ))
                }
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                <svg className="h-4 w-4 fill-current text-black" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            {currentAlbum ? (
              <div 
                className="block mx-auto w-full max-w-[90vw] cursor-pointer"
                onClick={handleOpenInSpotify}
              >
                <AlbumArt 
                  src={currentAlbum.imageUrl} 
                  alt={currentAlbum.name}
                  size="large"
                  className="shadow-lg"
                />
              </div>
            ) : (
              <div className="w-full max-w-[90vw] h-[90vw] bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
                <p className="font-mono text-gray-500 mb-4">No albums available</p>
                <p className="font-mono text-xs text-gray-500">
                  To get started, add some albums to "the queue" and "no skips" and then click the shuffle button!
                </p>
              </div>
            )}
          </div>
          
          {currentAlbum && (
            <div className="text-center mt-6 px-6">
              <h2 className="text-2xl font-mono uppercase">{currentAlbum.name}</h2>
              <p className="text-base font-mono uppercase mt-1">{currentAlbum.artist}</p>
              
              {/* Mobile sort bar */}
              <div className="mt-12">
                <select
                  className="appearance-none cursor-pointer whitespace-nowrap px-4 py-1 border border-black bg-white text-black font-mono text-sm pr-8 w-[150px]"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="date-added-newest">sort</option>
                  <option value="date-added-newest">newest</option>
                  <option value="date-added-oldest">oldest</option>
                  <option value="title-asc">a-z</option>
                  <option value="title-desc">z-a</option>
                </select>
                <div className="pointer-events-none absolute right-1/2 translate-x-[35px] flex items-center">
                  <svg className="h-4 w-4 fill-current text-black" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
