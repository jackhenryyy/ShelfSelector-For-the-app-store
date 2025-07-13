import { useState } from "react";
import { useNoSkipsAlbums, useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchIcon, Plus, DownloadIcon, UploadIcon } from "lucide-react";
import { EditableGenre } from "@/components/ui/editable-genre";
import { ReviewPopup } from "@/components/ui/review-popup";
import { exportAlbumsToCSV, parseCSVToAlbums } from "@/lib/csv-export";
import { openInSpotify, generateShareableLink } from "@/lib/spotify";
import { useSpotifyAlbums } from "@/hooks/use-spotify";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopFourDialog } from "@/components/ui/top-four-dialog";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import { 
  AlbumFilterSort, 
  SortOption, 
  FilterOption, 
  filterAlbums
} from "@/components/ui/album-filter-sort";
import { AlbumReview } from "@/hooks/use-albums";

export default function NoSkipsPage() {
  // Hooks with contexts first
  const { user } = useAuth(); // Use the proper authentication hook
  const { noSkipsAlbums, topFourAlbums, updateTopFour, addToNoSkips, removeFromNoSkips } = useNoSkipsAlbums();
  const { searchAlbums, searchResults, isSearching } = useSpotifyAlbums();
  const { getAlbumReview, updateReview, deleteReview, createReview } = useAlbumReviews();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // User ID derived from user
  const userId = user?.id;
  console.log("User from useAuth:", user);
  
  // All useState hooks together
  const [sortOption, setSortOption] = useState<SortOption>("date-added-newest");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const [isEditingTopFour, setIsEditingTopFour] = useState(false);
  const [selectedForTopFour, setSelectedForTopFour] = useState<{albumId: number, position: number}[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [topFourDialogOpen, setTopFourDialogOpen] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [gridScale, setGridScale] = useState<number>(3);
  const [activeReview, setActiveReview] = useState<AlbumReview | null>(null);
  
  // Function to handle sorting and filtering
  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
  };
  
  const handleFilterChange = (filter: FilterOption) => {
    setFilterOptions(filter);
  };
  
  // Get unique artists, genres, and years for filters
  const uniqueArtists: string[] = [];
  const uniqueGenres: string[] = [];
  const uniqueYears: number[] = [];
  
  if (noSkipsAlbums) {
    // Build unique artists list
    const artistsSet = new Set<string>();
    noSkipsAlbums.forEach(a => {
      if (a.album.artist) artistsSet.add(a.album.artist);
    });
    uniqueArtists.push(...Array.from(artistsSet));
    
    // Build unique genres list
    const genresSet = new Set<string>();
    noSkipsAlbums.forEach(a => {
      if (a.album.genre) genresSet.add(a.album.genre);
    });
    uniqueGenres.push(...Array.from(genresSet));
    
    // Build unique years list
    const yearsSet = new Set<number>();
    noSkipsAlbums.forEach(a => {
      if (a.album.releaseYear) yearsSet.add(a.album.releaseYear);
    });
    uniqueYears.push(...Array.from(yearsSet));
  }
  
  // Get filtered and sorted no skips albums (excluding top four)
  const filteredNoSkipsAlbums = noSkipsAlbums 
    ? filterAlbums(
        [...noSkipsAlbums].filter(album => !album.isTopFour) as any,
        filterOptions
      )
    : [];
    
  // Sort after filtering
  const sortedNoSkipsAlbums = filteredNoSkipsAlbums.length > 0
    ? [...filteredNoSkipsAlbums] as any[]
    : [];
  
  // Function to handle opening album in Spotify
  const handleOpenAlbumInSpotify = (spotifyId: string) => {
    openInSpotify(spotifyId);
  };

  // Review popup handlers
  const handleOpenReview = async (albumId: number) => {
    try {
      const existingReview = await getAlbumReview(albumId);
      if (existingReview) {
        setActiveReview(existingReview);
      } else {
        // Find the album data to create a new review
        const albumData = noSkipsAlbums?.find(a => a.album.id === albumId);
        if (albumData) {
          const newReview: AlbumReview = {
            id: 0, // Will be set by the backend
            userId: user?.id || 0,
            albumId: albumId,
            rating: 0,
            review: '',
            reviewedAt: new Date().toISOString(),
            listenedAt: null,
            album: albumData.album
          };
          setActiveReview(newReview);
        }
      }
    } catch (error) {
      console.error('Error loading review:', error);
      // Don't show error toast for missing reviews, just create a new one
      const albumData = noSkipsAlbums?.find(a => a.album.id === albumId);
      if (albumData) {
        const newReview: AlbumReview = {
          id: 0,
          userId: user?.id || 0,
          albumId: albumId,
          rating: 0,
          review: '',
          reviewedAt: new Date().toISOString(),
          listenedAt: null,
          album: albumData.album
        };
        setActiveReview(newReview);
      }
    }
  };

  const handleCloseReview = () => {
    setActiveReview(null);
  };

  const handleSaveReview = async (data: { id: number; rating: number; review: string; listenedAt?: Date; genre?: string }) => {
    try {
      if (data.id === 0) {
        // Create new review
        await createReview({
          albumId: activeReview?.albumId || 0,
          rating: data.rating,
          review: data.review,
          listenedAt: data.listenedAt
        });
      } else {
        // Update existing review
        await updateReview(data);
      }
      
      setActiveReview(null);
      toast({
        title: "Review saved",
        description: "Your album review has been saved successfully"
      });
    } catch (error) {
      console.error('Error saving review:', error);
      toast({
        title: "Error",
        description: "Failed to save review",
        variant: "destructive"
      });
    }
  };

  const handleGenreUpdate = async (albumId: number, genre: string) => {
    try {
      await updateAlbumGenre(albumId, genre);
    } catch (error) {
      console.error('Error updating genre:', error);
    }
  };
  
  // Function to share No Skips page
  const handleShare = () => {
    console.log("Share button clicked, userId:", userId);
    
    if (!userId) {
      console.error("Cannot share: userId is undefined");
      toast({
        title: "Sharing error",
        description: "Unable to generate a share link. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    const shareableLink = generateShareableLink(userId);
    console.log("Generated shareable link:", shareableLink);
    
    // Try to use the Web Share API if available
    if (navigator.share) {
      console.log("Using Web Share API");
      navigator.share({
        title: 'My No Skips Collection',
        text: 'Check out my No Skips album collection',
        url: shareableLink,
      }).catch((error) => {
        console.error("Web Share API error:", error);
        // Fallback to clipboard if sharing fails
        copyToClipboard(shareableLink);
      });
    } else {
      console.log("Web Share API not available, using clipboard fallback");
      // Fallback for browsers that don't support the Web Share API
      copyToClipboard(shareableLink);
    }
  };
  
  // Helper function to copy to clipboard with feedback
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copied to clipboard",
        description: "Share this link with friends to show them your No Skips collection",
      });
      
      // Also log for debugging
      console.log("SHARE URL copied to clipboard:", text);
      
      // Create a clickable test link in the console
      console.log(
        "To test the share link directly, click here:", 
        `%c${text}`, 
        "color: blue; text-decoration: underline; cursor: pointer"
      );
    }).catch((err) => {
      console.error("Clipboard write error:", err);
      
      // Manual fallback for browsers without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      try {
        document.execCommand('copy');
        toast({
          title: "Link copied to clipboard",
          description: "Share this link with friends to show them your No Skips collection",
        });
      } catch (err) {
        console.error("execCommand copy error:", err);
        toast({
          title: "Couldn't copy automatically",
          description: `Your shareable link is: ${text}`,
          variant: "destructive",
        });
      }
      
      document.body.removeChild(textarea);
    });
  };
  
  // Function to start editing Top Four
  const handleStartEditingTopFour = () => {
    setIsEditingTopFour(true);
    // Initialize with current top four
    if (topFourAlbums) {
      setSelectedForTopFour(
        topFourAlbums.map(album => ({
          albumId: album.albumId,
          position: album.topFourPosition || 1
        }))
      );
    }
  };
  
  // Function to handle TopFour dialog save
  const handleTopFourDialogSave = (selections: {albumId: number, position: number}[]) => {
    updateTopFour(selections);
    toast({
      title: "Top 4 updated",
      description: "Your Top 4 albums have been updated",
    });
  };
  
  // Function to handle selecting an album for top four
  const handleSelectForTopFour = (albumId: number) => {
    // Check if already selected
    const existingIndex = selectedForTopFour.findIndex(item => item.albumId === albumId);
    
    if (existingIndex >= 0) {
      // Remove from selection
      setSelectedForTopFour(prev => prev.filter(item => item.albumId !== albumId));
    } else if (selectedForTopFour.length < 4) {
      // Add to selection with next available position
      const positions = selectedForTopFour.map(item => item.position);
      let position = 1;
      while (positions.includes(position) && position <= 4) {
        position++;
      }
      
      setSelectedForTopFour(prev => [...prev, { albumId, position }]);
    } else {
      // Already have 4 selected
      toast({
        title: "Top 4 limit reached",
        description: "You can only select 4 albums for your Top 4. Remove one first.",
        variant: "destructive"
      });
    }
  };
  
  // Function to save Top Four changes
  const handleSaveTopFour = () => {
    updateTopFour(selectedForTopFour);
    setIsEditingTopFour(false);
    
    toast({
      title: "Top 4 updated",
      description: "Your Top 4 albums have been updated",
    });
  };
  
  // Function to handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Function to handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchAlbums(searchQuery);
    }
  };
  
  // Function to add album to No Skips
  const handleAddToNoSkips = (albumId: number) => {
    addToNoSkips({ 
      albumId, 
      isTopFour: false 
    });
    
    toast({
      title: "Album added",
      description: "Album has been added to your No Skips collection",
    });
    
    // Close search after adding
    setShowSearch(false);
    setSearchQuery("");
  };
  
  // Function to remove album from No Skips
  const handleRemoveFromNoSkips = (albumId: number) => {
    removeFromNoSkips(albumId);
    
    toast({
      title: "Album removed",
      description: "Album has been removed from your No Skips collection",
    });
  };
  
  // Function to handle CSV upload
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsCsvUploading(true);
    
    try {
      // Read the file
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      
      // Parse CSV using our utility function
      const albumsToAdd = parseCSVToAlbums(text);
      
      // Search and add albums
      let addedCount = 0;
      let failedCount = 0;
      
      toast({
        title: "Processing CSV",
        description: `Found ${albumsToAdd.length} albums to import...`,
      });
      
      for (const albumData of albumsToAdd) {
        try {
          // Search for the album
          const searchQuery = `${albumData.artist} ${albumData.album}`;
          const searchResults = await searchAlbums(searchQuery);
          
          if (searchResults && searchResults.length > 0) {
            // Add the first matching album to no skips
            await addToNoSkips({ 
              albumId: searchResults[0].id, 
              isTopFour: false 
            });
            addedCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(`Error adding album ${albumData.album} by ${albumData.artist}:`, err);
          failedCount++;
        }
      }
      
      toast({
        title: "CSV Import Complete",
        description: `Successfully added ${addedCount} albums to your No Skips collection. ${failedCount} albums failed.`,
        variant: failedCount > 0 ? "default" : "default"
      });
      
    } catch (error) {
      console.error("CSV upload error:", error);
      toast({
        title: "CSV Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsCsvUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  return (
    <Layout
      title="no skips"
      subtitle=""
    >
      <div className="p-3 pt-0">
        {/* Album count & mobile controls */}
        <div className="flex flex-col mb-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs text-black/60">
              {filteredNoSkipsAlbums.length} albums
            </div>
          
            {/* Mobile controls */}
            <div className="flex items-center gap-2 sm:hidden">
              <AlbumFilterSort
                onSortChange={handleSortChange}
                onFilterChange={handleFilterChange}
                selectedSort={sortOption}
                showFilterOptions={true}
                totalCount={filteredNoSkipsAlbums.length}
                uniqueArtists={uniqueArtists}
                uniqueGenres={uniqueGenres}
                uniqueYears={uniqueYears}
              />
              
              <Dialog>
                <DialogTrigger asChild>
                  <button className="whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs">
                    + add
                  </button>
                </DialogTrigger>
                <DialogContent className="md:max-w-md w-[calc(100%-2rem)]">
                  <DialogTitle className="font-mono">Add an album</DialogTitle>
                  
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      placeholder="Search albums..."
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
                      className="w-full p-2 border border-black font-mono text-sm"
                    />
                    <button 
                      className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
                      onClick={handleSearchSubmit}
                      disabled={isSearching}
                    >
                      <SearchIcon className="h-4 w-4 mr-1" />
                      {isSearching ? "..." : "Search"}
                    </button>
                  </div>
                  
                  {searchResults && searchResults.length > 0 && (
                    <div className="mt-4 max-h-80 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-3">
                        {searchResults.map((album) => (
                          <div key={album.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                            <div className="flex items-center gap-2">
                              <AlbumArt
                                src={album.imageUrl}
                                alt={album.name}
                                size="small"
                              />
                              <div>
                                <div className="font-mono text-sm">{album.name}</div>
                                <div className="font-mono text-xs text-gray-500">{album.artist}</div>
                              </div>
                            </div>
                            <button 
                              className="px-3 py-1 border border-black bg-white text-black font-mono text-xs"
                              onClick={() => handleAddToNoSkips(album.id)}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Mobile import/export/grid controls */}
          {isMobile && (
            <div className="flex gap-2 justify-between mt-2 sm:hidden">
              <label 
                htmlFor="csv-upload-no-skips"
                className="flex-1 whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs cursor-pointer flex items-center justify-center gap-1"
                title="Import from CSV"
              >
                <UploadIcon className="h-3 w-3" />
                import
              </label>
              <input 
                id="csv-upload-no-skips"
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              
              <button 
                onClick={() => exportAlbumsToCSV(noSkipsAlbums || [], 'no-skips-export.csv', false, true)}
                className="flex-1 whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs flex items-center justify-center gap-1"
                title="Export to CSV"
              >
                <DownloadIcon className="h-3 w-3" />
                export
              </button>
              
              <div className="flex-1 flex items-center justify-center px-2 border border-black">
                <GridScaleSlider 
                  value={gridScale} 
                  onChange={setGridScale}
                  min={1}
                  max={12}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Desktop controls */}
        {!isMobile && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <AlbumFilterSort
                onSortChange={handleSortChange}
                onFilterChange={handleFilterChange}
                selectedSort={sortOption}
                showFilterOptions={true}
                totalCount={filteredNoSkipsAlbums.length}
                uniqueArtists={uniqueArtists}
                uniqueGenres={uniqueGenres}
                uniqueYears={uniqueYears}
              />
              
              <div className="flex flex-col">
                <button 
                  className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm flex items-center gap-1"
                  onClick={handleShare}
                  title="Share your collection with others"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  share collection
                </button>
                
                {userId && (
                  <a 
                    href={`/shared/${userId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-center mt-1 hover:underline"
                  >
                    test shared view
                  </a>
                )}
              </div>
              
              <label 
                htmlFor="csv-upload-no-skips"
                className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm cursor-pointer flex items-center gap-1"
                title="Import from CSV"
              >
                <UploadIcon className="h-4 w-4" />
                import csv
              </label>
              <input 
                id="csv-upload-no-skips"
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              
              <button 
                onClick={() => exportAlbumsToCSV(noSkipsAlbums || [], 'no-skips-export.csv', false, true)}
                className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm flex items-center gap-1"
                title="Export to CSV"
              >
                <DownloadIcon className="h-4 w-4" />
                export csv
              </button>
              
              <div className="px-2 border-l border-black ml-2">
                <GridScaleSlider 
                  value={gridScale} 
                  onChange={setGridScale}
                  min={1}
                  max={12}
                />
              </div>
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <button className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm">
                  + add album
                </button>
              </DialogTrigger>
              <DialogContent className="md:max-w-md w-[calc(100%-2rem)]">
                <DialogTitle className="font-mono">Add an album</DialogTitle>
                
                <div className="flex items-center gap-2 mt-4">
                  <input
                    placeholder="Search albums..."
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
                    className="w-full p-2 border border-black font-mono text-sm"
                  />
                  <button 
                    className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
                    onClick={handleSearchSubmit}
                    disabled={isSearching}
                  >
                    <SearchIcon className="h-4 w-4 mr-1" />
                    {isSearching ? "..." : "Search"}
                  </button>
                </div>
                
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-4 max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-3">
                      {searchResults.map((album) => (
                        <div key={album.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                          <div className="flex items-center gap-2">
                            <AlbumArt
                              src={album.imageUrl}
                              alt={album.name}
                              size="small"
                            />
                            <div>
                              <div className="font-mono text-sm">{album.name}</div>
                              <div className="font-mono text-xs text-gray-500">{album.artist}</div>
                            </div>
                          </div>
                          <button 
                            className="px-3 py-1 border border-black bg-white text-black font-mono text-xs"
                            onClick={() => handleAddToNoSkips(album.id)}
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        <div className={`flex items-center gap-2 ${isMobile ? 'mt-3' : 'mt-4'}`}>
          <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2 text-black`}>top 4</h2>
          
          <button 
            onClick={handleShare}
            className="text-xs text-gray-500 hover:text-black flex items-center gap-1 mb-2"
            title="Share your collection with others"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            share
          </button>
          
          <div className="flex-grow"></div>
          
          <button 
            className="text-xs text-gray-500 hover:text-black mb-2"
            onClick={() => setTopFourDialogOpen(true)}
          >
            edit
          </button>
        </div>
        
        <div className={`bg-black/5 ${isMobile ? 'p-2' : 'p-3'} mb-4 rounded`}>
          <div className="grid grid-cols-4 gap-2">
            {topFourAlbums && topFourAlbums.length > 0 ? (
              topFourAlbums
                .sort((a, b) => (a.topFourPosition || 0) - (b.topFourPosition || 0))
                .map((album) => (
                  <div key={album.id}>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenReview(album.album.id);
                      }}
                    >
                      <AlbumArt
                        src={album.album.imageUrl}
                        alt={album.album.name}
                        size={isMobile ? "smaller" : undefined}
                      />
                      {!isMobile && gridScale < 5 && (
                        <>
                          <div className="mt-1 text-xs truncate">{album.album.name}</div>
                          <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
                        </>
                      )}
                    </a>
                  </div>
                ))
            ) : (
              // Empty slots for top four
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-gray-100 rounded aspect-square flex items-center justify-center text-gray-400">
                  {isMobile ? '' : 'Empty'}
                </div>
              ))
            )}
          </div>
        </div>
        
        <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium mb-2 text-black`}>albums</h2>
        <AlbumGrid columns={gridScale}>
          {sortedNoSkipsAlbums.map((album) => (
            <div key={album.id} className="mb-2">
              {/* Album art container with overlay */}
              <div className="relative group">
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEditingTopFour) {
                      handleSelectForTopFour(album.albumId);
                    } else {
                      handleOpenReview(album.album.id);
                    }
                  }}
                  className="block cursor-pointer"
                >
                  <AlbumArt
                    src={album.album.imageUrl}
                    alt={album.album.name}
                    className={isEditingTopFour && selectedForTopFour.some(item => item.albumId === album.albumId) 
                      ? "border-2 border-green-500" 
                      : ""}
                  />
                </div>
                
                {/* Remove button in top right corner - only appears on hover */}
                <button 
                  className="absolute top-2 right-2 bg-black bg-opacity-50 border border-white rounded-full w-6 h-6 flex items-center justify-center text-white hover:bg-white hover:text-black text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!isEditingTopFour) {
                      handleRemoveFromNoSkips(album.albumId);
                    }
                  }}
                  title="Remove from No Skips"
                >
                  ✕
                </button>
              </div>
              
              {/* Album details outside the overlay area */}
              {gridScale < 5 && (
                <>
                  <div className="mt-1 text-xs truncate">{album.album.name}</div>
                  <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
                </>
              )}
              
              {/* Genre editor */}
              {gridScale < 5 && (
                <EditableGenre albumId={album.album.id} genre={album.album.genre} />
              )}
            </div>
          ))}
        </AlbumGrid>
        
        {/* Share button moved to the top toolbar */}
        
        {/* Top Four Dialog */}
        <TopFourDialog
          open={topFourDialogOpen}
          onOpenChange={setTopFourDialogOpen}
          allAlbums={noSkipsAlbums || []}
          currentTopFour={topFourAlbums || []}
          onSave={handleTopFourDialogSave}
        />
        
        {/* Album Search Dialog (Optional secondary Dialog - keep for now) */}
        <Dialog open={showSearch} onOpenChange={setShowSearch}>
          <DialogContent className="md:max-w-md w-[calc(100%-2rem)]">
            <DialogTitle className="font-mono">Add an album</DialogTitle>
            
            <div className="flex items-center gap-2 mt-4">
              <input
                placeholder="Search albums..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
                className="w-full p-2 border border-black font-mono text-sm"
              />
              <button 
                className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
                onClick={handleSearchSubmit}
                disabled={isSearching}
              >
                <SearchIcon className="h-4 w-4 mr-1" />
                {isSearching ? "..." : "Search"}
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto mt-4">
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {searchResults.map((album) => (
                    <div key={album.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div className="flex items-center gap-2">
                        <AlbumArt
                          src={album.imageUrl}
                          alt={album.name}
                          size="small"
                        />
                        <div>
                          <div className="font-mono text-sm">{album.name}</div>
                          <div className="font-mono text-xs text-gray-500">{album.artist}</div>
                        </div>
                      </div>
                      <button 
                        className="px-3 py-1 border border-black bg-white text-black font-mono text-xs"
                        onClick={() => handleAddToNoSkips(album.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="py-8 text-center text-gray-500 font-mono">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 font-mono">
                  Search for an album to add to your collection
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Review Popup */}
        <ReviewPopup
          review={activeReview}
          isOpen={!!activeReview}
          onClose={handleCloseReview}
          onSave={handleSaveReview}
          onDelete={deleteReview}
          onGenreUpdate={handleGenreUpdate}
        />
      </div>
    </Layout>
  );
}