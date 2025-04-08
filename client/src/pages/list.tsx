import { useState, useEffect } from "react";
import { useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { openInSpotify } from "@/lib/spotify";
import { SearchIcon, MoreVerticalIcon, MenuIcon } from "lucide-react";
import { AlbumReview } from "@/hooks/use-albums";
import { format } from "date-fns";

export default function ListPage() {
  const { albumReviews, searchReviews, updateReview } = useAlbumReviews();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReviews, setFilteredReviews] = useState<AlbumReview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentMonth, setCurrentMonth] = useState("");
  const [activeReview, setActiveReview] = useState<AlbumReview | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editReview, setEditReview] = useState("");
  
  // Set current month on component mount
  useEffect(() => {
    const date = new Date();
    const monthName = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    setCurrentMonth(`${monthName.toLowerCase()} ${year}`);
  }, []);
  
  // Update filtered reviews when albums or search changes
  useEffect(() => {
    if (!albumReviews) return;
    
    if (!searchQuery.trim()) {
      setFilteredReviews(albumReviews);
    } else {
      handleSearch();
    }
  }, [albumReviews, searchQuery]);
  
  // Function to handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      if (albumReviews) {
        setFilteredReviews(albumReviews);
      }
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchReviews(searchQuery);
      setFilteredReviews(results);
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
  };
  
  // Function to save edited review
  const handleSaveReview = () => {
    if (!activeReview) return;
    
    updateReview({
      id: activeReview.id,
      rating: editRating,
      review: editReview
    });
    
    setActiveReview(null);
  };

  // Function to group reviews by month and year
  const groupReviewsByMonthYear = (reviews: AlbumReview[]) => {
    const groupedReviews: Record<string, AlbumReview[]> = {};
    
    reviews.forEach(review => {
      const date = new Date(review.reviewedAt);
      const monthYear = format(date, "MMMM yyyy").toLowerCase();
      
      if (!groupedReviews[monthYear]) {
        groupedReviews[monthYear] = [];
      }
      
      groupedReviews[monthYear].push(review);
    });
    
    // Sort the reviews within each month group by date (newest first)
    Object.keys(groupedReviews).forEach(key => {
      groupedReviews[key].sort((a, b) => {
        return new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime();
      });
    });
    
    return groupedReviews;
  };
  
  // Group the reviews
  const groupedReviews = searchQuery 
    ? { "search results": filteredReviews } 
    : groupReviewsByMonthYear(filteredReviews);

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
        <div className="flex justify-between items-center mb-6">
          <div></div>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              className="text-xs pr-6 h-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <SearchIcon className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-black/50" />
          </div>
        </div>
        
        <div className="space-y-6">
          {isSearching ? (
            <div className="text-center py-8 text-gray-500">Searching...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "No reviews match your search" : "No reviews yet"}
            </div>
          ) : (
            sortedMonthYearKeys.map(monthYear => (
              <div key={monthYear}>
                {/* Month-Year Header */}
                <div className="bg-gray-100 py-2 px-4 mb-4 font-mono text-sm">
                  {monthYear}
                </div>
                
                {/* Reviews for this month */}
                <div className="space-y-4">
                  {groupedReviews[monthYear].map((review, index) => (
                    <div key={review.id} className="flex gap-4">
                      <div className="w-12 text-center">
                        <div className="text-xl font-medium text-black">{index + 1}</div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex gap-3">
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
                          <div className="flex-grow">
                            <h3 className="text-sm font-medium text-black">{review.album.name}</h3>
                            <p className="text-xs text-black/60">{review.album.artist}</p>
                            <div className="mt-1">
                              <StarRating rating={review.rating} size="small" readonly />
                            </div>
                            {review.review && (
                              <p className="text-xs mt-1 text-black/80">{review.review}</p>
                            )}
                          </div>
                          <div className="flex items-center">
                            <button 
                              className="text-black/60"
                              onClick={() => handleEditReview(review)}
                            >
                              <MenuIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
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
          <DialogTitle>Edit Review</DialogTitle>
          <DialogDescription>
            Update your rating and review for this album
          </DialogDescription>
          
          {activeReview && (
            <div className="flex items-center gap-3 mt-2">
              <AlbumArt
                src={activeReview.album.imageUrl}
                alt={activeReview.album.name}
                size="small"
              />
              <div>
                <h3 className="font-medium">{activeReview.album.name}</h3>
                <p className="text-sm text-gray-500">{activeReview.album.artist}</p>
              </div>
            </div>
          )}
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Rating</label>
            <StarRating 
              rating={editRating} 
              onChange={setEditRating}
              size="large"
            />
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Review</label>
            <Input
              value={editReview}
              onChange={(e) => setEditReview(e.target.value)}
              placeholder="Write a short review..."
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {editReview.length}/100 characters
            </p>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveReview}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
