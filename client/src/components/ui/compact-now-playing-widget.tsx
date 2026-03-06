import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlbumArt } from "@/components/ui/album-art";
import { useQueueAlbums, useAlbumReviews } from "@/hooks/use-albums";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { processAndSaveAlbum } from "@/lib/spotify";
import { AlbumDetailsDialog } from "@/components/ui/album-details-dialog";
import { DuplicateAlbumDialog } from "@/components/ui/duplicate-album-dialog";
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

function spotifyAuthUrl(userId?: number) {
  return `/api/spotify/auth${userId ? `?uid=${userId}` : ""}`;
}

export function CompactNowPlayingWidget({ className = "" }: CompactNowPlayingWidgetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { addToQueue, isAlbumInQueue } = useQueueAlbums();
  const { createReview } = useAlbumReviews();
  const { updateGenre } = useAlbumGenre();

  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingDuplicateAlbum, setPendingDuplicateAlbum] = useState<{ id: number; name: string } | null>(null);

  // Query for currently playing track
  const { data: nowPlaying, refetch, isError } = useQuery<NowPlayingData>({
    queryKey: ["/api/spotify/currently-playing"],
    enabled: !!user,
    refetchInterval: 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false; // no token / unauthorized
      return failureCount < 3;
    },
  });

  // Auto-refetch every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) refetch();
    }, 1000);

    return () => clearInterval(interval);
  }, [refetch, user]);

  const handleAddToQueue = async () => {
    if (!nowPlaying || isAddingToQueue) return;

    setIsAddingToQueue(true);
    try {
      const albumData = await processAndSaveAlbum({
        id: nowPlaying.track.album.spotifyId,
        name: nowPlaying.track.album.name,
        artists: [{ name: nowPlaying.track.album.artist }],
        images: [{ url: nowPlaying.track.album.imageUrl }],
        release_date: nowPlaying.track.album.releaseYear?.toString(),
      });

      if (isAlbumInQueue(albumData.id)) {
        setPendingDuplicateAlbum({ id: albumData.id, name: albumData.name });
        setDuplicateDialogOpen(true);
        setIsAddingToQueue(false);
        return;
      }

      await addToQueue(albumData.id);

      toast({
        title: "Added to queue",
        description: "Album has been added to your queue",
      });

      setLocation("/queue");
    } catch (error) {
      console.error("Error adding to queue:", error);
      toast({
        title: "Error",
        description: "Failed to add album to queue",
        variant: "destructive",
      });
    } finally {
      setIsAddingToQueue(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingDuplicateAlbum) return;

    await addToQueue(pendingDuplicateAlbum.id);
    toast({
      title: "Added to queue",
      description: "Album has been added to your queue",
    });

    setPendingDuplicateAlbum(null);
    setLocation("/queue");
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
        release_date: nowPlaying.track.album.releaseYear?.toString(),
      });

      setSelectedAlbum(albumData);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error("Error processing album:", error);
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
        listenedAt: data.listenedAt,
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
        variant: "destructive",
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
        variant: "destructive",
      });
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Don't show anything if user is not logged in
  if (!user) return null;

  // Centering strategy:
  // - outer wrapper is full width and centers contents
  // - inner wrapper is fixed width matching your album plaque
  const outerWidthClass = "w-full flex justify-center";
  const innerWidthClass = "w-[22rem] sm:w-[26rem]";

  // Show Spotify login button if user doesn't have Spotify connected
  if (isError || !user?.accessToken) {
    return (
      <div className={`${outerWidthClass} ${className}`}>
        <div className={`${innerWidthClass} bg-white border border-black px-3 py-2 text-center`}>
          <p className="font-mono text-xs text-gray-500 mb-2">Connect Spotify</p>
          <button
            onClick={() => {
              // Popup first (best UX), fallback to full redirect
              const popup = window.open(
                spotifyAuthUrl(user?.id),
                "spotify-auth",
                "width=500,height=600,left=" +
                  (window.screen.width / 2 - 250) +
                  ",top=" +
                  (window.screen.height / 2 - 300)
              );

              if (!popup) {
                window.location.href = spotifyAuthUrl(user?.id);
                return;
              }

              const messageHandler = (event: MessageEvent) => {
                if (event.data?.type === "SPOTIFY_AUTH_SUCCESS") {
                  window.removeEventListener("message", messageHandler);
                  clearInterval(checkClosed);
                  clearTimeout(timeout);
                  setTimeout(() => window.location.reload(), 500);
                }
              };

              window.addEventListener("message", messageHandler);

              const checkClosed = setInterval(() => {
                if (popup.closed) {
                  clearInterval(checkClosed);
                  window.removeEventListener("message", messageHandler);
                  setTimeout(() => window.location.reload(), 1000);
                }
              }, 1000);

              const timeout = setTimeout(() => {
                if (!popup.closed) popup.close();
                clearInterval(checkClosed);
                window.removeEventListener("message", messageHandler);
              }, 5 * 60 * 1000);
            }}
            className="px-3 py-1.5 border border-black bg-black text-white font-mono text-xs hover:bg-gray-800"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  // Don't show anything if no currently playing data
  if (!nowPlaying) return null;

  const progressPercent = (nowPlaying.progressMs / nowPlaying.durationMs) * 100;

  return (
    <>
      <div className={`${outerWidthClass} ${className}`}>
        <div className={`${innerWidthClass} bg-white border border-black px-0 py-2`}>
          <div className="flex items-center justify-between mb-1 px-2">
            <h3 className="font-mono text-xs font-medium">{nowPlaying.isPlaying ? "Now Playing" : "Paused"}</h3>
            <div className="font-mono text-xs text-gray-500">
              {formatTime(nowPlaying.progressMs)} / {formatTime(nowPlaying.durationMs)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-gray-200 h-0.5 mb-2 mx-2">
            <div className="bg-black h-0.5 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="flex items-center gap-2 px-2">
            <AlbumArt
              src={nowPlaying.track.album.imageUrl}
              alt={nowPlaying.track.album.name}
              size="small"
              className="flex-shrink-0 w-8 h-8"
            />

            <div className="flex-1 min-w-0">
              <h4 className="font-mono text-xs font-medium truncate">{nowPlaying.track.name}</h4>
              <p className="font-mono text-xs text-gray-500 truncate">{nowPlaying.track.album.name}</p>
            </div>

            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={handleAddToQueue}
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

      {/* Duplicate Album Dialog */}
      <DuplicateAlbumDialog
        isOpen={duplicateDialogOpen}
        onClose={() => {
          setDuplicateDialogOpen(false);
          setPendingDuplicateAlbum(null);
        }}
        onConfirm={handleConfirmDuplicate}
        albumName={pendingDuplicateAlbum?.name || ""}
        sectionName="Queue"
      />
    </>
  );
}
