import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlbumArt } from "@/components/ui/album-art";
import { Album } from "@shared/schema";
import { StarRating } from "./star-rating";

interface ReviewDialogProps {
  album: Album;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rating: number, review: string) => void;
}

export function ReviewDialog({ album, open, onOpenChange, onSubmit }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  
  const handleSubmit = () => {
    if (rating === 0) return; // Require at least 1 star
    onSubmit(rating, review);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">Add to The List</DialogTitle>
          <DialogDescription className="font-mono">
            Write a review and rate this album before adding it to your list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-4 py-2">
          <div className="w-24 flex-shrink-0">
            <AlbumArt src={album.imageUrl} alt={album.name} />
          </div>
          <div>
            <h3 className="font-mono text-base">{album.name}</h3>
            <p className="font-mono text-sm text-black/60">{album.artist}</p>
          </div>
        </div>
        
        <div className="py-2">
          <label className="font-mono text-sm block mb-1">Rating</label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        
        <div className="py-2">
          <label className="font-mono text-sm block mb-1">Review (optional)</label>
          <Textarea
            placeholder="What did you think of this album?"
            className="font-mono text-sm"
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0}
            className="font-mono"
          >
            Add to The List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}