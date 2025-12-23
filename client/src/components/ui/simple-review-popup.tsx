import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlbumArt } from "@/components/ui/album-art";
import { RichTextEditor, RichTextDisplay } from "@/components/ui/rich-text-editor";
import { NoSkipsReviewWithAlbum } from "@/hooks/use-no-skips-reviews";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { Trash2 } from "lucide-react";

interface SimpleReviewPopupProps {
  review: NoSkipsReviewWithAlbum | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id: number;
    review: string;
    genre?: string;
  }) => void;
  onDelete?: (id: number) => void;
  onGenreUpdate?: (albumId: number, genre: string) => void;
  readOnly?: boolean;
}

export function SimpleReviewPopup({ review, isOpen, onClose, onSave, onDelete, onGenreUpdate, readOnly = false }: SimpleReviewPopupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editReview, setEditReview] = useState("");
  const [editGenre, setEditGenre] = useState("");
  const { updateGenre, isUpdating } = useAlbumGenre();

  // Update local state when review changes
  useEffect(() => {
    if (review) {
      setEditReview(review.review || "");
      setEditGenre(review.album?.genre || "");
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
      review: editReview,
      genre: editGenre
    });
    
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (review) {
      setEditReview(review.review || "");
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <DialogTitle className="font-mono">Review</DialogTitle>
          {!readOnly && !isEditing && (
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
            {!readOnly && isEditing ? (
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

        {!readOnly && isEditing ? (
          /* Edit Mode */
          <>
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
            {/* Review Text Display */}
            {review.review && (
              <div className="mt-6">
                <h4 className="font-mono text-sm mb-2">Review</h4>
                <RichTextDisplay content={review.review} className="leading-relaxed" />
              </div>
            )}

            {/* View Mode Action Buttons */}
            <div className="flex justify-between mt-6">
              {!readOnly && onDelete && (
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