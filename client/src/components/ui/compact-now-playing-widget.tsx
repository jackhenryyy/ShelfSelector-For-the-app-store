import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlbumArt } from "@/components/ui/album-art";
import { useQueueAlbums, useAlbumReviews } from "@/hooks/use-albums";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { processAndSaveAlbum } from "@/lib/spotify";
import { AlbumDetailsDialog } from "@/components/ui/album-details-dialog";
import { useAlbumGenre } from "@/hooks/use-album-genre";

interface NowPlayingData {
  isPlaying: boolean;
  track: {
    name: string;
    artists: string[];
    album: {
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

interface CompactNowPlayingWidgetProps {
  className?: string;
}

export function CompactNowPlayingWidget({ className = "" }: CompactNowPlayingWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { addToQueue, isAddingToQueue: hookIsAddingToQueue } = useQueueAlbums();
  console.log('CompactNowPlayingWidget - addToQueue function:', addToQueue);
  const { createReview } = useAlbumReviews();
  const { updateGenre } = useAlbumGenre();
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);

  // Query for currently playing track
  const { data: nowPlaying, refetch } = useQuery<NowPlayingData>({
    queryKey: ["/api/spotify/currently-playing"],
    enabled: !!user,
    refetchInterval: 1000, // Refresh every 1 second for real-time updates
    retry: false,
  });

  // Auto-refetch every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        refetch();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [refetch, user]);

  const handleAddToQueue = async () => {
    console.log('handleAddToQueue clicked', { nowPlaying, isAddingToQueue });
    if (!nowPlaying || isAddingToQueue) return;
    
    setIsAddingToQueue(true);
    try {
      console.log('Processing album:', nowPlaying.track.album);
      const albumData = await processAndSaveAlbum({
        id: nowPlaying.track.album.spotifyId,
        name: nowPlaying.track.album.name,
        artists: [{ name: nowPlaying.track.album.artist }],
        images: [{ url: nowPlaying.track.album.imageUrl }],
        release_date: nowPlaying.track.album.releaseYear?.toString()
      });

      console.log('Album processed, adding to queue:', albumData.id);
      await addToQueue(albumData.id);
      console.log('Successfully added to queue');
      
      toast({
        title: "Added to queue",
        description: "Album has been added to your queue",
      });
      
      setLocation("/queue");
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
      const albumData = await processAndSaveAlbum({
        id: nowPlaying.track.album.spotifyId,
        name: nowPlaying.track.album.name,
        artists: [{ name: nowPlaying.track.album.artist }],
        images: [{ url: nowPlaying.track.album.imageUrl }],
        release_date: nowPlaying.track.album.releaseYear?.toString()
      });

      setSelectedAlbum(albumData);
      setDetailsDialogOpen(true);
      
    } catch (error) {
      console.error('Error processing album:', error);
      toast({
        title: "Error",
        description: "Failed to process album",
        variant: "destructive",
      });
    } finally {
      setIsAddingToList(false);
    }
  };

  const handleSaveReview = async (data: {
    albumId: number;
    rating: number;
    review?: string;
    listenedAt?: Date;
    genre?: string;
  }) => {
    try {
      await createReview({
        albumId: data.albumId,
        rating: data.rating,
        review: data.review || "",
        listenedAt: data.listenedAt
      });
      
      toast({
        title: "Review submitted",
        description: "Album has been added to your list",
      });
      
      setSelectedAlbum(null);
      setDetailsDialogOpen(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Review failed",
        description: "There was an error submitting your review",
        variant: "destructive"
      });
    }
  };

  const handleUpdateGenre = async (albumId: number, genre: string) => {
    try {
      await updateGenre(albumId, genre);
      toast({
        title: "Genre updated",
        description: "Album genre has been updated",
      });
    } catch (error) {
      console.error("Error updating genre:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the genre",
        variant: "destructive"
      });
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!user || !nowPlaying) {
    return null;
  }

  const progressPercent = (nowPlaying.progressMs / nowPlaying.durationMs) * 100;

  return (
    <>
      <div className={`bg-white border border-black px-0 py-2 ${className}`}>
        <div className="flex items-center justify-between mb-1 px-2">
          <h3 className="font-mono text-xs font-medium">
            {nowPlaying.isPlaying ? "Now Playing" : "Paused"}
          </h3>
          <div className="font-mono text-xs text-gray-500">
            {formatTime(nowPlaying.progressMs)} / {formatTime(nowPlaying.durationMs)}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="bg-gray-200 h-0.5 mb-2 mx-2">
          <div 
            className="bg-black h-0.5 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="flex items-center gap-2 px-2">
          <AlbumArt
            src={nowPlaying.track.album.imageUrl}
            alt={nowPlaying.track.album.name}
            size="small"
            className="flex-shrink-0 w-8 h-8"
          />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-mono text-xs font-medium truncate">
              {nowPlaying.track.name}
            </h4>
            <p className="font-mono text-xs text-gray-500 truncate">
              {nowPlaying.track.album.name}
            </p>
          </div>
          
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                console.log('Queue button clicked!', e);
                handleAddToQueue();
              }}
              disabled={isAddingToQueue}
              className="px-1.5 py-0.5 border border-black bg-white text-black font-mono text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              {isAddingToQueue ? "..." : "Queue"}
            </button>
            <button
              onClick={handleAddToList}
              disabled={isAddingToList}
              className="px-1.5 py-0.5 border border-black bg-white text-black font-mono text-xs hover:bg-gray-50 disabled:opacity-50"
            >
              {isAddingToList ? "..." : "List"}
            </button>
          </div>
        </div>
      </div>

      {/* Album Details Dialog */}
      {selectedAlbum && (
        <AlbumDetailsDialog
          isOpen={detailsDialogOpen}
          onClose={() => setDetailsDialogOpen(false)}
          album={selectedAlbum}
          onSave={handleSaveReview}
          onUpdateGenre={handleUpdateGenre}
        />
      )}
    </>
  );
}