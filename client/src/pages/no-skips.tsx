import { useState } from "react";
import { useNoSkipsAlbums } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchIcon, Plus } from "lucide-react";
import { openInSpotify, generateShareableLink } from "@/lib/spotify";
import { useSpotifyAlbums, useSpotifyAuth } from "@/hooks/use-spotify";
import { useToast } from "@/hooks/use-toast";
import { TopFourDialog } from "@/components/ui/top-four-dialog";
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
  
  // Function to handle sorting and filtering
  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
  };
  
  const handleFilterChange = (filter: FilterOption) => {
    setFilterOptions(filter);
  };
  
  // Get unique artists, genres, and years for filters
  const uniqueArtists: string[] = [];
  const uniqueGenres: (string | null)[] = [];
  const uniqueYears: (number | null)[] = [];
  
  if (noSkipsAlbums) {
    // Build unique artists list
    const artistsSet = new Set<string>();
    noSkipsAlbums.forEach(a => {
      if (a.album.artist) artistsSet.add(a.album.artist);
    });
    uniqueArtists.push(...Array.from(artistsSet));
    
    // Build unique genres list
    const genresSet = new Set<string | null>();
    noSkipsAlbums.forEach(a => {
      genresSet.add(a.album.genre);
    });
    uniqueGenres.push(...Array.from(genresSet));
    
    // Build unique years list
    const yearsSet = new Set<number | null>();
    noSkipsAlbums.forEach(a => {
      yearsSet.add(a.album.releaseYear);
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

  return (
    <Layout
      title="no skips"
      subtitle={`${noSkipsAlbums?.length || 0} albums`}
    >
      <div className="p-4 pt-0">
        <div className="flex justify-between items-center mb-4">
          <div>
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
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <button className="text-xs border border-black/20 rounded p-1 px-2">+ add album</button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Add to No Skips</DialogTitle>
              <DialogDescription>
                Search for an album to add to your No Skips collection
              </DialogDescription>
              
              <div className="flex items-center gap-2 mt-4">
                <Input
                  placeholder="Search albums..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
                />
                <Button 
                  size="sm" 
                  onClick={handleSearchSubmit} 
                  disabled={isSearching}
                >
                  <SearchIcon className="h-4 w-4 mr-1" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              
              {searchResults && searchResults.length > 0 && (
                <div className="mt-4 max-h-80 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map((album) => (
                      <div key={album.id} className="border rounded p-2">
                        <AlbumArt
                          src={album.imageUrl}
                          alt={album.name}
                          size="small"
                        />
                        <div className="mt-1">
                          <div className="text-xs font-medium truncate">{album.name}</div>
                          <div className="text-xs text-gray-500 truncate">{album.artist}</div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2 text-xs"
                          onClick={() => handleAddToNoSkips(album.id)}
                        >
                          Add
                        </Button>
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
                      <div className="mt-1 text-xs truncate">{album.album.name}</div>
                      <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
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
                <div className="mt-1 text-xs truncate">{album.album.name}</div>
                <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
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
        
        {/* Top Four Dialog */}
        <TopFourDialog
          open={topFourDialogOpen}
          onOpenChange={setTopFourDialogOpen}
          allAlbums={noSkipsAlbums || []}
          currentTopFour={topFourAlbums || []}
          onSave={handleTopFourDialogSave}
        />
        
        {/* Album Search Dialog */}
        <Dialog open={showSearch} onOpenChange={setShowSearch}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogTitle>Add to No Skips</DialogTitle>
            <DialogDescription>
              Search for an album to add to your No Skips collection.
            </DialogDescription>
            
            <form onSubmit={handleSearchSubmit} className="flex mb-4">
              <Input
                placeholder="Search for an album..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                className="mr-2"
              />
              <Button type="submit" size="sm">
                <SearchIcon size={16} />
              </Button>
            </form>
            
            <div className="max-h-[300px] overflow-y-auto">
              {isSearching ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.map((album) => (
                    <div key={album.id} className="border rounded p-2">
                      <AlbumArt
                        src={album.imageUrl}
                        alt={album.name}
                        size="small"
                      />
                      <div className="mt-1">
                        <div className="text-xs font-medium truncate">{album.name}</div>
                        <div className="text-xs text-gray-500 truncate">{album.artist}</div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 text-xs"
                        onClick={() => handleAddToNoSkips(album.id)}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="py-8 text-center text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
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
