import { useState, useEffect } from "react";
import { useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewPopup } from "@/components/ui/review-popup";
import { openInSpotify } from "@/lib/spotify";
import { MenuIcon, DownloadIcon } from "lucide-react";
import { AlbumReview } from "@/hooks/use-albums";
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
  const { albumReviews, searchReviews, updateReview, deleteReview } = useAlbumReviews();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReviews, setFilteredReviews] = useState<AlbumReview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeReview, setActiveReview] = useState<AlbumReview | null>(null);
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
  
  // Function to open review popup
  const handleOpenReview = (review: AlbumReview) => {
    setActiveReview(review);
  };
  
  // Function to close review popup
  const handleCloseReview = () => {
    setActiveReview(null);
  };
  
  // Function to save edited review
  const handleSaveReview = (reviewData: {
    id: number;
    rating: number;
    review: string;
    listenedAt?: Date;
  }) => {
    updateReview(reviewData);
  };

  // Get unique artists, genres, and years for filters
  const uniqueArtists = albumReviews 
    ? [...new Set(albumReviews.map(r => r.album.artist))]
    : [];
    
  const uniqueGenres = albumReviews
    ? [...new Set(albumReviews.map(r => r.album.genre).filter(Boolean))]
    : [];
    
  const uniqueYears = albumReviews
    ? [...new Set(albumReviews.map(r => r.album.releaseYear).filter(Boolean))]
    : [];

  // Group the reviews by month/year if not searching
  const groupedReviews = !searchQuery
    ? groupAlbumsByMonth(filteredReviews)
    : { "search results": filteredReviews };
    
  // Helper function to get day from date string
  // Prioritize listenedAt (when user actually listened), fallback to reviewedAt (when review was created)
  const getDay = (review: AlbumReview) => {
    try {
      // First try to use listenedAt if it exists (user-selected date)
      const dateStr = review.listenedAt || review.reviewedAt;
      const date = new Date(dateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "--";
      }
      
      return date.getDate();
    } catch (error) {
      console.error("Error parsing date for day extraction:", error);
      return "--";
    }
  };

  // Sort the month-year keys in reverse chronological order
  const sortedMonthYearKeys = Object.keys(groupedReviews).sort((a, b) => {
    // For search results, always show at the top
    if (a === "search results") return -1;
    if (b === "search results") return 1;
    
    // For unknown date, always show at the bottom
    if (a === "unknown date") return 1;
    if (b === "unknown date") return -1;
    
    console.log("Sorting months:", a, b);
    
    // Parse month names to numbers for proper sorting
    const monthsOrder: Record<string, number> = {
      "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5,
      "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11
    };
    
    try {
      // Extract month and year from the key (format: "month year")
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");
      
      // Compare years first
      const yearDiff = parseInt(yearB) - parseInt(yearA);
      if (yearDiff !== 0) return yearDiff;
      
      // If same year, compare months
      return monthsOrder[monthB.toLowerCase()] - monthsOrder[monthA.toLowerCase()];
    } catch (error) {
      console.error("Error sorting month-year keys:", error);
      return 0;
    }
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
                        <div className="font-mono text-sm">{getDay(review)}</div>
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
                        <p className="font-mono text-xs text-black/60 mt-0.5">{review.album.artist}</p>
                      </div>
                      
                      {/* Rating and Menu Button */}
                      <div className="flex items-center gap-3">
                        <StarRating value={parseFloat(review.rating.toString())} size="medium" readonly />
                        <button 
                          className="text-black/60 hover:text-black"
                          onClick={() => handleOpenReview(review)}
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
      
      {/* Review Popup */}
      <ReviewPopup
        review={activeReview}
        isOpen={!!activeReview}
        onClose={handleCloseReview}
        onSave={handleSaveReview}
        onDelete={deleteReview}
      />
    </Layout>
  );
}
