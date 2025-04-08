import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlbumArt } from "@/components/ui/album-art";
import { Album } from "@shared/schema";
import { StarRating } from "./star-rating";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ReviewDialogProps {
  album: Album;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rating: number, review: string, listenedAt?: Date) => void;
}

export function ReviewDialog({ album, open, onOpenChange, onSubmit }: ReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [listenedAt, setListenedAt] = useState<Date | undefined>(new Date());
  
  const handleSubmit = () => {
    if (rating === 0) return; // Require at least 1 star
    onSubmit(rating, review, listenedAt);
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
        
        <div className="py-2">
          <label className="font-mono text-sm block mb-1">When did you listen to this album?</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal font-mono",
                  !listenedAt && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {listenedAt ? format(listenedAt, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={listenedAt}
                onSelect={setListenedAt}
                initialFocus
              />
            </PopoverContent>
          </Popover>
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