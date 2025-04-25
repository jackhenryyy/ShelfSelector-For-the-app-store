import { useState } from "react";
import { useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchIcon, Plus, DownloadIcon, UploadIcon } from "lucide-react";
import { EditableGenre } from "@/components/ui/editable-genre";
import { exportAlbumsToCSV, parseCSVToAlbums } from "@/lib/csv-export";
import { openInSpotify, generateShareableLink } from "@/lib/spotify";
import { useSpotifyAlbums, useSpotifyAuth } from "@/hooks/use-spotify";
import { useToast } from "@/hooks/use-toast";
import { TopFourDialog } from "@/components/ui/top-four-dialog";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import { 
  AlbumFilterSort, 
  SortOption, 
  FilterOption, 
  filterAlbums
} from "@/components/ui/album-filter-sort";

export default function NoSkipsPage() {
  // Hooks with contexts first
  const { user } = useSpotifyAuth();
  const { noSkipsAlbums, topFourAlbums, updateTopFour, addToNoSkips } = useNoSkipsAlbums();
  const { searchAlbums, searchResults, isSearching } = useSpotifyAlbums();
  const { toast } = useToast();
  
  // User ID derived from user
  const userId = user?.id;
  
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
        [...noSkipsAlbums].filter(album => !album.isTopFour),
        filterOptions
      )
    : [];
    
  // Sort after filtering
  const sortedNoSkipsAlbums = filteredNoSkipsAlbums.length > 0
    ? [...filteredNoSkipsAlbums].sort((a, b) => {
        switch (sortOption) {
          case "title-asc":
            return a.album.name.localeCompare(b.album.name);
          case "title-desc":
            return b.album.name.localeCompare(a.album.name);
          case "artist-asc":
            return a.album.artist.localeCompare(b.album.artist);
          case "artist-desc":
            return b.album.artist.localeCompare(a.album.artist);
          case "year-newest":
            return (b.album.releaseYear || 0) - (a.album.releaseYear || 0);
          case "year-oldest":
            return (a.album.releaseYear || 0) - (b.album.releaseYear || 0);
          case "date-added-newest":
          default:
            return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
          case "date-added-oldest":
            return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        }
      })
    : [];
  
  // Function to handle opening album in Spotify
  const handleOpenAlbumInSpotify = (spotifyId: string) => {
    openInSpotify(spotifyId);
  };
  
  // Function to share No Skips page
  const handleShare = () => {
    if (!userId) return;
    
    const shareableLink = generateShareableLink(userId);
    
    // Copy link to clipboard
    navigator.clipboard.writeText(shareableLink).then(() => {
      toast({
        title: "Link copied to clipboard",
        description: "Share this link with friends to show them your No Skips collection",
      });
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
      subtitle={`${noSkipsAlbums?.length || 0} albums`}
    >
      <div className="p-4 pt-0">
        <div className="flex justify-between items-center mb-4">
          {/* Filter Controls and Share Button */}
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
            
            <button 
              className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm"
              onClick={handleShare}
            >
              share
            </button>
            
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
        
        <div className="flex justify-between items-center mt-4">
          <h2 className="text-sm font-medium mb-2 text-black">top 4</h2>
          <button 
            className="text-xs text-gray-500 hover:text-black"
            onClick={() => setTopFourDialogOpen(true)}
          >
            edit
          </button>
        </div>
        
        <div className="bg-black/5 p-3 mb-6 rounded">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topFourAlbums && topFourAlbums.length > 0 ? (
              topFourAlbums
                .sort((a, b) => (a.topFourPosition || 0) - (b.topFourPosition || 0))
                .map((album) => (
                  <div key={album.id}>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenAlbumInSpotify(album.album.spotifyId);
                      }}
                    >
                      <AlbumArt
                        src={album.album.imageUrl}
                        alt={album.album.name}
                      />
                      {gridScale < 5 && (
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
                  Empty
                </div>
              ))
            )}
          </div>
        </div>
        
        <h2 className="text-sm font-medium mb-2 text-black">albums</h2>
        <AlbumGrid columns={gridScale}>
          {sortedNoSkipsAlbums.map((album) => (
            <div key={album.id} className="mb-2">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (isEditingTopFour) {
                    handleSelectForTopFour(album.albumId);
                  } else {
                    handleOpenAlbumInSpotify(album.album.spotifyId);
                  }
                }}
              >
                <AlbumArt
                  src={album.album.imageUrl}
                  alt={album.album.name}
                  className={isEditingTopFour && selectedForTopFour.some(item => item.albumId === album.albumId) 
                    ? "border-2 border-green-500" 
                    : ""}
                />
                {gridScale < 5 && (
                  <>
                    <div className="mt-1 text-xs truncate">{album.album.name}</div>
                    <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
                    <EditableGenre albumId={album.album.id} genre={album.album.genre} />
                  </>
                )}
              </a>
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
      </div>
    </Layout>
  );
}
