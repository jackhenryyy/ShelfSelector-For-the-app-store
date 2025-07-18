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
  isEditingTopFour?: boolean;
  isSelectedForTopFour?: boolean;
  onSelectForTopFour?: () => void;
}

export function SortableAlbumCard({ 
  id, 
  album, 
  gridScale, 
  onRemove, 
  onReview, 
  hasReview = false,
  isDragMode = false,
  isEditingTopFour = false,
  isSelectedForTopFour = false,
  onSelectForTopFour
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
      className="mb-2"
      {...(isDragMode ? { ...attributes, ...listeners } : {})}
    >
      {/* Album art container with overlay */}
      <div className="relative group">
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isEditingTopFour) {
              onSelectForTopFour?.();
            } else {
              onReview?.();
            }
          }}
          className={`block cursor-pointer ${isDragMode ? 'cursor-grab' : ''}`}
        >
          <AlbumArt
            src={album.imageUrl}
            alt={album.name}
            className={isEditingTopFour && isSelectedForTopFour 
              ? "border-2 border-green-500" 
              : ""}
          />
        </div>

        {/* Review indicator */}
        {hasReview && (
          <div className="absolute top-2 left-2 bg-black w-5 h-5 flex items-center justify-center">
            <NotebookPen className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* Remove button in top right corner - square overlay */}
        {onRemove && !isDragMode && !isEditingTopFour && (
          <button 
            className="absolute top-2 right-2 bg-black bg-opacity-75 w-6 h-6 flex items-center justify-center text-white hover:bg-opacity-90 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove();
            }}
            title="Remove from No Skips"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Album details outside the overlay area */}
      {gridScale < 5 && !isDragging && (
        <>
          <div className="mt-1 text-xs truncate">{album.name}</div>
          <div className="text-xs text-gray-500 truncate">{album.artist}</div>
        </>
      )}
      
      {/* Genre display (non-editable) */}
      {gridScale < 5 && !isDragging && (
        <div className="mt-1 text-xs text-gray-500">
          {album.genre || "no genre"}
        </div>
      )}
    </div>
  );
}