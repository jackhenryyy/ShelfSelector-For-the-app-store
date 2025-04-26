
import { useState, useEffect } from "react";
import { useSpotifyAlbums } from "@/hooks/use-spotify";
import { useQueueAlbums, useNoSkipsAlbums, useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { openInSpotify } from "@/lib/spotify";
import { SearchIcon, UploadIcon, DownloadIcon } from "lucide-react";
import { exportAlbumsToCSV } from "@/lib/csv-export";
import { parseCSVToAlbums } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { ReviewDialog } from "@/components/ui/review-dialog";
import { EditableGenre } from "@/components/ui/editable-genre";
import { GenreEditorDialog } from "@/components/ui/genre-editor-dialog";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import { 
  AlbumFilterSort, 
  SortOption
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

// Removed filtering functionality

export default function QueuePage() {
  const { queueAlbums, addToQueue, removeFromQueue } = useQueueAlbums();
  const { addToNoSkips } = useNoSkipsAlbums();
  const { createReview } = useAlbumReviews();
  const { searchAlbums } = useSpotifyAlbums();
  const { updateGenre } = useAlbumGenre();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<{id: number, x: number, y: number} | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [genreEditorOpen, setGenreEditorOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-added-newest");
  const [sortedQueueAlbums, setSortedQueueAlbums] = useState<any[]>([]);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [gridScale, setGridScale] = useState<number>(3);
  
  // Update sorted queue albums when sorting changes
  useEffect(() => {
    if (!queueAlbums) return;
    
    // Apply sorting only
    const processed = sortQueueAlbums(queueAlbums, sortOption);
    
    setSortedQueueAlbums(processed);
  }, [queueAlbums, sortOption]);
  
  // Function to handle album click
  const handleAlbumClick = (albumId: number, event: React.MouseEvent) => {
    event.preventDefault();
    
    // Show context menu at click position
    setShowContextMenu({
      id: albumId,
      x: event.clientX,
      y: event.clientY
    });
  };
  
  // Function to close context menu
  const handleCloseContextMenu = () => {
    setShowContextMenu(null);
  };
  
  // Function to play album on Spotify
  const handlePlayOnSpotify = (spotifyId: string) => {
    openInSpotify(spotifyId);
    handleCloseContextMenu();
  };
  
  // Function to add to No Skips
  const handleAddToNoSkips = (albumId: number) => {
    addToNoSkips({ albumId, isTopFour: false });
    toast({
      title: "Added to No Skips",
      description: "Album has been added to your No Skips collection",
    });
    handleCloseContextMenu();
  };
  
  // Function to handle genre edit
  const handleEditGenre = (albumId: number) => {
    // Find the album
    const album = queueAlbums?.find(qa => qa.albumId === albumId)?.album;
    if (!album) return;
    
    // Open the genre editor dialog
    setSelectedAlbum(album);
    setGenreEditorOpen(true);
    handleCloseContextMenu();
  };
  
  // Function to open the review dialog
  const handleOpenReviewDialog = (albumId: number) => {
    const album = queueAlbums?.find(qa => qa.albumId === albumId)?.album;
    if (album) {
      setSelectedAlbum(album);
      setReviewDialogOpen(true);
      handleCloseContextMenu();
    }
  };
  
  // Function to handle submitting a review
  const handleSubmitReview = async (rating: number, review: string) => {
    if (!selectedAlbum) return;
    
    try {
      // Create the review in the database
      await createReview({
        albumId: selectedAlbum.id,
        rating,
        review: review || "",
      });
      
      // Remove the album from the queue
      removeFromQueue(selectedAlbum.id);
      
      toast({
        title: "Review submitted",
        description: "Album has been added to your list and removed from your queue",
      });
      
      setSelectedAlbum(null);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Review failed",
        description: "There was an error submitting your review",
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
  
  // Function to add album to queue
  const handleAddToQueue = (albumId: number) => {
    addToQueue(albumId);
    toast({
      title: "Added to Queue",
      description: "Album has been added to your Queue",
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
    if (!sortedQueueAlbums || sortedQueueAlbums.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Your queue is empty",
        variant: "destructive"
      });
      return;
    }
    
    exportAlbumsToCSV(sortedQueueAlbums, "queue-albums.csv");
    
    toast({
      title: "Export complete",
      description: `${sortedQueueAlbums.length} albums exported to CSV`,
    });
  };

  return (
    <Layout
      title="the queue"
      subtitle=""
    >
      <div className="p-4 pt-0">
        <div className="mb-1 font-mono text-xs text-black/60">
          {sortedQueueAlbums.length} albums
        </div>
        <div className="flex justify-between items-center mb-4">
          {/* Filter Controls and Import/Export CSV */}
          <div className="flex gap-2">
            <AlbumFilterSort
              onSortChange={setSortOption}
              selectedSort={sortOption}
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
              className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm cursor-pointer flex items-center gap-1"
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
          
          {/* Add Album Button */}
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full p-2 border border-black font-mono text-sm"
                />
                <button 
                  className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
                  onClick={handleSearch} 
                  disabled={isSearching}
                >
                  <SearchIcon className="h-4 w-4 mr-1" />
                  {isSearching ? "..." : "Search"}
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-[50vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchResults.map((album) => (
                      <div key={album.id} className="border border-black p-2">
                        <AlbumArt
                          src={album.imageUrl}
                          alt={album.name}
                          size="small"
                        />
                        <div className="mt-1">
                          <div className="font-mono text-xs truncate">{album.name}</div>
                          <div className="font-mono text-xs text-black/60 truncate">{album.artist}</div>
                        </div>
                        <button 
                          className="w-full mt-2 px-2 py-1 border border-black bg-white font-mono text-xs"
                          onClick={() => handleAddToQueue(album.id)}
                        >
                          Add to Queue
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        
        <AlbumGrid columns={gridScale}>
          {sortedQueueAlbums.map((queueAlbum) => (
            <div 
              key={queueAlbum.id}
              className="relative group mb-2"
              onClick={(e) => handleAlbumClick(queueAlbum.albumId, e)}
            >
              <AlbumArt
                src={queueAlbum.album.imageUrl}
                alt={queueAlbum.album.name}
              />
              {gridScale < 5 && (
                <>
                  <div className="mt-1 text-xs truncate">{queueAlbum.album.name}</div>
                  <div className="text-xs text-gray-500 truncate">{queueAlbum.album.artist}</div>
                  <EditableGenre albumId={queueAlbum.album.id} genre={queueAlbum.album.genre} />
                </>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex flex-col">
                  <button 
                    className="text-white text-xs mb-1 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayOnSpotify(queueAlbum.album.spotifyId);
                    }}
                  >
                    Play on Spotify
                  </button>
                  <button 
                    className="text-white text-xs mb-1 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReviewDialog(queueAlbum.albumId);
                    }}
                  >
                    Review & Add to List
                  </button>
                  <button 
                    className="text-white text-xs mb-1 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditGenre(queueAlbum.albumId);
                    }}
                  >
                    Edit Genre
                  </button>
                  <button 
                    className="text-white text-xs hover:underline text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(queueAlbum.albumId);
                    }}
                  >
                    Remove from Queue
                  </button>
                </div>
              </div>
            </div>
          ))}
        </AlbumGrid>
      </div>
      
      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={handleCloseContextMenu}
          />
          <div 
            className="fixed z-50 bg-white shadow-lg rounded p-2 min-w-32"
            style={{
              top: showContextMenu.y,
              left: showContextMenu.x,
              transform: "translate(-50%, -50%)"
            }}
          >
            {queueAlbums?.map(qa => qa.albumId === showContextMenu.id ? (
              <div key={qa.id} className="flex flex-col space-y-1">
                <button 
                  className="text-sm px-4 py-1 text-left hover:bg-gray-100 rounded"
                  onClick={() => handlePlayOnSpotify(qa.album.spotifyId)}
                >
                  Play on Spotify
                </button>
                <button 
                  className="text-sm px-4 py-1 text-left hover:bg-gray-100 rounded"
                  onClick={() => handleOpenReviewDialog(qa.albumId)}
                >
                  Review & Add to List
                </button>
                <button 
                  className="text-sm px-4 py-1 text-left hover:bg-gray-100 rounded"
                  onClick={() => handleEditGenre(qa.albumId)}
                >
                  Edit Genre
                </button>
                <button 
                  className="text-sm px-4 py-1 text-left hover:bg-gray-100 rounded text-red-500"
                  onClick={() => {
                    removeFromQueue(qa.albumId);
                    handleCloseContextMenu();
                  }}
                >
                  Remove from Queue
                </button>
              </div>
            ) : null)}
          </div>
        </>
      )}
      
      {/* Review Dialog */}
      {selectedAlbum && (
        <ReviewDialog
          album={selectedAlbum}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onSubmit={handleSubmitReview}
        />
      )}
      
      {/* Genre Editor Dialog */}
      {selectedAlbum && (
        <GenreEditorDialog
          albumId={selectedAlbum.id}
          currentGenre={selectedAlbum.genre}
          open={genreEditorOpen}
          onOpenChange={setGenreEditorOpen}
          albumName={selectedAlbum.name}
          artistName={selectedAlbum.artist}
        />
      )}
    </Layout>
  );
}
