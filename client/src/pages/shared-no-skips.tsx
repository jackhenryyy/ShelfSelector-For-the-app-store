import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/ui/layout";
import { AlbumGrid } from "@/components/ui/album-grid";
import { AlbumArt } from "@/components/ui/album-art";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import { SimpleReviewPopup } from "@/components/ui/simple-review-popup";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { openInMusicService } from "@/lib/spotify";
import { NoSkipsReviewWithAlbum } from "@/hooks/use-no-skips-reviews";

interface SharedNoSkipsData {
  username: string;
  noSkipsAlbums: {
    id: number;
    userId: number;
    albumId: number;
    addedAt: string;
    isTopFour: boolean;
    topFourPosition?: number;
    album: {
      id: number;
      spotifyId?: string | null;
      appleMusicId?: string | null;
      name: string;
      artist: string;
      imageUrl: string;
      releaseYear: number | null;
      genre: string | null;
    };
  }[];
  topFourAlbums: {
    id: number;
    userId: number;
    albumId: number;
    addedAt: string;
    isTopFour: boolean;
    topFourPosition?: number;
    album: {
      id: number;
      spotifyId?: string | null;
      appleMusicId?: string | null;
      name: string;
      artist: string;
      imageUrl: string;
      releaseYear: number | null;
      genre: string | null;
    };
  }[];
  noSkipsReviews: {
    id: number;
    userId: number;
    albumId: number;
    review: string;
    reviewedAt: string;
    album: {
      id: number;
      spotifyId?: string | null;
      appleMusicId?: string | null;
      name: string;
      artist: string;
      imageUrl: string;
      releaseYear: number | null;
      genre: string | null;
    };
  }[];
}

export default function SharedNoSkipsPage() {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const [gridScale, setGridScale] = useState(4);
  const [activeReview, setActiveReview] = useState<NoSkipsReviewWithAlbum | null>(null);
  
  // Fetch the shared collection data
  const { data, isLoading, error } = useQuery<SharedNoSkipsData>({
    queryKey: [`/api/shared/no-skips/${userId}`],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Handle opening album in music service
  const handleOpenAlbumInMusicService = (album: { spotifyId?: string | null; appleMusicId?: string | null }) => {
    openInMusicService(album);
  };

  // Handle opening album review
  const handleOpenReview = (albumId: number) => {
    if (!data?.noSkipsReviews) return;
    
    // Find existing review for this album
    const existingReview = data.noSkipsReviews.find(r => r.albumId === albumId);
    
    if (existingReview) {
      setActiveReview(existingReview as NoSkipsReviewWithAlbum);
    }
  };

  // Handle closing review popup
  const handleCloseReview = () => {
    setActiveReview(null);
  };

  // Check if an album has a review
  const hasReview = (albumId: number): boolean => {
    return data?.noSkipsReviews?.some(review => review.albumId === albumId) || false;
  };
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load the shared collection. It may no longer be available.",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Sort albums by date added (newest first)
  const sortedNoSkipsAlbums = data?.noSkipsAlbums
    ? [...data.noSkipsAlbums].sort((a, b) => {
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      })
    : [];
  
  return (
    <Layout title={data ? `${data.username}'s No Skips Collection` : "Shared Collection"}>
      <div className="p-4 pt-0">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Link href="/no-skips">
              <a className="inline-flex items-center gap-1 text-xs hover:underline">
                <ArrowLeft className="h-3 w-3" />
                Back to your collection
              </a>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-2">
              <GridScaleSlider 
                value={gridScale} 
                onChange={setGridScale}
                min={1}
                max={12}
              />
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading shared collection...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-gray-600">Sorry, this collection is not available or has been removed.</p>
          </div>
        ) : (
          <>
            {/* Compact top 4 widget at top of page */}
            {data && data.topFourAlbums.length > 0 && (
              <div className="flex justify-center mb-4">
                <div className={`bg-white border border-black`}>
                  <div className="flex items-center justify-center gap-3 px-4 py-3">
                    <span className="font-mono text-sm text-black/70 whitespace-nowrap">top 4</span>
                    <div className="flex gap-2">
                      {data.topFourAlbums
                        .sort((a, b) => (a.topFourPosition || 999) - (b.topFourPosition || 999))
                        .slice(0, 4)
                        .map((album) => (
                          <button
                            key={album.id}
                            onClick={() => handleOpenReview(album.album.id)}
                            className="hover:opacity-80 transition-opacity"
                            title={`${album.album.name} by ${album.album.artist}`}
                          >
                            <AlbumArt
                              src={album.album.imageUrl}
                              alt={album.album.name}
                              size="small"
                              className="w-10 h-10 rounded"
                            />
                          </button>
                        ))}
                      {/* Fill empty slots */}
                      {Array.from({ length: 4 - Math.min(data.topFourAlbums.length, 4) }).map((_, index) => (
                        <div 
                          key={`empty-${index}`} 
                          className="w-10 h-10 bg-gray-100 rounded border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* All No Skips Albums */}
            <h2 className="text-sm font-medium mb-2 text-black">albums</h2>
            <AlbumGrid columns={gridScale}>
              {sortedNoSkipsAlbums.map((album) => (
                <div key={album.id} className="mb-2">
                  {/* Album art container with review indicator */}
                  <div className="relative group">
                    <div 
                      onClick={() => handleOpenReview(album.album.id)}
                      className="block cursor-pointer"
                    >
                      <AlbumArt
                        src={album.album.imageUrl}
                        alt={album.album.name}
                      />
                    </div>

                    {/* Review indicator */}
                    {hasReview(album.album.id) && (
                      <div className="absolute top-2 left-2 bg-black w-5 h-5 flex items-center justify-center">
                        <NotebookPen className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Music service button in top right corner */}
                    <button 
                      className="absolute top-2 right-2 bg-black bg-opacity-75 w-6 h-6 flex items-center justify-center text-white hover:bg-opacity-90 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleOpenAlbumInMusicService(album.album);
                      }}
                      title="Open in music service"
                    >
                      ♪
                    </button>
                  </div>
                  
                  {/* Album details */}
                  {gridScale < 5 && (
                    <>
                      <div className="mt-1 text-xs truncate">{album.album.name}</div>
                      <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
                      {album.album.genre && (
                        <div className="mt-1 text-xs text-gray-400 truncate">{album.album.genre}</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </AlbumGrid>
          </>
        )}

        {/* Read-only Review Popup */}
        <SimpleReviewPopup
          review={activeReview}
          isOpen={!!activeReview}
          onClose={handleCloseReview}
          onSave={() => {}} // No-op for read-only
          readOnly={true} // Add read-only prop
        />
      </div>
    </Layout>
  );
}