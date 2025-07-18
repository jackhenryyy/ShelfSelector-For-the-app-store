import { AlbumArt } from "@/components/ui/album-art";
import { useNoSkipsAlbums } from "@/hooks/use-albums";

interface CompactTopFourWidgetProps {
  className?: string;
  onAlbumClick?: (albumId: number) => void;
}

export function CompactTopFourWidget({ className = "", onAlbumClick }: CompactTopFourWidgetProps) {
  const { topFourAlbums } = useNoSkipsAlbums();

  if (!topFourAlbums || topFourAlbums.length === 0) {
    return null;
  }

  const sortedTopFour = topFourAlbums
    .sort((a, b) => (a.topFourPosition || 0) - (b.topFourPosition || 0))
    .slice(0, 4);

  return (
    <div className={`bg-white border border-black ${className}`}>
      <div className="flex items-center justify-center gap-3 px-3 py-2">
        <span className="font-mono text-xs text-black/70 whitespace-nowrap">top 4</span>
        <div className="flex gap-2">
          {sortedTopFour.map((album) => (
            <button
              key={album.id}
              onClick={() => onAlbumClick?.(album.album.id)}
              className="hover:opacity-80 transition-opacity"
              title={`${album.album.name} by ${album.album.artist}`}
            >
              <AlbumArt
                src={album.album.imageUrl}
                alt={album.album.name}
                size="smaller"
                className="w-8 h-8 rounded"
              />
            </button>
          ))}
          {/* Fill empty slots */}
          {Array.from({ length: 4 - sortedTopFour.length }).map((_, index) => (
            <div 
              key={`empty-${index}`} 
              className="w-8 h-8 bg-gray-100 rounded border border-gray-200"
            />
          ))}
        </div>
      </div>
    </div>
  );
}