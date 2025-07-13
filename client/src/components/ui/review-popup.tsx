import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlbumArt } from "@/components/ui/album-art";
import { CalendarIcon } from "lucide-react";
import { AlbumReview } from "@/hooks/use-albums";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ReviewPopupProps {
  review: AlbumReview | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id: number;
    rating: number;
    review: string;
    listenedAt?: Date;
    genre?: string;
  }) => void;
  onDelete?: (id: number) => void;
  onGenreUpdate?: (albumId: number, genre: string) => void;
}

export function ReviewPopup({ review, isOpen, onClose, onSave, onDelete, onGenreUpdate }: ReviewPopupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editReview, setEditReview] = useState("");
  const [editListenedAt, setEditListenedAt] = useState<Date | undefined>(undefined);
  const [editGenre, setEditGenre] = useState("");

  // Update local state when review changes
  useEffect(() => {
    if (review) {
      setEditReview(review.review || "");
      setEditListenedAt(review.listenedAt ? new Date(review.listenedAt) : undefined);
      setEditGenre(review.album?.genre || "");
    }
  }, [review]);

  // Reset editing mode when popup closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!review) return;
    
    onSave({
      id: review.id,
      rating: 0, // No longer using ratings
      review: editReview,
      listenedAt: editListenedAt,
      genre: editGenre
    });
    
    // Update genre if changed and callback provided
    if (onGenreUpdate && editGenre !== review.album?.genre) {
      onGenreUpdate(review.album.id, editGenre);
    }
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (review) {
      setEditReview(review.review || "");
      setEditListenedAt(review.listenedAt ? new Date(review.listenedAt) : undefined);
      setEditGenre(review.album?.genre || "");
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (review && onDelete) {
      onDelete(review.id);
      onClose();
    }
  };

  if (!review) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between">
          <DialogTitle className="font-mono">Why you love it</DialogTitle>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 border border-black bg-white text-black font-mono text-xs hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </div>
        
        {/* Album Info */}
        <div className="flex items-center gap-3 mt-4">
          <a 
            href={`https://open.spotify.com/album/${review.album.spotifyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:opacity-80 transition-opacity"
          >
            <AlbumArt
              src={review.album.imageUrl}
              alt={review.album.name}
              size="small"
            />
          </a>
          <div className="flex flex-col gap-1">
            <h3 className="font-mono text-sm font-medium">{review.album.name}</h3>
            <p className="font-mono text-xs text-gray-500">{review.album.artist}</p>
            {isEditing ? (
              <Input
                value={editGenre}
                onChange={(e) => setEditGenre(e.target.value)}
                placeholder="Enter genre"
                className="font-mono text-xs h-6 px-2 border-gray-300"
              />
            ) : (
              <p className="font-mono text-xs text-gray-500">{review.album.genre || "no genre"}</p>
            )}
          </div>
        </div>

        {isEditing ? (
          /* Edit Mode */
          <>
            {/* Review Text */}
            <div className="mt-6">
              <label className="block font-mono text-sm mb-2">Why you love it</label>
              <textarea
                value={editReview}
                onChange={(e) => setEditReview(e.target.value)}
                placeholder="What makes this special to you?"
                maxLength={200}
                className="w-full p-3 border border-black font-mono text-sm resize-none"
                rows={4}
              />
              <p className="font-mono text-xs text-gray-500 mt-1 text-right">
                {editReview.length}/200 characters
              </p>
            </div>

            {/* Listen Date */}
            <div className="mt-4">
              <label className="block font-mono text-sm mb-2">When did you listen?</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal font-mono border-black",
                      !editListenedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editListenedAt ? format(editListenedAt, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border border-black rounded-none">
                  <Calendar
                    mode="single"
                    selected={editListenedAt}
                    onSelect={setEditListenedAt}
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

            {/* Edit Action Buttons */}
            <div className="flex justify-between items-center mt-6">
              {onDelete && (
                <button 
                  onClick={handleDelete}
                  className="px-4 py-2 border border-red-600 bg-white text-red-600 font-mono text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 border border-black bg-white text-black font-mono text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="px-4 py-2 border border-black bg-black text-white font-mono text-sm hover:bg-gray-800"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </>
        ) : (
          /* View Mode */
          <>
            {/* Review Text Display */}
            {review.review && (
              <div className="mt-6">
                <h4 className="font-mono text-sm mb-2">Why you love it</h4>
                <p className="font-mono text-sm leading-relaxed">{review.review}</p>
              </div>
            )}

            {/* Listen Date Display */}
            {review.listenedAt && (
              <div className="mt-4">
                <p className="font-mono text-xs text-gray-500">
                  Listened on {format(new Date(review.listenedAt), "PPP")}
                </p>
              </div>
            )}

            {/* View Mode Close Button */}
            <div className="flex justify-end mt-6">
              <DialogClose asChild>
                <button className="px-4 py-2 border border-black bg-white text-black font-mono text-sm hover:bg-gray-50">
                  Close
                </button>
              </DialogClose>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}