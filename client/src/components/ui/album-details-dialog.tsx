import { useEffect, useMemo, useState } from "react";
import { Calendar, Edit2, Loader2, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "./button";
import { Input } from "./input";
import { RichTextEditor } from "./rich-text-editor";
import { StarRating } from "./star-rating";

interface AlbumDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  album: {
    id: number;
    name: string;
    artist: string;
    imageUrl: string;
    genre?: string | null;
    spotifyId?: string | null;
    appleMusicId?: string | null;
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

/**
 * AlbumDetailsDialog
 * - Existing: rating/listen date/review + inline genre editor
 * - New: per-user album note editor (max 150 chars) stored in album_notes
 */
export function AlbumDetailsDialog({
  isOpen,
  onClose,
  album,
  existingReview,
  onSave,
  onUpdate,
  onUpdateGenre,
}: AlbumDetailsDialogProps) {
  // Review-related state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [listenDate, setListenDate] = useState<Date>(new Date());

  // Genre editor state (global on album)
  const [genre, setGenre] = useState<string>(album.genre || "");
  const [isEditingGenre, setIsEditingGenre] = useState(false);

  // Note editor state (per-user)
  const [note, setNote] = useState<string>("");
  const [savedNote, setSavedNote] = useState<string>("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const noteCharsLeft = useMemo(() => 150 - (note?.length ?? 0), [note]);
  const noteIsDirty = useMemo(() => note !== savedNote, [note, savedNote]);

  // Reset all local state when the dialog opens OR album/review changes.
  useEffect(() => {
    if (!isOpen) return;

    setRating(existingReview?.rating ?? 0);
    setReview(existingReview?.review ?? "");
    setListenDate(existingReview?.listenedAt ? new Date(existingReview.listenedAt) : new Date());

    setGenre(album.genre || "");
    setIsEditingGenre(false);

    // Notes are per-user, so we always fetch fresh when opening.
    setIsEditingNote(false);
    void fetchNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, album.id, existingReview?.id]);

  const fetchNote = async () => {
    setIsLoadingNote(true);
    try {
      const res = await fetch(`/api/albums/${album.id}/note`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        // Non-fatal: we can still use the dialog without notes.
        console.error("Failed to fetch album note", res.status);
        setSavedNote("");
        setNote("");
        return;
      }

      const data = (await res.json()) as { note: string | null };
      const n = (data?.note ?? "") as string;
      setSavedNote(n);
      setNote(n);
    } catch (err) {
      console.error("Error fetching album note", err);
      setSavedNote("");
      setNote("");
    } finally {
      setIsLoadingNote(false);
    }
  };

  const saveNote = async () => {
    // Basic client-side guard (server also enforces this)
    if (note.length > 150) {
      alert("Note must be 150 characters or less");
      return;
    }

    setIsSavingNote(true);
    try {
      const trimmed = note.trim();
      const payload = { note: trimmed.length === 0 ? null : trimmed };

      const res = await fetch(`/api/albums/${album.id}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to save album note", res.status, errorText);
        alert("Failed to save note. Please try again.");
        return;
      }

      // Response returns the saved row; we only need the note value.
      const saved = (await res.json()) as { note: string | null };
      const n = (saved?.note ?? "") as string;
      setSavedNote(n);
      setNote(n);
      setIsEditingNote(false);
    } catch (err) {
      console.error("Error saving album note", err);
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSavingNote(false);
    }
  };

    const handleSave = async () => {
    // Rating is optional. If none selected, save as 0 (unrated).
    const safeRating = typeof rating === "number" ? rating : 0;

    // If the user typed a new note but didn't press "Save" in the note editor,
    // we auto-save so changes aren't lost.
    if (noteIsDirty) {
      await saveNote();
    }

    if (existingReview && onUpdate) {
      onUpdate({
        id: existingReview.id,
        rating: safeRating,
        review: review || undefined,
        listenedAt: listenDate,
      });
    } else {
      onSave({
        albumId: album.id,
        rating: safeRating,
        review: review || undefined,
        listenedAt: listenDate,
        genre: genre || undefined,
      });
    }

    if (onUpdateGenre && genre !== (album.genre || "")) {
      onUpdateGenre(album.id, genre);
    }

    onClose();
  };

  const handleGenreSave = () => {
    if (onUpdateGenre && genre !== (album.genre || "")) {
      onUpdateGenre(album.id, genre);
    }
    setIsEditingGenre(false);
  };

  const handlePlayInService = () => {
    if (album.appleMusicId) {
      window.open(`https://music.apple.com/album/${album.appleMusicId}`, "_blank");
    } else if (album.spotifyId) {
      window.open(`https://open.spotify.com/album/${album.spotifyId}`, "_blank");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold font-mono">Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
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

              {/* Genre Section (global) */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">Genre:</span>
                {isEditingGenre ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="font-mono text-sm h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleGenreSave();
                        } else if (e.key === "Escape") {
                          setGenre(album.genre || "");
                          setIsEditingGenre(false);
                        }
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleGenreSave} className="h-8 px-2">
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{genre || "Unknown"}</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingGenre(true)} className="h-6 w-6 p-0">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Notes Section (per-user) */}
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">Note:</span>
                  {isLoadingNote ? (
                    <div className="flex items-center gap-2 text-gray-500 font-mono text-sm">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading…
                    </div>
                  ) : isEditingNote ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="font-mono text-sm h-8"
                        placeholder="Add a short note (max 150 chars)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void saveNote();
                          } else if (e.key === "Escape") {
                            setNote(savedNote);
                            setIsEditingNote(false);
                          }
                        }}
                        autoFocus
                        disabled={isSavingNote}
                      />
                      <Button
                        size="sm"
                        onClick={() => void saveNote()}
                        className="h-8 px-2"
                        disabled={isSavingNote}
                      >
                        {isSavingNote ? "Saving…" : "Save"}
                      </Button>
                      <span className={`font-mono text-xs ${noteCharsLeft < 0 ? "text-red-500" : "text-gray-500"}`}>
                        {noteCharsLeft}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-700">{savedNote || "(none)"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingNote(true)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rating and Listen Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating Section */}
            <div>
              <label className="block text-sm font-bold font-mono mb-2">Rating</label>
              <StarRating value={rating} onChange={setRating} size="large" />
            </div>

            {/* Listen Date Section */}
            <div>
              <label className="block text-sm font-bold font-mono mb-2">Listen Date</label>
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
            <label className="block text-sm font-bold font-mono mb-2">Review (optional)</label>
            <RichTextEditor
              value={review}
              onChange={setReview}
              placeholder="What did you think of this album? Select text and use the toolbar for formatting."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {(album.spotifyId || album.appleMusicId) && (
              <Button
                onClick={handlePlayInService}
                className={`flex-1 ${album.spotifyId ? "bg-green-500 hover:bg-green-600" : "bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"} text-white font-mono`}
              >
                {album.spotifyId ? "Play on Spotify" : "Play on Apple Music"}
              </Button>
            )}
            <Button onClick={handleSave} className="flex-1 bg-green-400 hover:bg-green-500 text-white font-mono">
              Add to The List
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
