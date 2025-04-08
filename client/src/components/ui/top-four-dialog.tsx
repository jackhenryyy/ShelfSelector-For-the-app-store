import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NoSkipsAlbum } from "@/hooks/use-albums";
import { AlbumArt } from "@/components/ui/album-art";
import { Separator } from "@/components/ui/separator";
import { Check, X } from "lucide-react";

interface TopFourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allAlbums: NoSkipsAlbum[];
  currentTopFour: NoSkipsAlbum[];
  onSave: (selections: {albumId: number, position: number}[]) => void;
}

export function TopFourDialog({ 
  open, 
  onOpenChange, 
  allAlbums, 
  currentTopFour, 
  onSave 
}: TopFourDialogProps) {
  const [selectedAlbums, setSelectedAlbums] = useState<{albumId: number, position: number}[]>([]);
  
  // Initialize with current top four when dialog opens
  useEffect(() => {
    if (open && currentTopFour) {
      setSelectedAlbums(
        currentTopFour.map(album => ({
          albumId: album.albumId,
          position: album.topFourPosition || 0
        }))
      );
    }
  }, [open, currentTopFour]);
  
  const handleToggleAlbum = (albumId: number) => {
    // Check if already selected
    const isSelected = selectedAlbums.some(item => item.albumId === albumId);
    
    if (isSelected) {
      // Remove from selection
      setSelectedAlbums(prev => prev.filter(item => item.albumId !== albumId));
    } else if (selectedAlbums.length < 4) {
      // Add to selection with next available position
      const positions = selectedAlbums.map(item => item.position).filter(p => p > 0);
      let position = 1;
      while (positions.includes(position) && position <= 4) {
        position++;
      }
      
      setSelectedAlbums(prev => [...prev, { albumId, position }]);
    }
  };
  
  const handleSave = () => {
    onSave(selectedAlbums);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-mono max-w-xl bg-white border">
        <DialogHeader>
          <DialogTitle className="font-mono text-left text-2xl font-bold">Edit Your Top 4</DialogTitle>
          <DialogDescription className="font-mono text-left mt-2 text-gray-600">
            Select up to 4 albums for your top picks. These will be 
            displayed at the top of your No Skips page.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <h3 className="font-mono text-base font-medium mb-2">Selected Albums ({selectedAlbums.length}/4)</h3>
          
          {selectedAlbums.length > 0 ? (
            <div className="border-t border-b py-4 mb-4">
              <div className="grid grid-cols-4 gap-4">
                {selectedAlbums.map((selection) => {
                  const album = allAlbums.find(a => a.albumId === selection.albumId);
                  return album ? (
                    <div key={album.albumId} className="relative">
                      <AlbumArt
                        src={album.album.imageUrl}
                        alt={album.album.name}
                        size="medium"
                      />
                      <button 
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        onClick={() => handleToggleAlbum(album.albumId)}
                        aria-label="Remove album"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ) : (
            <div className="border-t border-b py-6 mb-4 text-center text-gray-500">
              No albums selected. Choose up to 4 from your list below.
            </div>
          )}
          
          <h3 className="font-mono text-base font-medium mb-3">Your No Skips Albums</h3>
          
          <div className="grid grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
            {allAlbums.map((album) => {
              const isSelected = selectedAlbums.some(item => item.albumId === album.albumId);
              return (
                <div 
                  key={album.albumId} 
                  className="relative cursor-pointer group"
                  onClick={() => handleToggleAlbum(album.albumId)}
                >
                  <AlbumArt
                    src={album.album.imageUrl}
                    alt={album.album.name}
                    size="small"
                    className={isSelected ? "border-2 border-green-500" : "border border-gray-200"}
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-mono border-gray-300 hover:bg-gray-50 text-gray-800 px-8"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="font-mono bg-green-500 hover:bg-green-600 text-white px-8"
          >
            Save Top 4
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}