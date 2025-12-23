import { useState, useEffect } from "react";
import { useSpotifyAlbums } from "@/hooks/use-spotify";
import { useQueueAlbums, useNoSkipsAlbums, useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { openInMusicService } from "@/lib/spotify";
import { SearchIcon, UploadIcon, DownloadIcon } from "lucide-react";
import { exportAlbumsToCSV } from "@/lib/csv-export";
import { parseCSVToAlbums } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { AlbumDetailsDialog } from "@/components/ui/album-details-dialog";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { SearchDialog } from "@/components/ui/search-dialog";
import { DuplicateAlbumDialog } from "@/components/ui/duplicate-album-dialog";
import { 
  AlbumFilterSort, 
  SortOption, 
  FilterOption
} from "@/components/ui/album-filter-sort";

// Helper function for sorting adapted to our specific needs
function sortQueueAlbums(albums: any[], sortOption: SortOption) {
  if (!albums) return [];
  
  return [...albums].sort((a, b) => {
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
  });
}

// Helper function for filtering adapted to our specific needs
function filterQueueAlbums(albums: any[], filter: FilterOption, searchQuery?: string) {
  if (!albums) return [];
  
  let filtered = albums;
  
  // Apply text search first
  if (searchQuery && searchQuery.trim()) {
    const lowerSearch = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(item => 
      item.album.name.toLowerCase().includes(lowerSearch) ||
      item.album.artist.toLowerCase().includes(lowerSearch) ||
      (item.album.genre && item.album.genre.toLowerCase().includes(lowerSearch))
    );
  }
  
  // Apply other filters
  if (!filter || Object.keys(filter).length === 0) return filtered;
  
  return filtered.filter(item => {
    // Filter by artist
    if (filter.artist && item.album.artist !== filter.artist) {
      return false;
    }
    
    // Filter by year
    if (filter.year !== undefined && filter.year !== null && 
        item.album.releaseYear !== filter.year) {
      return false;
    }
    
    // Filter by genre
    if (filter.genre && item.album.genre !== filter.genre) {
      return false;
    }
    
    return true;
  });
}

export default function QueuePage() {
  const { queueAlbums, addToQueue, removeFromQueue, isAlbumInQueue } = useQueueAlbums();
  const { addToNoSkips } = useNoSkipsAlbums();
  const { createReview } = useAlbumReviews();
  const { searchAlbums } = useSpotifyAlbums();
  const { updateGenre } = useAlbumGenre();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [queueSearchQuery, setQueueSearchQuery] = useState("");

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-added-newest");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const [filteredQueueAlbums, setFilteredQueueAlbums] = useState<any[]>([]);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [gridScale, setGridScale] = useState<number>(3);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingDuplicateAlbum, setPendingDuplicateAlbum] = useState<{id: number, name: string} | null>(null);
  
  // Update filtered queue albums when sorting or filtering changes
  useEffect(() => {
    if (!queueAlbums) return;
    
    // Apply sorting and filtering
    let processed = [...queueAlbums];
    processed = sortQueueAlbums(processed, sortOption);
    processed = filterQueueAlbums(processed, filterOptions, queueSearchQuery);
    
    setFilteredQueueAlbums(processed);
  }, [queueAlbums, sortOption, filterOptions, queueSearchQuery]);
  
  // Function to handle album click - now goes directly to review dialog
  const handleAlbumClick = (albumId: number, event: React.MouseEvent) => {
    event.preventDefault();
    
    // Open details dialog directly
    handleOpenDetailsDialog(albumId);
  };
  
  // Function to play album in music service
  const handlePlayInMusicService = (album: { spotifyId?: string | null; appleMusicId?: string | null }) => {
    openInMusicService(album);
  };
  
  // Function to open the details dialog
  const handleOpenDetailsDialog = (albumId: number) => {
    const album = queueAlbums?.find(qa => qa.albumId === albumId)?.album;
    if (album) {
      setSelectedAlbum(album);
      setDetailsDialogOpen(true);
    }
  };
  
  // Function to handle saving a review
  const handleSaveReview = async (data: {
    albumId: number;
    rating: number;
    review?: string;
    listenedAt?: Date;
    genre?: string;
  }) => {
    try {
      // Create the review in the database
      await createReview({
        albumId: data.albumId,
        rating: data.rating,
        review: data.review || "",
        listenedAt: data.listenedAt
      });
      
      // Remove the album from the queue
      removeFromQueue(data.albumId);
      
      toast({
        title: "Review submitted",
        description: "Album has been added to your list and removed from your queue",
      });
      
      setSelectedAlbum(null);
      setDetailsDialogOpen(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Review failed",
        description: "There was an error submitting your review",
        variant: "destructive"
      });
    }
  };

  // Function to handle updating genre
  const handleUpdateGenre = async (albumId: number, genre: string) => {
    try {
      await updateGenre(albumId, genre);
      toast({
        title: "Genre updated",
        description: "Album genre has been updated",
      });
    } catch (error) {
      console.error("Error updating genre:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the genre",
        variant: "destructive"
      });
    }
  };
  
  // Function to handle album search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchAlbums(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: "There was an error searching for albums",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };
  
  // Function to add album to queue with duplicate detection
  const handleAddToQueue = (albumId: number, albumName?: string) => {
    // Check if album already exists in queue
    if (isAlbumInQueue(albumId)) {
      const album = searchResults.find(a => a.id === albumId);
      setPendingDuplicateAlbum({ id: albumId, name: albumName || album?.name || "This album" });
      setDuplicateDialogOpen(true);
      return;
    }
    
    addToQueue(albumId);
    toast({
      title: "Added to Queue",
      description: "Album has been added to your Queue",
    });
  };
  
  // Confirm adding duplicate
  const handleConfirmDuplicate = () => {
    if (pendingDuplicateAlbum) {
      addToQueue(pendingDuplicateAlbum.id);
      toast({
        title: "Added to Queue",
        description: "Album has been added to your Queue",
      });
      setPendingDuplicateAlbum(null);
    }
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
            // Add the first matching album to queue
            await addToQueue(searchResults[0].id);
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
        description: `Successfully added ${addedCount} albums to your queue. ${failedCount} albums failed.`,
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

  // Function to handle CSV export
  const handleExportCSV = () => {
    if (!filteredQueueAlbums || filteredQueueAlbums.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Your queue is empty",
        variant: "destructive"
      });
      return;
    }
    
    exportAlbumsToCSV(filteredQueueAlbums, "queue-albums.csv");
    
    toast({
      title: "Export complete",
      description: `${filteredQueueAlbums.length} albums exported to CSV`,
    });
  };
  
  // Get unique artists, genres, and years for filters
  const uniqueArtists: string[] = [];
  const uniqueGenres: string[] = [];
  const uniqueYears: number[] = [];
  
  if (queueAlbums) {
    // Build unique artists list
    const artistsSet = new Set<string>();
    queueAlbums.forEach(a => {
      if (a.album.artist) artistsSet.add(a.album.artist);
    });
    uniqueArtists.push(...Array.from(artistsSet));
    
    // Build unique genres list
    const genresSet = new Set<string>();
    queueAlbums.forEach(a => {
      if (a.album.genre) genresSet.add(a.album.genre);
    });
    uniqueGenres.push(...Array.from(genresSet));
    
    // Build unique years list
    const yearsSet = new Set<number>();
    queueAlbums.forEach(a => {
      if (a.album.releaseYear) yearsSet.add(a.album.releaseYear);
    });
    uniqueYears.push(...Array.from(yearsSet));
  }

  // Search dialog state
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [mobileSearchDialogOpen, setMobileSearchDialogOpen] = useState(false);
  
  // Function to handle search input change
  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query);
  };
  
  // Function to handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSearch();
    }
  };
  
  // Mobile album search button component
  const MobileAlbumSearchButton = () => (
    <button 
      className="whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs"
      onClick={() => setMobileSearchDialogOpen(true)}
    >
      + add
    </button>
  );
  
  // Desktop album search button component
  const DesktopAlbumSearchButton = () => (
    <button 
      className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm"
      onClick={() => setSearchDialogOpen(true)}
    >
      + add album
    </button>
  );

  return (
    <Layout
      title="the queue"
      subtitle=""
    >
      <div className="p-3 pt-0">
        {/* Album count & mobile controls */}
        <div className="flex flex-col mb-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-xs text-black/60">
              {filteredQueueAlbums.length} albums {queueSearchQuery && `(filtered from ${queueAlbums?.length || 0})`}
            </div>
          
            {/* Mobile controls */}
            <div className="flex items-center gap-2 sm:hidden">
              <AlbumFilterSort
                onSortChange={setSortOption}
                onFilterChange={setFilterOptions}
                selectedSort={sortOption}
                showFilterOptions={true}
                totalCount={filteredQueueAlbums.length}
                uniqueArtists={uniqueArtists}
                uniqueGenres={uniqueGenres}
                uniqueYears={uniqueYears}
              />
              <div className="relative flex-1 max-w-32">
                <input
                  type="text"
                  placeholder="Search..."
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  className="w-full px-2 py-1 border border-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <MobileAlbumSearchButton />
            </div>
            
            {/* Desktop controls */}
            <div className="hidden sm:flex items-center justify-between w-full">
              <div className="flex gap-2">
                <AlbumFilterSort
                  onSortChange={setSortOption}
                  onFilterChange={setFilterOptions}
                  selectedSort={sortOption}
                  showFilterOptions={true}
                  totalCount={filteredQueueAlbums.length}
                  uniqueArtists={uniqueArtists}
                  uniqueGenres={uniqueGenres}
                  uniqueYears={uniqueYears}
                />
                
                <label 
                  htmlFor="csv-upload"
                  className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm cursor-pointer flex items-center gap-1"
                  title="Import from CSV"
                >
                  <UploadIcon className="h-4 w-4" />
                  import csv
                </label>
                <input 
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                
                <button
                  onClick={handleExportCSV}
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
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search queue..."
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    className="px-4 py-1 border border-black font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black w-40"
                  />
                </div>
                <DesktopAlbumSearchButton />
              </div>
            </div>
          </div>
          
          {/* Mobile secondary controls */}
          {isMobile && (
            <div className="flex gap-2 justify-between mt-2 sm:hidden">
              <label 
                htmlFor="csv-upload-mobile"
                className="flex-1 whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs cursor-pointer flex items-center justify-center gap-1"
                title="Import from CSV"
              >
                <UploadIcon className="h-3 w-3" />
                import
              </label>
              <input 
                id="csv-upload-mobile"
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              
              <button
                onClick={handleExportCSV}
                className="flex-1 whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs cursor-pointer flex items-center justify-center gap-1"
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
        
        {/* Albums grid */}
        <AlbumGrid columns={gridScale}>
          {filteredQueueAlbums.map((queueAlbum) => (
            <div 
              key={queueAlbum.id}
              className="mb-2"
            >
              {/* Album art with overlay */}
              <div className="relative group">
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleAlbumClick(queueAlbum.albumId, e);
                  }}
                  className="block"
                >
                  <AlbumArt
                    src={queueAlbum.album.imageUrl}
                    alt={queueAlbum.album.name}
                  />
                </a>
                
                {/* Click overlay - only on album art */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[5] pointer-events-none">
                  <button 
                    className="absolute top-2 right-2 bg-transparent border border-white w-6 h-6 flex items-center justify-center text-white hover:text-gray-300 text-sm font-bold pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeFromQueue(queueAlbum.albumId);
                    }}
                    title="Remove from Queue"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Album details - outside the overlay */}
              {gridScale < 5 && (
                <div className="mt-1">
                  <div className="text-xs truncate">{queueAlbum.album.name}</div>
                  <div className="text-xs text-gray-500 truncate">{queueAlbum.album.artist}</div>
                  {queueAlbum.album.genre && (
                    <div className="text-xs text-gray-400 truncate font-mono">{queueAlbum.album.genre}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </AlbumGrid>
      </div>
      
      {/* Mobile controls are now integrated at the top */}
      

      
      {/* Album Details Dialog */}
      {selectedAlbum && (
        <AlbumDetailsDialog
          isOpen={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          album={selectedAlbum}
          onSave={handleSaveReview}
          onUpdateGenre={handleUpdateGenre}
        />
      )}

      {/* Search dialogs */}
      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchInputChange}
        onSearch={handleSearchSubmit}
        searchResults={searchResults}
        isSearching={isSearching}
        onAddAlbum={handleAddToQueue}
        dialogTitle="Add an album to Queue"
        addButtonText="Add"
      />

      <SearchDialog
        open={mobileSearchDialogOpen}
        onOpenChange={setMobileSearchDialogOpen}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchInputChange}
        onSearch={handleSearchSubmit}
        searchResults={searchResults}
        isSearching={isSearching}
        onAddAlbum={handleAddToQueue}
        dialogTitle="Add an album to Queue"
        addButtonText="Add"
        mobile={true}
      />

      {/* Duplicate Album Dialog */}
      <DuplicateAlbumDialog
        isOpen={duplicateDialogOpen}
        onClose={() => {
          setDuplicateDialogOpen(false);
          setPendingDuplicateAlbum(null);
        }}
        onConfirm={handleConfirmDuplicate}
        albumName={pendingDuplicateAlbum?.name || ""}
        sectionName="Queue"
      />
    </Layout>
  );
}