import { useState } from "react";
import { X, Edit2, Calendar, Star } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AlbumDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  album: {
    id: number;
    name: string;
    artist: string;
    imageUrl: string;
    genre?: string;
    spotifyId: string;
  };
  existingReview?: {
    id: number;
    rating: number;
    review?: string;
    listenedAt?: string;
  };
  onSave: (data: {
    albumId: number;
    rating: number;
    review?: string;
    listenedAt?: Date;
    genre?: string;
  }) => void;
  onUpdate?: (data: {
    id: number;
    rating: number;
    review?: string;
    listenedAt?: Date;
  }) => void;
  onUpdateGenre?: (albumId: number, genre: string) => void;
}

export function AlbumDetailsDialog({
  isOpen,
  onClose,
  album,
  existingReview,
  onSave,
  onUpdate,
  onUpdateGenre,
}: AlbumDetailsDialogProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [review, setReview] = useState(existingReview?.review || "");
  const [listenDate, setListenDate] = useState(
    existingReview?.listenedAt ? new Date(existingReview.listenedAt) : new Date()
  );
  const [genre, setGenre] = useState(album.genre || "");
  const [isEditingGenre, setIsEditingGenre] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  if (!isOpen) return null;

  const handleSave = () => {
    if (existingReview && onUpdate) {
      onUpdate({
        id: existingReview.id,
        rating,
        review: review || undefined,
        listenedAt: listenDate,
      });
    } else {
      onSave({
        albumId: album.id,
        rating,
        review: review || undefined,
        listenedAt: listenDate,
        genre: genre || undefined,
      });
    }
    
    if (onUpdateGenre && genre !== album.genre) {
      onUpdateGenre(album.id, genre);
    }
    
    onClose();
  };

  const handleGenreSave = () => {
    if (onUpdateGenre && genre !== album.genre) {
      onUpdateGenre(album.id, genre);
    }
    setIsEditingGenre(false);
  };

  const handleSpotifyPlay = () => {
    window.open(`https://open.spotify.com/album/${album.spotifyId}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold font-mono">Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Album Info Section */}
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <img
                src={album.imageUrl}
                alt={`${album.name} by ${album.artist}`}
                className="w-32 h-32 rounded-lg object-cover"
              />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-bold font-mono">{album.name}</h3>
              <p className="text-gray-600 font-mono">{album.artist}</p>
              
              {/* Genre Section */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">Genre:</span>
                {isEditingGenre ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="font-mono text-sm h-8"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleGenreSave();
                        } else if (e.key === 'Escape') {
                          setGenre(album.genre || "");
                          setIsEditingGenre(false);
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleGenreSave}
                      className="h-8 px-2"
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{genre || "Unknown"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingGenre(true)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rating and Listen Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating Section */}
            <div>
              <label className="block text-sm font-bold font-mono mb-2">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="relative">
                    {/* Left half of star (for .5 ratings) */}
                    <button
                      type="button"
                      className="absolute left-0 top-0 w-1/2 h-full z-10 p-1"
                      onMouseEnter={() => setHoveredStar(star - 0.5)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setRating(star - 0.5)}
                    />
                    {/* Right half of star (for full ratings) */}
                    <button
                      type="button"
                      className="absolute right-0 top-0 w-1/2 h-full z-10 p-1"
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setRating(star)}
                    />
                    {/* Star visual */}
                    <div className="relative p-1">
                      <Star
                        className={cn(
                          "h-6 w-6 text-gray-300"
                        )}
                      />
                      {/* Full star fill */}
                      {(hoveredStar >= star || rating >= star) && (
                        <Star
                          className="absolute top-1 left-1 h-6 w-6 fill-yellow-400 text-yellow-400"
                        />
                      )}
                      {/* Half star fill */}
                      {((hoveredStar >= star - 0.5 && hoveredStar < star) || (rating >= star - 0.5 && rating < star)) && (
                        <div className="absolute top-1 left-1 w-3 h-6 overflow-hidden">
                          <Star
                            className="h-6 w-6 fill-yellow-400 text-yellow-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-1">
                {rating > 0 ? `${rating} stars` : "No rating"}
              </div>
            </div>

            {/* Listen Date Section */}
            <div>
              <label className="block text-sm font-bold font-mono mb-2">
                Listen Date
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  value={format(listenDate, "yyyy-MM-dd")}
                  onChange={(e) => setListenDate(new Date(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Review Section */}
          <div>
            <label className="block text-sm font-bold font-mono mb-2">
              Review (optional)
            </label>
            <Textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think of this album?"
              className="font-mono min-h-[120px] resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSpotifyPlay}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-mono"
            >
              Play on Spotify
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-400 hover:bg-green-500 text-white font-mono"
            >
              Add to The List
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}