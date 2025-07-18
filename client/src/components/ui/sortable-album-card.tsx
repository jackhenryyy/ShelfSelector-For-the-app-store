import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlbumArt } from './album-art';
import { Album } from '@shared/schema';
import { openInSpotify } from '@/lib/spotify';
import { Button } from './button';
import { NotebookPen } from 'lucide-react';

interface SortableAlbumCardProps {
  id: string;
  album: Album;
  gridScale: number;
  onRemove?: () => void;
  onReview?: () => void;
  hasReview?: boolean;
  isDragMode?: boolean;
}

export function SortableAlbumCard({ 
  id, 
  album, 
  gridScale, 
  onRemove, 
  onReview, 
  hasReview = false,
  isDragMode = false
}: SortableAlbumCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sizeClasses = {
    1: "w-20 h-20",
    2: "w-24 h-24", 
    3: "w-28 h-28",
    4: "w-32 h-32",
    5: "w-36 h-36",
    6: "w-40 h-40",
    7: "w-44 h-44",
    8: "w-48 h-48",
    9: "w-52 h-52",
    10: "w-56 h-56",
    11: "w-60 h-60",
    12: "w-64 h-64"
  };

  const textSizeClasses = {
    1: "text-[8px]",
    2: "text-[9px]", 
    3: "text-[10px]",
    4: "text-xs",
    5: "text-xs",
    6: "text-sm",
    7: "text-sm",
    8: "text-base",
    9: "text-base",
    10: "text-lg",
    11: "text-lg",
    12: "text-xl"
  };

  const buttonSizeClasses = {
    1: "w-3 h-3 text-[6px]",
    2: "w-3 h-3 text-[7px]", 
    3: "w-4 h-4 text-[8px]",
    4: "w-4 h-4 text-[9px]",
    5: "w-5 h-5 text-[10px]",
    6: "w-5 h-5 text-xs",
    7: "w-6 h-6 text-xs",
    8: "w-6 h-6 text-sm",
    9: "w-7 h-7 text-sm",
    10: "w-7 h-7 text-base",
    11: "w-8 h-8 text-base",
    12: "w-8 h-8 text-lg"
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${sizeClasses[gridScale as keyof typeof sizeClasses]} ${isDragMode ? 'cursor-grab' : ''}`}
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
    >
      <div className="relative w-full h-full">
        <AlbumArt 
          src={album.imageUrl} 
          alt={`${album.name} by ${album.artist}`}
          className="w-full h-full object-cover"
        />
        
        {/* Spotify overlay */}
        <div 
          className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
          onClick={() => openInSpotify(album.spotifyId, 'album')}
        >
          <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.84-.6 0-.36.24-.66.54-.781 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.242 1.022zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        </div>

        {/* Remove button */}
        {onRemove && !isDragMode && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            variant="outline"
            size="sm"
            className={`absolute -top-1 -right-1 bg-black text-white border-black hover:bg-gray-800 ${buttonSizeClasses[gridScale as keyof typeof buttonSizeClasses]} p-0 flex items-center justify-center`}
          >
            ×
          </Button>
        )}

        {/* Review indicator */}
        {hasReview && (
          <div 
            className="absolute top-1 left-1 bg-black text-white p-1 cursor-pointer hover:bg-gray-800 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onReview?.();
            }}
          >
            <NotebookPen className={`${gridScale <= 4 ? 'w-2 h-2' : gridScale <= 8 ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </div>
        )}
      </div>
      
      {/* Album title and artist - only show if not dragging */}
      {!isDragging && (
        <div className={`mt-1 ${textSizeClasses[gridScale as keyof typeof textSizeClasses]} leading-tight`}>
          <div className="font-semibold truncate" title={album.name}>
            {album.name}
          </div>
          <div className="text-gray-600 truncate" title={album.artist}>
            {album.artist}
          </div>
        </div>
      )}
    </div>
  );
}