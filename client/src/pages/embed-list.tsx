import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { MenuIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlbumFilterSort, 
  SortOption, 
  FilterOption, 
  sortAlbums, 
  filterAlbums, 
  groupAlbumsByMonth 
} from "@/components/ui/album-filter-sort";

interface Album {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  genre: string | null;
}

interface AlbumReview {
  rating: string;
  review: string | null;
  reviewedAt: string;
  listenedAt: string | null;
  album: Album;
}

interface SharedListData {
  username: string;
  reviews: AlbumReview[];
}

export default function EmbedListPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<SharedListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReview, setActiveReview] = useState<AlbumReview | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-added-newest");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const [filteredReviews, setFilteredReviews] = useState<AlbumReview[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/shared/list/${params.token}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("This shared list could not be found.");
          } else {
            setError("Failed to load the shared list.");
          }
          return;
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError("Failed to load the shared list.");
      } finally {
        setLoading(false);
      }
    };

    if (params.token) {
      fetchData();
    }
  }, [params.token]);

  useEffect(() => {
    if (!data) return;
    
    let processed = [...data.reviews];
    processed = sortAlbums(processed, sortOption);
    processed = filterAlbums(processed, filterOptions);
    setFilteredReviews(processed);
  }, [data, sortOption, filterOptions]);

  const getDay = (review: AlbumReview) => {
    try {
      const dateStr = review.listenedAt || review.reviewedAt;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "--";
      return date.getDate();
    } catch {
      return "--";
    }
  };

  const uniqueArtists = data 
    ? [...new Set(data.reviews.map(r => r.album.artist))]
    : [];
    
  const uniqueGenres = data
    ? [...new Set(data.reviews.map(r => r.album.genre).filter(Boolean))]
    : [];

  const groupedReviews = groupAlbumsByMonth(filteredReviews);

  const sortedMonthYearKeys = Object.keys(groupedReviews).sort((a, b) => {
    if (a === "search results") return -1;
    if (b === "search results") return 1;
    if (a === "unknown date") return 1;
    if (b === "unknown date") return -1;
    
    const monthsOrder: Record<string, number> = {
      "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5,
      "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11
    };
    
    try {
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");
      const yearDiff = parseInt(yearB) - parseInt(yearA);
      if (yearDiff !== 0) return yearDiff;
      return monthsOrder[monthB.toLowerCase()] - monthsOrder[monthA.toLowerCase()];
    } catch {
      return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-sm">
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-sm text-red-600">
        {error || "Something went wrong."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="mb-4">
        <h1 className="font-mono text-lg font-bold">{data.username}'s list</h1>
        <p className="font-mono text-xs text-black/60">{filteredReviews.length} albums</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <AlbumFilterSort
          onSortChange={setSortOption}
          onFilterChange={setFilterOptions}
          selectedSort={sortOption}
          showFilterOptions={true}
          totalCount={filteredReviews.length}
          uniqueArtists={uniqueArtists}
          uniqueGenres={uniqueGenres}
          uniqueYears={[]}
        />
      </div>

      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 font-mono text-sm text-black/60">
            No reviews yet
          </div>
        ) : (
          sortedMonthYearKeys.map(monthYear => (
            <div key={monthYear}>
              <div className="bg-gray-200 py-2 px-4 mb-4 font-mono text-sm">
                {monthYear}
              </div>

              <div className="space-y-4">
                {groupedReviews[monthYear].map((review, index) => (
                  <div key={`${review.album.spotifyId}-${index}`} className="flex gap-3" data-testid={`embed-review-${index}`}>
                    <div className="w-10 h-10 min-w-[40px] flex items-center justify-center border border-black aspect-square">
                      <div className="font-mono text-sm">{getDay(review)}</div>
                    </div>

                    <a
                      href={`https://open.spotify.com/album/${review.album.spotifyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer"
                      data-testid={`link-spotify-${index}`}
                    >
                      <AlbumArt
                        src={review.album.imageUrl}
                        alt={review.album.name}
                        size="small"
                      />
                    </a>

                    <div className="flex-grow">
                      <h3 className="font-mono text-sm">{review.album.name}</h3>
                      <p className="font-mono text-xs text-black/60 mt-0.5">{review.album.artist}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StarRating value={parseFloat(review.rating)} size="medium" readonly />
                      <button 
                        type="button"
                        className="text-black/60 hover:text-black p-2 cursor-pointer relative z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveReview(review);
                        }}
                        data-testid={`button-view-review-${index}`}
                      >
                        <MenuIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <a
          href="/"
          target="_blank"
          className="font-mono text-xs text-black/40 hover:text-black"
        >
          powered by the shelf
        </a>
      </div>

      <Dialog open={!!activeReview} onOpenChange={() => setActiveReview(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg">
              {activeReview?.album.name}
            </DialogTitle>
          </DialogHeader>
          
          {activeReview && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <a
                  href={`https://open.spotify.com/album/${activeReview.album.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AlbumArt
                    src={activeReview.album.imageUrl}
                    alt={activeReview.album.name}
                    size="medium"
                  />
                </a>
                <div>
                  <p className="font-mono text-sm text-black/60">{activeReview.album.artist}</p>
                  {activeReview.album.genre && (
                    <p className="font-mono text-xs text-black/40 mt-1">{activeReview.album.genre}</p>
                  )}
                  <div className="mt-2">
                    <StarRating value={parseFloat(activeReview.rating)} size="large" readonly />
                  </div>
                </div>
              </div>

              {activeReview.review && (
                <div className="pt-4 border-t">
                  <h4 className="font-mono text-xs text-black/60 mb-2">review</h4>
                  <div 
                    className="font-mono text-sm"
                    dangerouslySetInnerHTML={{ __html: activeReview.review }}
                  />
                </div>
              )}

              {(activeReview.listenedAt || activeReview.reviewedAt) && (
                <div className="pt-4 border-t">
                  <p className="font-mono text-xs text-black/40">
                    {activeReview.listenedAt 
                      ? `listened on ${new Date(activeReview.listenedAt).toLocaleDateString()}`
                      : `reviewed on ${new Date(activeReview.reviewedAt).toLocaleDateString()}`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
