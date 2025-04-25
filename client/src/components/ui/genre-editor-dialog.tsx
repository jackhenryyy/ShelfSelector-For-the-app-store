import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { useToast } from "@/hooks/use-toast";

interface GenreEditorDialogProps {
  albumId: number;
  currentGenre: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumName?: string;
  artistName?: string;
}

export function GenreEditorDialog({
  albumId,
  currentGenre,
  open,
  onOpenChange,
  albumName,
  artistName
}: GenreEditorDialogProps) {
  const { updateGenre } = useAlbumGenre();
  const { toast } = useToast();
  const [genre, setGenre] = useState(currentGenre || "");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus the input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);
  
  // Reset genre state when dialog opens with a new album
  useEffect(() => {
    setGenre(currentGenre || "");
  }, [currentGenre, albumId]);
  
  const handleSave = () => {
    updateGenre(albumId, genre || null);
    toast({
      title: "Genre updated",
      description: `Genre has been updated to "${genre || 'None'}"`,
    });
    onOpenChange(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)]">
        <DialogTitle className="font-mono">
          {albumName ? (
            <>
              Edit genre for <span className="font-bold">{albumName}</span>
              {artistName ? <span> by {artistName}</span> : null}
            </>
          ) : (
            "Edit genre"
          )}
        </DialogTitle>
        
        <div className="mt-4">
          <label htmlFor="genre-input" className="block mb-2 font-mono text-sm">
            Enter genre for this album:
          </label>
          <input
            ref={inputRef}
            id="genre-input"
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 border border-black font-mono text-sm"
            placeholder="e.g. Rock, Jazz, Hip Hop..."
          />
        </div>
        
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border border-black bg-white font-mono text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 border border-black bg-black text-white font-mono text-sm"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}