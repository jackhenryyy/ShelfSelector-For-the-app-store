import { useState, useEffect } from "react";
import { useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { openInSpotify } from "@/lib/spotify";
import { MenuIcon, CalendarIcon, DownloadIcon } from "lucide-react";
import { AlbumReview } from "@/hooks/use-albums";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { exportAlbumsToCSV } from "@/lib/csv-export";
import { 
  AlbumFilterSort, 
  SortOption, 
  FilterOption, 
  sortAlbums, 
  filterAlbums, 
  groupAlbumsByMonth 
} from "@/components/ui/album-filter-sort";

export default function ListPage() {
  const { albumReviews, searchReviews, updateReview } = useAlbumReviews();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReviews, setFilteredReviews] = useState<AlbumReview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeReview, setActiveReview] = useState<AlbumReview | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editReview, setEditReview] = useState("");
  const [editListenedAt, setEditListenedAt] = useState<Date | undefined>(undefined);
  const [sortOption, setSortOption] = useState<SortOption>("date-added-newest");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  
  // Update filtered reviews when albums or search changes
  useEffect(() => {
    if (!albumReviews) return;
    
    if (!searchQuery.trim()) {
      let sortedReviews = [...albumReviews];
      
      // Apply sorting
      sortedReviews = sortAlbums(sortedReviews, sortOption);
      
      // Apply filtering
      sortedReviews = filterAlbums(sortedReviews, filterOptions);
      
      setFilteredReviews(sortedReviews);
    } else {
      handleSearch();
    }
  }, [albumReviews, searchQuery, sortOption, filterOptions]);
  
  // Function to handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      if (albumReviews) {
        const sortedReviews = sortAlbums(albumReviews, sortOption);
        setFilteredReviews(sortedReviews);
      }
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchReviews(searchQuery);
      const sortedResults = sortAlbums(results, sortOption);
      setFilteredReviews(sortedResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Function to open album in Spotify
  const handleOpenAlbumInSpotify = (spotifyId: string) => {
    openInSpotify(spotifyId);
  };
  
  // Function to open review edit dialog
  const handleEditReview = (review: AlbumReview) => {
    setActiveReview(review);
    setEditRating(review.rating);
    setEditReview(review.review || "");
    setEditListenedAt(review.listenedAt ? new Date(review.listenedAt) : undefined);
  };
  
  // Function to save edited review
  const handleSaveReview = () => {
    if (!activeReview) return;
    
    updateReview({
      id: activeReview.id,
      rating: editRating,
      review: editReview,
      listenedAt: editListenedAt
    });
    
    setActiveReview(null);
  };

  // Get unique artists, genres, and years for filters
  const uniqueArtists = albumReviews 
    ? [...new Set(albumReviews.map(r => r.album.artist))]
    : [];
    
  const uniqueGenres = albumReviews
    ? [...new Set(albumReviews.map(r => r.album.genre))]
    : [];
    
  const uniqueYears = albumReviews
    ? [...new Set(albumReviews.map(r => r.album.releaseYear))]
    : [];

  // Group the reviews by month/year if not searching
  const groupedReviews = !searchQuery
    ? groupAlbumsByMonth(filteredReviews)
    : { "search results": filteredReviews };
    
  // Helper function to get day from date string
  const getDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate();
  };

  // Sort the month-year keys in reverse chronological order
  const sortedMonthYearKeys = Object.keys(groupedReviews).sort((a, b) => {
    // For search results, always show at the top
    if (a === "search results") return -1;
    if (b === "search results") return 1;
    
    // Otherwise, parse the month-year and compare dates
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <Layout
      title="the list"
      subtitle=""
    >
      <div className="p-4 pt-0">
        <div className="mb-1 font-mono text-xs text-black/60">
          {filteredReviews.length} albums
        </div>
        <div className="flex justify-between items-center mb-4">
          {/* Filter and Sort Controls */}
          <AlbumFilterSort
            onSortChange={setSortOption}
            onFilterChange={setFilterOptions}
            selectedSort={sortOption}
            showFilterOptions={true}
            totalCount={filteredReviews.length}
            uniqueArtists={uniqueArtists}
            uniqueGenres={uniqueGenres}
            uniqueYears={uniqueYears}
          />
          
          {/* Export Button */}
          <button 
            onClick={() => exportAlbumsToCSV(filteredReviews, 'the-shelf-export.csv', true)}
            className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm flex items-center gap-1"
            title="Export to CSV"
          >
            <DownloadIcon className="h-4 w-4" />
            export csv
          </button>
        </div>
        
        <div className="space-y-6">
          {isSearching ? (
            <div className="text-center py-8 font-mono">Searching...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-8 font-mono">
              {searchQuery ? "No reviews match your search" : "No reviews yet"}
            </div>
          ) : (
            sortedMonthYearKeys.map(monthYear => (
              <div key={monthYear}>
                {/* Month-Year Header */}
                <div className="bg-gray-200 py-2 px-4 mb-4 font-mono text-sm">
                  {monthYear}
                </div>
                
                {/* Reviews for this month */}
                <div className="space-y-4">
                  {groupedReviews[monthYear].map((review, index) => (
                    <div key={review.id} className="flex gap-3">
                      {/* Day Number in Box */}
                      <div className="w-10 h-10 min-w-[40px] flex items-center justify-center border border-black aspect-square">
                        <div className="font-mono text-sm">{review.listenedAt ? getDay(review.listenedAt) : "--"}</div>
                      </div>
                      
                      {/* Album Art */}
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenAlbumInSpotify(review.album.spotifyId);
                        }}
                      >
                        <AlbumArt
                          src={review.album.imageUrl}
                          alt={review.album.name}
                          size="small"
                        />
                      </a>
                      
                      {/* Album Details */}
                      <div className="flex-grow">
                        <h3 className="font-mono text-sm">{review.album.name}</h3>
                        <div className="flex items-center mt-0.5">
                          <p className="font-mono text-xs text-black/60">{review.album.artist}</p>
                          <div className="flex items-center gap-2 ml-4">
                            <StarRating rating={review.rating} size="medium" readonly />
                            {review.review && (
                              <p className="font-mono text-xs line-clamp-1">{review.review}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Menu Button */}
                      <div className="flex items-center">
                        <button 
                          className="text-black/60"
                          onClick={() => handleEditReview(review)}
                        >
                          <MenuIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Edit Review Dialog */}
      <Dialog open={!!activeReview} onOpenChange={(open) => !open && setActiveReview(null)}>
        <DialogContent>
          <DialogTitle className="font-mono">Edit Review</DialogTitle>
          
          {activeReview && (
            <div className="flex items-center gap-3 mt-2">
              <AlbumArt
                src={activeReview.album.imageUrl}
                alt={activeReview.album.name}
                size="small"
              />
              <div>
                <h3 className="font-mono">{activeReview.album.name}</h3>
                <p className="font-mono text-sm text-gray-500">{activeReview.album.artist}</p>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <label className="block font-mono text-sm mb-1">Rating</label>
            <StarRating 
              rating={editRating} 
              onChange={setEditRating}
              size="large"
            />
          </div>
          
          <div className="mt-4">
            <label className="block font-mono text-sm mb-1">Review</label>
            <textarea
              value={editReview}
              onChange={(e) => setEditReview(e.target.value)}
              placeholder="Write a short review..."
              maxLength={100}
              className="w-full p-2 border border-black font-mono text-sm"
              rows={3}
            />
            <p className="font-mono text-xs text-gray-500 mt-1">
              {editReview.length}/100 characters
            </p>
          </div>
          
          <div className="py-2 mt-4">
            <label className="block font-mono text-sm mb-1">When did you listen to this album?</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal font-mono border-black",
                    !editListenedAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editListenedAt ? format(editListenedAt, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border border-black rounded-none">
                <Calendar
                  mode="single"
                  selected={editListenedAt}
                  onSelect={setEditListenedAt}
                  initialFocus
                  className="font-mono"
                  classNames={{
                    day_today: "bg-black text-white font-medium",
                    day_selected: "bg-black text-white font-medium",
                    day: "h-8 w-8 p-0 font-normal border border-gray-200 aspect-square",
                    head_cell: "font-mono text-xs font-normal",
                    cell: "text-center text-xs p-0 relative focus-within:relative first:text-gray-500 last:text-gray-500",
                    caption: "flex justify-center pt-1 relative items-center font-mono",
                    nav_button: "border border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100",
                    table: "border-collapse space-y-1 font-mono"
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <button className="px-4 py-1 border border-black bg-white text-black font-mono text-sm">Cancel</button>
            </DialogClose>
            <button 
              onClick={handleSaveReview}
              className="px-4 py-1 border border-black bg-black text-white font-mono text-sm"
            >
              Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
