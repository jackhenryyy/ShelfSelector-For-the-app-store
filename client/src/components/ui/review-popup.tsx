import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { RichTextEditor, RichTextDisplay } from "@/components/ui/rich-text-editor";
import { AlbumReview } from "@/hooks/use-albums";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";

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
  const [editGenre, setEditGenre] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [editListenedAt, setEditListenedAt] = useState<Date | undefined>(undefined);
  const { updateGenre, isUpdating } = useAlbumGenre();

  // Update local state when review changes
  useEffect(() => {
    if (review) {
      setEditReview(review.review || "");
      setEditGenre(review.album?.genre || "");
      setEditRating(review.rating || 0);
      setEditListenedAt(review.listenedAt ? new Date(review.listenedAt) : undefined);
    }
  }, [review]);

  // Reset editing mode when popup closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!review) return;
    
    // Update genre first if it changed, using the hook directly
    if (editGenre !== review.album?.genre) {
      console.log('Updating genre in popup from', review.album?.genre, 'to', editGenre);
      await updateGenre(review.album.id, editGenre || null);
    }
    
    onSave({
      id: review.id,
      rating: editRating,
      review: editReview,
      listenedAt: editListenedAt,
      genre: editGenre
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (review) {
      setEditReview(review.review || "");
      setEditGenre(review.album?.genre || "");
      setEditRating(review.rating || 0);
      setEditListenedAt(review.listenedAt ? new Date(review.listenedAt) : undefined);
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <DialogTitle className="font-mono">Review</DialogTitle>
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 border border-black bg-white text-black font-mono text-xs hover:bg-gray-50 mr-8"
            >
              Edit
            </button>
          )}
        </div>
        
        {/* Album Info */}
        <div className="flex items-center gap-3 mt-4">
          <a 
            href={review.album.appleMusicId 
              ? `https://music.apple.com/album/${review.album.appleMusicId}`
              : `https://open.spotify.com/album/${review.album.spotifyId}`}
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
            {/* Rating Edit */}
            <div className="mt-6">
              <label className="block font-mono text-sm mb-2">Rating</label>
              <StarRating 
                value={editRating} 
                onChange={setEditRating}
                readonly={false}
              />
            </div>

            {/* Listen Date Edit */}
            <div className="mt-6">
              <label className="block font-mono text-sm mb-2">Listened On</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 border border-black bg-white text-left font-mono text-sm hover:bg-gray-50"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    {editListenedAt ? format(editListenedAt, "PPP") : "Select date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editListenedAt}
                    onSelect={setEditListenedAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Review Text */}
            <div className="mt-6">
              <label className="block font-mono text-sm mb-2">Review</label>
              <RichTextEditor
                value={editReview}
                onChange={setEditReview}
                placeholder="What makes this special to you? Select text and use the toolbar for formatting."
                rows={4}
              />
            </div>

            {/* Edit Action Buttons */}
            <div className="flex justify-between gap-2 mt-6">
              {onDelete && (
                <button 
                  onClick={handleDelete}
                  className="px-3 py-2 border border-red-500 bg-white text-red-500 font-mono text-sm hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
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
            {/* Rating and Date Display */}
            <div className="mt-6 flex flex-col gap-4">
              {/* Star Rating Display */}
              <div>
                <h4 className="font-mono text-sm mb-2">Rating</h4>
                <StarRating value={parseFloat(review.rating.toString()) || 0} readonly />
              </div>
              
              {/* Listen Date Display */}
              {review.listenedAt && (
                <div>
                  <h4 className="font-mono text-sm mb-2">Listened On</h4>
                  <p className="font-mono text-sm">{format(new Date(review.listenedAt), "PPP")}</p>
                </div>
              )}
            </div>

            {/* Review Text Display */}
            {review.review && (
              <div className="mt-6">
                <h4 className="font-mono text-sm mb-2">Review</h4>
                <RichTextDisplay content={review.review} className="leading-relaxed" />
              </div>
            )}

            {/* View Mode Action Buttons */}
            <div className="flex justify-between mt-6">
              {onDelete && (
                <button 
                  onClick={handleDelete}
                  className="px-3 py-2 border border-red-500 bg-white text-red-500 font-mono text-sm hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
              <DialogClose asChild>
                <button className="px-4 py-2 border border-black bg-white text-black font-mono text-sm hover:bg-gray-50 ml-auto">
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