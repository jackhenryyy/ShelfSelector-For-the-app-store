import { useState, useRef, useEffect } from "react";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface EditableGenreProps {
  albumId: number;
  genre: string | null;
  className?: string;
}

export function EditableGenre({ albumId, genre, className = "" }: EditableGenreProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newGenre, setNewGenre] = useState(genre || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateGenre, isUpdating } = useAlbumGenre();
  
  // Update newGenre when genre prop changes
  useEffect(() => {
    setNewGenre(genre || "");
  }, [genre]);
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  
  const handleStartEdit = () => {
    console.log('handleStartEdit called for album:', albumId, 'current genre:', genre);
    setNewGenre(genre || "");
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  const handleSaveEdit = () => {
    console.log('handleSaveEdit called with albumId:', albumId, 'newGenre:', newGenre);
    updateGenre(albumId, newGenre || null);
    setIsEditing(false);
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };
  
  if (isEditing) {
    return (
      <div 
        className={`flex items-center space-x-1 relative z-20 ${className}`} 
        onClick={(e) => e.stopPropagation()} // Stop propagation at container level
      >
        <input
          ref={inputRef}
          type="text"
          value={newGenre}
          onChange={(e) => setNewGenre(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onClick={(e) => e.stopPropagation()} // Also stop at input level
          className="px-1 py-0 text-xs border border-black font-mono w-24 focus:outline-none"
          placeholder="enter genre..."
          disabled={isUpdating}
        />
        <div className="flex space-x-1">
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveEdit();
                }} 
                className="text-green-600 hover:text-green-800"
                disabled={isUpdating}
              >
                <Check className="h-3 w-3" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }} 
                className="text-red-600 hover:text-red-800"
                disabled={isUpdating}
              >
                <X className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`group cursor-pointer mt-1 relative z-20 ${className}`}
      onClick={(e) => {
        e.stopPropagation(); // Stop event from reaching parent elements
        e.preventDefault();
        handleStartEdit();
      }}
    >
      <div className="text-xs text-gray-500 hover:text-black transition-colors">
        {genre || "no genre"}
      </div>
    </div>
  );
}