import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { openInSpotify } from "@/lib/spotify";

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

  const getMonthYear = (review: AlbumReview) => {
    try {
      const dateStr = review.listenedAt || review.reviewedAt;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "unknown";
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();
    } catch {
      return "unknown";
    }
  };

  const groupReviewsByMonth = (reviews: AlbumReview[]) => {
    const grouped: Record<string, AlbumReview[]> = {};
    const sorted = [...reviews].sort((a, b) => {
      const dateA = new Date(a.listenedAt || a.reviewedAt);
      const dateB = new Date(b.listenedAt || b.reviewedAt);
      return dateB.getTime() - dateA.getTime();
    });

    for (const review of sorted) {
      const monthYear = getMonthYear(review);
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(review);
    }
    return grouped;
  };

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

  const groupedReviews = groupReviewsByMonth(data.reviews);

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="mb-4">
        <h1 className="font-mono text-lg font-bold">{data.username}'s list</h1>
        <p className="font-mono text-xs text-black/60">{data.reviews.length} albums</p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedReviews).map(([monthYear, reviews]) => (
          <div key={monthYear}>
            <div className="bg-gray-200 py-2 px-4 mb-4 font-mono text-sm">
              {monthYear}
            </div>

            <div className="space-y-4">
              {reviews.map((review, index) => (
                <div key={`${review.album.spotifyId}-${index}`} className="border-b border-gray-100 pb-4" data-testid={`embed-review-${index}`}>
                  <div className="flex gap-3">
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

                    <div className="flex items-center">
                      <StarRating value={parseFloat(review.rating)} size="medium" readonly />
                    </div>
                  </div>
                  
                  {review.review && (
                    <div className="mt-2 ml-[52px] font-mono text-sm text-black/80">
                      <p dangerouslySetInnerHTML={{ __html: review.review }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {data.reviews.length === 0 && (
          <div className="text-center py-8 font-mono text-sm text-black/60">
            No reviews yet
          </div>
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
    </div>
  );
}
