import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { AlbumArt } from "@/components/ui/album-art";
import { Album } from "@shared/schema";
import { StarRating } from "./star-rating";
import { EditableGenre } from "./editable-genre";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TagIcon, PlusIcon, XIcon } from "lucide-react";
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
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  
  const handleSubmit = () => {
    if (rating === 0) return; // Require at least 1 star
    onSubmit(rating, review, listenedAt);
    onOpenChange(false);
  };
  
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-mono max-w-md border border-black rounded-none">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg">Review Album</DialogTitle>
        </DialogHeader>
        
        {/* Album Info Section */}
        <div className="flex items-start gap-3 py-3">
          <div className="w-16 h-16 flex-shrink-0">
            <AlbumArt src={album.imageUrl} alt={album.name} size="small" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono text-sm font-medium truncate">{album.name}</h3>
            <p className="font-mono text-xs text-black/60 truncate">{album.artist}</p>
            
            {/* Genre and Tags Row */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-shrink-0">
                <EditableGenre albumId={album.id} genre={album.genre} />
              </div>
              
              {/* Tags */}
              <div className="flex items-center gap-1 flex-wrap min-w-0">
                {tags.map(tag => (
                  <span 
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-black bg-gray-100 font-mono"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                
                {/* Add Tag Button */}
                {tags.length < 3 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center px-1 py-0.5 text-xs border border-black bg-white hover:bg-gray-50 font-mono">
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2 border border-black rounded-none">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Add tag..."
                          className="flex-1 px-2 py-1 text-xs border border-black font-mono"
                          maxLength={20}
                        />
                        <button
                          onClick={handleAddTag}
                          className="px-2 py-1 border border-black bg-black text-white text-xs font-mono"
                        >
                          Add
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Rating Section */}
        <div className="py-2">
          <label className="font-mono text-sm block mb-2">Rating</label>
          <StarRating value={rating} onChange={setRating} size="large" />
        </div>
        
        {/* Review Section */}
        <div className="py-2">
          <label className="font-mono text-sm block mb-2">Review (optional)</label>
          <RichTextEditor
            value={review}
            onChange={setReview}
            placeholder="What did you think of this album? Select text and use the toolbar for formatting."
            rows={3}
          />
        </div>
        
        {/* Listen Date Section */}
        <div className="py-2">
          <label className="font-mono text-sm block mb-2">When did you listen?</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal font-mono border-black rounded-none",
                  !listenedAt && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {listenedAt ? format(listenedAt, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border border-black rounded-none">
              <Calendar
                mode="single"
                selected={listenedAt}
                onSelect={setListenedAt}
                initialFocus
                className="font-mono"
                classNames={{
                  day_today: "bg-black text-white font-medium",
                  day_selected: "bg-black text-white font-medium",
                  day: "h-8 w-8 p-0 font-normal border border-gray-200 aspect-square",
                  head_cell: "font-mono text-xs font-normal",
                  cell: "text-center text-xs p-0 relative focus-within:relative first:text-gray-500 last:text-gray-500",
                  caption: "flex justify-center pt-1 relative items-center font-mono",
                  nav_button: "border border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100",
                  table: "border-collapse space-y-1 font-mono"
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Action Buttons */}
        <DialogFooter className="pt-4">
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="font-mono border-black rounded-none"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0}
            className="font-mono bg-black text-white border-black rounded-none hover:bg-gray-800"
          >
            Add to List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}