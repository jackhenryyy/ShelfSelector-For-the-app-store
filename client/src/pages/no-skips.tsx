import { useState } from "react";
import { useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { openInSpotify, generateShareableLink } from "@/lib/spotify";
import { useSpotifyAuth } from "@/hooks/use-spotify";
import { useToast } from "@/hooks/use-toast";

export default function NoSkipsPage() {
  const { user } = useSpotifyAuth();
  const { noSkipsAlbums, topFourAlbums, updateTopFour } = useNoSkipsAlbums();
  const { toast } = useToast();
  
  const [sortOrder, setSortOrder] = useState<string>("date");
  const [isEditingTopFour, setIsEditingTopFour] = useState(false);
  const [selectedForTopFour, setSelectedForTopFour] = useState<{albumId: number, position: number}[]>([]);
  
  // Function to handle sorting
  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value);
  };
  
  // Get sorted no skips albums (excluding top four)
  const sortedNoSkipsAlbums = noSkipsAlbums 
    ? [...noSkipsAlbums]
        .filter(album => !album.isTopFour)
        .sort((a, b) => {
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
        })
    : [];
  
  // Function to handle opening album in Spotify
  const handleOpenAlbumInSpotify = (spotifyId: string) => {
    openInSpotify(spotifyId);
  };
  
  // Function to share No Skips page
  const handleShare = () => {
    if (!user) return;
    
    const shareableLink = generateShareableLink(user.id);
    
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

  return (
    <Layout
      title="no skips"
      subtitle={`${noSkipsAlbums?.length || 0} albums`}
    >
      <div className="p-4 pt-0">
        <div className="flex justify-between items-center">
          <div></div>
          <div>
            <select 
              className="text-xs border rounded p-1"
              value={sortOrder}
              onChange={handleSort}
            >
              <option value="date">date ↓</option>
              <option value="A - Z">A - Z</option>
              <option value="genre">genre</option>
              <option value="year">year</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <h2 className="text-sm font-medium mb-2 text-black">top 4</h2>
          {!isEditingTopFour ? (
            <button 
              className="text-xs text-gray-500 hover:text-black"
              onClick={handleStartEditingTopFour}
            >
              edit
            </button>
          ) : (
            <button 
              className="text-xs text-green-600 hover:text-green-700"
              onClick={handleSaveTopFour}
            >
              save
            </button>
          )}
        </div>
        
        <div className="top-albums mb-6">
          {topFourAlbums?.length ? (
            topFourAlbums
              .sort((a, b) => (a.topFourPosition || 0) - (b.topFourPosition || 0))
              .map((album) => (
                <div key={album.id} className={isEditingTopFour ? "relative" : ""}>
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
                      className={isEditingTopFour ? "opacity-70" : ""}
                    />
                  </a>
                  {isEditingTopFour && (
                    <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                      ×
                    </div>
                  )}
                </div>
              ))
          ) : (
            // Empty slots for top four
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-gray-100 rounded aspect-square flex items-center justify-center text-gray-400">
                {isEditingTopFour ? "Select" : "Empty"}
              </div>
            ))
          )}
        </div>
        
        <h2 className="text-sm font-medium mb-2 text-black">albums</h2>
        <AlbumGrid>
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
              </a>
            </div>
          ))}
        </AlbumGrid>
        
        <div className="flex justify-center mt-6 mb-4">
          <button 
            className="bg-[#1DB954] hover:bg-[#1ed760] text-white text-xs py-1 px-4 rounded-full"
            onClick={handleShare}
          >
            Share
          </button>
        </div>
      </div>
    </Layout>
  );
}
