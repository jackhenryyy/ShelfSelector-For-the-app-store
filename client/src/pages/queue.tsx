import { useState } from "react";
import { useSpotifyAlbums } from "@/hooks/use-spotify";
import { useQueueAlbums, useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { openInSpotify } from "@/lib/spotify";
import { SearchIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function QueuePage() {
  const { queueAlbums, addToQueue, removeFromQueue } = useQueueAlbums();
  const { addToNoSkips } = useNoSkipsAlbums();
  const { searchAlbums } = useSpotifyAlbums();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<{id: number, x: number, y: number} | null>(null);
  const [sortOrder, setSortOrder] = useState<string>("date");
  
  // Function to handle sorting
  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value);
  };
  
  // Get sorted queue albums
  const sortedQueueAlbums = queueAlbums ? [...queueAlbums].sort((a, b) => {
    switch (sortOrder) {
      case "A - Z":
        return a.album.name.localeCompare(b.album.name);
      case "genre":
        return (a.album.genre || "").localeCompare(b.album.genre || "");
      case "year":
        return (a.album.releaseYear || 0) - (b.album.releaseYear || 0);
      case "date":
      default:
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    }
  }) : [];
  
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
    addToNoSkips(albumId);
    toast({
      title: "Added to No Skips",
      description: "Album has been added to your No Skips collection",
    });
    handleCloseContextMenu();
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

  return (
    <Layout
      title="the queue"
      subtitle={`${sortedQueueAlbums.length} albums`}
    >
      <div className="p-4 pt-0">
        <div className="flex justify-between items-center mb-4">
          <div className="w-44">
            <select 
              className="w-full font-mono text-base border border-black rounded p-2"
              value={sortOrder}
              onChange={handleSort}
            >
              <option value="date">sort</option>
              <option value="A - Z">A - Z</option>
              <option value="genre">genre</option>
              <option value="year">year</option>
            </select>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-xs border border-black/20 rounded p-1 px-2">+ add album</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Add an album</DialogTitle>
              <DialogDescription>
                Search for an album to add to your queue
              </DialogDescription>
              
              <div className="flex items-center gap-2 mt-4">
                <Input
                  placeholder="Search albums..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button 
                  size="sm" 
                  onClick={handleSearch} 
                  disabled={isSearching}
                >
                  <SearchIcon className="h-4 w-4 mr-1" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-80 overflow-y-auto">
                  <AlbumGrid>
                    {searchResults.map((album) => (
                      <div key={album.id} className="relative group">
                        <AlbumArt
                          src={album.imageUrl}
                          alt={album.name}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-white"
                            onClick={() => handleAddToQueue(album.id)}
                          >
                            Add to Queue
                          </Button>
                        </div>
                        <p className="text-xs mt-1 truncate">{album.name}</p>
                      </div>
                    ))}
                  </AlbumGrid>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        
        <AlbumGrid>
          {sortedQueueAlbums.map((queueAlbum) => (
            <div 
              key={queueAlbum.id}
              className="relative group"
              onClick={(e) => handleAlbumClick(queueAlbum.albumId, e)}
            >
              <AlbumArt
                src={queueAlbum.album.imageUrl}
                alt={queueAlbum.album.name}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex flex-col">
                  <button className="text-white text-xs mb-1 hover:underline">
                    Play on Spotify
                  </button>
                  <button className="text-white text-xs hover:underline">
                    Add to No Skips
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
                  onClick={() => handleAddToNoSkips(qa.albumId)}
                >
                  Add to No Skips
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
    </Layout>
  );
}
