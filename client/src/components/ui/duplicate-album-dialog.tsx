import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface DuplicateAlbumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  albumName: string;
  sectionName: string;
}

export function DuplicateAlbumDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  albumName, 
  sectionName 
}: DuplicateAlbumDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <DialogTitle className="font-mono text-base">Duplicate Album</DialogTitle>
        </div>
        
        <p className="font-mono text-sm text-gray-600 mt-4">
          <span className="font-medium text-black">"{albumName}"</span> is already in your {sectionName}. 
          Do you want to add it again?
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <DialogClose asChild>
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-black bg-white text-black font-mono text-sm hover:bg-gray-50"
              data-testid="button-cancel-duplicate"
            >
              Cancel
            </button>
          </DialogClose>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 border border-black bg-black text-white font-mono text-sm hover:bg-gray-800"
            data-testid="button-add-duplicate"
          >
            Add Anyway
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
