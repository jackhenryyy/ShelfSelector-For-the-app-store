import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchIcon } from "lucide-react";
import { AlbumArt } from "@/components/ui/album-art";
import { SpotifyAlbum } from "@/hooks/use-spotify";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  searchResults: SpotifyAlbum[];
  isSearching: boolean;
  onAddAlbum: (albumId: number) => void;
  dialogTitle?: string;
  addButtonText?: string;
  mobile?: boolean;
}

export function SearchDialog({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchResults,
  isSearching,
  onAddAlbum,
  dialogTitle = "Add an album",
  addButtonText = "Add",
  mobile = false
}: SearchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md w-[calc(100%-2rem)]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-mono">{dialogTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center gap-2 mt-4">
          <input
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(e)}
            className="w-full p-2 border border-black font-mono text-sm"
            autoFocus
          />
          <button 
            className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
            onClick={onSearch}
            disabled={isSearching}
          >
            <SearchIcon className="h-4 w-4 mr-1" />
            {isSearching ? "..." : "Search"}
          </button>
        </div>
        
        {searchResults && searchResults.length > 0 && (
          <div className="mt-4 max-h-80 overflow-y-auto">
            <div className={mobile ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-3"}>
              {searchResults.map((album) => (
                <div key={album.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <AlbumArt
                      src={album.imageUrl}
                      alt={album.name}
                      size="small"
                    />
                    <div>
                      <div className="font-mono text-sm">{album.name}</div>
                      <div className="font-mono text-xs text-gray-500">{album.artist}</div>
                    </div>
                  </div>
                  <button 
                    className="px-3 py-1 border border-black bg-white text-black font-mono text-xs"
                    onClick={() => onAddAlbum(album.id)}
                  >
                    {addButtonText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}