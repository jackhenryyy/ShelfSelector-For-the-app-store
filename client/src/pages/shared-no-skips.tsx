import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/ui/layout";
import { AlbumGrid } from "@/components/ui/album-grid";
import { AlbumArt } from "@/components/ui/album-art";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import { ArrowLeft } from "lucide-react";
import { openInSpotify } from "@/lib/spotify";

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
      spotifyId: string;
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
      spotifyId: string;
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
  
  // Fetch the shared collection data
  const { data, isLoading, error } = useQuery<SharedNoSkipsData>({
    queryKey: [`/api/shared/no-skips/${userId}`],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Handle opening album in Spotify
  const handleOpenAlbumInSpotify = (spotifyId: string) => {
    openInSpotify(spotifyId);
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
                            onClick={() => handleOpenAlbumInSpotify(album.album.spotifyId)}
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
                    {gridScale < 5 && (
                      <>
                        <div className="mt-1 text-xs truncate">{album.album.name}</div>
                        <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
                        {album.album.genre && (
                          <div className="mt-1 text-xs text-gray-400 truncate">{album.album.genre}</div>
                        )}
                      </>
                    )}
                  </a>
                </div>
              ))}
            </AlbumGrid>
          </>
        )}
      </div>
    </Layout>
  );
}