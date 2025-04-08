import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NoSkipsAlbum } from "@/hooks/use-albums";
import { AlbumGrid } from "@/components/ui/album-grid";
import { AlbumArt } from "@/components/ui/album-art";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

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
      <DialogContent className="font-mono max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-mono">Edit Your Top 4</DialogTitle>
          <DialogDescription className="font-mono">
            Select up to 4 albums for your top picks. These will be displayed at the top of your No Skips page.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <h3 className="font-mono text-sm font-medium mb-2">Selected Albums ({selectedAlbums.length}/4)</h3>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {selectedAlbums.length > 0 ? (
              selectedAlbums.map((selection) => {
                const album = allAlbums.find(a => a.albumId === selection.albumId);
                return album ? (
                  <div key={album.albumId} className="relative">
                    <AlbumArt
                      src={album.album.imageUrl}
                      alt={album.album.name}
                    />
                    <button 
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                      onClick={() => handleToggleAlbum(album.albumId)}
                    >
                      ×
                    </button>
                  </div>
                ) : null;
              })
            ) : (
              <div className="col-span-4 text-center py-4 text-gray-500">
                No albums selected. Choose up to 4 from your list below.
              </div>
            )}
          </div>
          
          <Separator className="my-4" />
          
          <h3 className="font-mono text-sm font-medium mb-2">Your No Skips Albums</h3>
          <div className="max-h-60 overflow-y-auto">
            <AlbumGrid columns={4} gap="small">
              {allAlbums.map((album) => {
                const isSelected = selectedAlbums.some(item => item.albumId === album.albumId);
                return (
                  <div 
                    key={album.albumId} 
                    className={`relative cursor-pointer ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                    onClick={() => handleToggleAlbum(album.albumId)}
                  >
                    <AlbumArt
                      src={album.album.imageUrl}
                      alt={album.album.name}
                      size="small"
                    />
                    <div className="absolute top-1 right-1">
                      <Checkbox 
                        checked={isSelected}
                        className="h-4 w-4 border-white bg-black/50"
                      />
                    </div>
                  </div>
                );
              })}
            </AlbumGrid>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-mono"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="font-mono"
          >
            Save Top 4
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}