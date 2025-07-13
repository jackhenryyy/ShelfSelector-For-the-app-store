import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlbumArt } from "@/components/ui/album-art";
import { useQueueAlbums, useAlbumReviews, AlbumReview } from "@/hooks/use-albums";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { processAndSaveAlbum } from "@/lib/spotify";
import { ReviewPopup } from "@/components/ui/review-popup";
import { useAlbumGenre } from "@/hooks/use-album-genre";

interface CurrentlyPlayingData {
  isPlaying: boolean;
  track: {
    id: string;
    name: string;
    artists: string[];
    album: {
      id: string;
      name: string;
      artist: string;
      imageUrl: string;
      spotifyId: string;
      releaseYear?: number;
    };
  };
  progressMs: number;
  durationMs: number;
}

export function NowPlayingWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToQueue } = useQueueAlbums();
  const { createReview, updateReview, deleteReview } = useAlbumReviews();
  const { updateGenre } = useAlbumGenre();
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [reviewPopupOpen, setReviewPopupOpen] = useState(false);
  const [currentReview, setCurrentReview] = useState<AlbumReview | null>(null);

  // Query for currently playing track
  const { data: nowPlaying, isError } = useQuery<CurrentlyPlayingData | null>({
    queryKey: ['/api/spotify/currently-playing'],
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: (failureCount, error: any) => {
      // Don't retry if unauthorized (no Spotify token)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Show Spotify login button if user doesn't have Spotify connected
  if (isError || !user?.accessToken) {
    return (
      <div className="bg-white border border-black p-3 mx-4 mb-4 text-center">
        <p className="font-mono text-xs text-gray-500 mb-3">Connect Spotify to see what you're playing</p>
        <button 
          onClick={() => window.open('/api/auth/spotify', '_blank')}
          className="px-4 py-2 border border-black bg-green-500 text-white font-mono text-sm hover:bg-green-600 transition-colors"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  // Don't show widget if nothing is playing
  if (!nowPlaying) {
    return (
      <div className="bg-white border border-black p-3 mx-4 mb-4 text-center">
        <p className="font-mono text-xs text-gray-500">Nothing playing on Spotify</p>
      </div>
    );
  }

  const handleAddToQueue = async () => {
    if (!nowPlaying || isAddingToQueue) return;
    
    setIsAddingToQueue(true);
    try {
      // First, save the album to our database
      const albumData = await processAndSaveAlbum({
        id: nowPlaying.track.album.spotifyId,
        name: nowPlaying.track.album.name,
        artists: [{ name: nowPlaying.track.album.artist }],
        images: [{ url: nowPlaying.track.album.imageUrl }],
        release_date: nowPlaying.track.album.releaseYear?.toString()
      });

      // Then add to queue
      await addToQueue({ albumId: albumData.id });
      
      toast({
        title: "Added to Queue",
        description: `"${nowPlaying.track.album.name}" has been added to your queue`,
      });
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast({
        title: "Error",
        description: "Failed to add album to queue",
        variant: "destructive",
      });
    } finally {
      setIsAddingToQueue(false);
    }
  };

  const handleAddToList = async () => {
    if (!nowPlaying || isAddingToList) return;
    
    setIsAddingToList(true);
    try {
      // First, save the album to our database
      const albumData = await processAndSaveAlbum({
        id: nowPlaying.track.album.spotifyId,
        name: nowPlaying.track.album.name,
        artists: [{ name: nowPlaying.track.album.artist }],
        images: [{ url: nowPlaying.track.album.imageUrl }],
        release_date: nowPlaying.track.album.releaseYear?.toString()
      });

      // Create a new review entry with default values
      const newReview = await createReview({
        albumId: albumData.id,
        rating: 2.5, // Default rating that user can edit
        review: '',
        listenedAt: new Date()
      });

      // Create a full AlbumReview object for the popup
      const reviewForPopup: AlbumReview = {
        id: newReview.id,
        userId: newReview.userId,
        albumId: newReview.albumId,
        rating: newReview.rating,
        review: newReview.review || '',
        reviewedAt: newReview.reviewedAt,
        listenedAt: newReview.listenedAt || null,
        album: {
          id: albumData.id,
          spotifyId: albumData.spotifyId,
          name: albumData.name,
          artist: albumData.artist,
          imageUrl: albumData.imageUrl,
          releaseYear: albumData.releaseYear,
          genre: albumData.genre,
          energyLevel: albumData.energyLevel
        }
      };

      // Set the current review and open the popup
      setCurrentReview(reviewForPopup);
      setReviewPopupOpen(true);
      
    } catch (error) {
      console.error('Error adding to list:', error);
      toast({
        title: "Error",
        description: "Failed to add album to list",
        variant: "destructive",
      });
    } finally {
      setIsAddingToList(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleReviewSave = async (data: {
    id: number;
    rating: number;
    review: string;
    listenedAt?: Date;
    genre?: string;
  }) => {
    try {
      await updateReview({
        id: data.id,
        rating: data.rating,
        review: data.review,
        listenedAt: data.listenedAt
      });

      if (data.genre && currentReview?.album) {
        await updateGenre(currentReview.album.id, data.genre);
      }

      toast({
        title: "Review Updated",
        description: "Your review has been saved",
      });
      
      setReviewPopupOpen(false);
      setCurrentReview(null);
    } catch (error) {
      console.error('Error saving review:', error);
      toast({
        title: "Error",
        description: "Failed to save review",
        variant: "destructive",
      });
    }
  };

  const handleReviewDelete = async (id: number) => {
    try {
      await deleteReview(id);
      toast({
        title: "Review Deleted",
        description: "Your review has been deleted",
      });
      setReviewPopupOpen(false);
      setCurrentReview(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  const progressPercent = (nowPlaying.progressMs / nowPlaying.durationMs) * 100;

  return (
    <>
      <div className="bg-white border border-black p-3 mx-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-sm font-medium">
          {nowPlaying.isPlaying ? "Now Playing" : "Paused"}
        </h3>
        <div className="font-mono text-xs text-gray-500">
          {formatTime(nowPlaying.progressMs)} / {formatTime(nowPlaying.durationMs)}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-1 mb-3">
        <div 
          className="bg-black h-1 transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      <div className="flex items-center gap-3">
        <AlbumArt
          src={nowPlaying.track.album.imageUrl}
          alt={nowPlaying.track.album.name}
          size="small"
          className="flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-mono text-sm font-medium truncate">
            {nowPlaying.track.name}
          </h4>
          <p className="font-mono text-xs text-gray-500 truncate">
            {nowPlaying.track.artists.join(', ')}
          </p>
          <p className="font-mono text-xs text-gray-500 truncate">
            {nowPlaying.track.album.name}
          </p>
        </div>
        
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={handleAddToQueue}
            disabled={isAddingToQueue}
            className="px-2 py-1 border border-black bg-white text-black font-mono text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            {isAddingToQueue ? "..." : "Add to Queue"}
          </button>
          <button
            onClick={handleAddToList}
            disabled={isAddingToList}
            className="px-2 py-1 border border-black bg-white text-black font-mono text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            {isAddingToList ? "..." : "Add to List"}
          </button>
        </div>
      </div>
      </div>

      {/* Review Popup */}
      <ReviewPopup
        review={currentReview}
        isOpen={reviewPopupOpen}
        onClose={() => {
          setReviewPopupOpen(false);
          setCurrentReview(null);
        }}
        onSave={handleReviewSave}
        onDelete={handleReviewDelete}
        onGenreUpdate={updateGenre}
      />
    </>
  );
}