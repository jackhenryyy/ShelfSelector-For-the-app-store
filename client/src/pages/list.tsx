import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, MenuIcon, SearchIcon } from "lucide-react";

import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewPopup } from "@/components/ui/review-popup";
import { ListShareDialog } from "@/components/ui/list-share-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlbumDetailsDialog } from "@/components/ui/album-details-dialog";

import { useAlbumReviews, type AlbumReview } from "@/hooks/use-albums";
import { useSpotifyAlbums, type SpotifyAlbum } from "@/hooks/use-spotify";
import { useToast } from "@/hooks/use-toast";

import { exportAlbumsToCSV } from "@/lib/csv-export";
import { openInMusicService } from "@/lib/spotify";
import { apiRequest } from "@/lib/queryClient";

import { groupAlbumsByMonth, sortAlbums } from "@/components/ui/album-filter-sort";

export default function ListPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { albumReviews, updateReview, deleteReview } = useAlbumReviews();

  // Year-only filter
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Review popup (menu icon on rows)
  const [activeReview, setActiveReview] = useState<AlbumReview | null>(null);

  // Add album dialog (search)
  const { searchAlbums, searchResults, isSearching } = useSpotifyAlbums();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");

  // Details dialog (THIS is the new “Add to List” flow)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAlbum, setDetailsAlbum] = useState<SpotifyAlbum | null>(null);

  // Import CSV
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importParseError, setImportParseError] = useState<string | null>(null);
  const [importMissingHeaders, setImportMissingHeaders] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const expectedHeaders = [
    "artist",
    "album",
    "year",
    "genre",
    "spotify_url",
    "rating",
    "review",
    "listened_date",
  ];

  // STANDARDIZED MENU BAR STYLES (square + consistent)
  const controlBase =
    "h-10 border border-black bg-white font-mono text-sm focus:outline-none rounded-none";
  const btnBase = `${controlBase} whitespace-nowrap px-4 flex items-center justify-center`;
  const selectBase = `${controlBase} px-4 pr-10 appearance-none`;

  // Years for filter
  const uniqueYears = useMemo(() => {
    if (!albumReviews) return [];
    return [...new Set(albumReviews.map((r) => r.album.releaseYear).filter(Boolean as any))]
      .map((y) => Number(y))
      .filter((y) => !Number.isNaN(y))
      .sort((a, b) => b - a);
  }, [albumReviews]);

  // Filter by year + default sort newest-first
  const filteredReviews = useMemo(() => {
    const base = albumReviews ? [...albumReviews] : [];
    const yearFiltered =
      selectedYear === "all"
        ? base
        : base.filter((r) => Number(r.album.releaseYear) === Number(selectedYear));

    return sortAlbums(yearFiltered as any, "date-added-newest") as any;
  }, [albumReviews, selectedYear]);

  // Group by month/year
  const groupedReviews = useMemo(() => groupAlbumsByMonth(filteredReviews), [filteredReviews]);

  const sortedMonthYearKeys = useMemo(() => {
    const keys = Object.keys(groupedReviews);
    const monthsOrder: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
    };

    return keys.sort((a, b) => {
      if (a === "unknown date") return 1;
      if (b === "unknown date") return -1;

      try {
        const [monthA, yearA] = a.split(" ");
        const [monthB, yearB] = b.split(" ");

        const yearDiff = parseInt(yearB) - parseInt(yearA);
        if (yearDiff !== 0) return yearDiff;

        return (monthsOrder[monthB.toLowerCase()] ?? 0) - (monthsOrder[monthA.toLowerCase()] ?? 0);
      } catch {
        return 0;
      }
    });
  }, [groupedReviews]);

  const getDay = (review: AlbumReview) => {
    try {
      const dateStr = review.listenedAt || review.reviewedAt;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "--";
      return date.getDate();
    } catch {
      return "--";
    }
  };

  const handleOpenAlbumInMusicService = (album: { spotifyId?: string | null; appleMusicId?: string | null }) => {
    openInMusicService(album);
  };

  // Add album search
  const handleAddAlbumSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addSearchQuery.trim()) return;

    try {
      await searchAlbums(addSearchQuery.trim());
    } catch {
      toast({ title: "Search failed", description: "Please try again.", variant: "destructive" });
    }
  };

  /**
   * ✅ NEW: Add now opens Details (no API call here).
   * This avoids the backend requirement for rating until the user actually sets it in Details.
   */
  const handleOpenDetailsForAlbum = (album: SpotifyAlbum) => {
    setDetailsAlbum(album);
    setDetailsOpen(true);
    setAddDialogOpen(false); // close search modal so Details is the focus
  };

  /**
   * ✅ Details Save -> create the review properly (rating required).
   * This mirrors the backend expectations for POST /api/reviews.
   */
  const handleSaveFromDetails = async (data: {
    albumId: number;
    rating: number;
    review?: string;
    listenedAt?: Date;
  }) => {
    try {
      const payload = {
  albumId: data.albumId,
  rating: typeof data.rating === "number" ? data.rating : 0,
  review: data.review || "",
  listenedAt: data.listenedAt ? data.listenedAt.toISOString() : undefined,
      };

      const resp = await apiRequest("/api/reviews", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || `Failed (${resp.status})`);
      }

      // Refresh list
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });

      toast({
        title: "Added to The List",
        description: "Saved. You can edit any time from the menu icon.",
      });

      setDetailsOpen(false);
      setDetailsAlbum(null);
      setAddSearchQuery("");
    } catch (err) {
      toast({
        title: "Couldn’t save review",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Import CSV helpers
  const resetImportState = () => {
    setImportRows([]);
    setImportPreview([]);
    setImportFileName("");
    setImportParseError(null);
    setImportMissingHeaders([]);
    setImportResult(null);
    setIsImporting(false);
  };

  const handleCsvSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportParseError(null);
    setImportResult(null);
    setImportFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = result.meta.fields || [];
        const missingHeaders = expectedHeaders.filter((header) => !fields.includes(header));
        setImportMissingHeaders(missingHeaders);

        const data = (result.data || []) as Record<string, string>[];
        setImportRows(data);
        setImportPreview(data.slice(0, 10));

        if (result.errors.length > 0) {
          setImportParseError(result.errors[0]?.message || "Failed to parse CSV.");
        }

        setImportDialogOpen(true);
      },
      error: (error) => {
        setImportParseError(error.message || "Failed to parse CSV.");
        setImportRows([]);
        setImportPreview([]);
        setImportDialogOpen(true);
      },
    });

    event.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setImportParseError(null);

    try {
      const response = await apiRequest("/api/import/reviews", {
        method: "POST",
        body: JSON.stringify({ rows: importRows }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      setImportResult(data);

      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Import complete", description: `Imported ${data.imported}, skipped ${data.skipped}.` });
    } catch (error) {
      setImportParseError(error instanceof Error ? error.message : "Import failed.");
      toast({ title: "Import failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Layout title="the list" subtitle="">
      {/* Pinned header + scroll body */}
      <div className="p-3 pt-0 h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0">
          <div className="font-mono text-xs text-black/60">{filteredReviews.length} albums</div>

          {/* Menu bar */}
          <div className="mt-2 mb-3 flex flex-col gap-2">
            {/* Row 1: years + add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className={`${selectBase} w-full`}
                  title="Filter by release year"
                >
                  <option value="all">all years</option>
                  {uniqueYears.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>

                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-black/60">
                  ▾
                </div>
              </div>

              <button
                type="button"
                className={`${btnBase} w-28`}
                onClick={() => setAddDialogOpen(true)}
                title="Add an album"
              >
                + add
              </button>

              <button
                type="button"
                className={`${btnBase} w-28`}
                onClick={() => setLocation("/top25")}
                title="Top 25"
              >
                top 25
              </button>
            </div>

            {/* Row 2: share / import / export */}
            <div className="flex gap-2">
              <div className="flex-1">
                <ListShareDialog />
              </div>

              <button
                type="button"
                className={`${btnBase} flex-1`}
                onClick={() => fileInputRef.current?.click()}
                title="Import from CSV"
              >
                import csv
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvSelect}
                className="hidden"
              />

              <button
                type="button"
                className={`${btnBase} flex-1 flex items-center gap-1`}
                onClick={() => exportAlbumsToCSV(filteredReviews, "the-shelf-export.csv", true)}
                title="Export to CSV"
              >
                <DownloadIcon className="h-4 w-4" />
                export csv
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-24">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-10 font-mono text-sm text-black/70">No albums yet.</div>
          ) : (
            <div className="space-y-6">
              {sortedMonthYearKeys.map((monthYear) => (
                <div key={monthYear}>
                  <div className="bg-gray-200 py-2 px-4 mb-4 font-mono text-sm">{monthYear}</div>

                  <div className="space-y-4">
                    {groupedReviews[monthYear].map((review) => (
                      <div key={review.id} className="flex gap-3 items-center">
                        {/* Day square */}
                        <div className="w-10 h-10 min-w-[40px] flex items-center justify-center border border-black aspect-square">
                          <div className="font-mono text-sm">{getDay(review)}</div>
                        </div>

                        {/* Cover */}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleOpenAlbumInMusicService(review.album);
                          }}
                        >
                          <AlbumArt src={review.album.imageUrl} alt={review.album.name} size="small" />
                        </a>

                        {/* 3-line text */}
                        <div className="flex-grow min-w-0">
                          <h3 className="font-mono text-sm truncate">{review.album.name}</h3>
                          <p className="font-mono text-xs text-black/60 mt-0.5 truncate">{review.album.artist}</p>
                          <p className="font-mono text-xs text-black/40 mt-0.5 truncate">
                            {review.album.genre || "—"}
                          </p>
                        </div>

                        {/* Rating + menu icon */}
                        <div className="flex items-center gap-3 shrink-0">
                          <StarRating value={parseFloat(review.rating.toString())} size="medium" readonly />
                          <button
                            className="text-black/60 hover:text-black"
                            onClick={() => setActiveReview(review)}
                            type="button"
                            title="Edit"
                          >
                            <MenuIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Add Album Dialog (search + open Details) */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="md:max-w-md w-[calc(100%-2rem)]">
            <DialogTitle className="font-mono">Add an album</DialogTitle>

            <form onSubmit={handleAddAlbumSearch} className="flex items-center gap-2 mt-4">
              <input
                placeholder="Search albums..."
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="w-full h-10 p-2 border border-black font-mono text-sm rounded-none"
              />
              <button
                className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
                type="submit"
                disabled={isSearching}
              >
                <SearchIcon className="h-4 w-4 mr-1" />
                {isSearching ? "..." : "Search"}
              </button>
            </form>

            {searchResults && searchResults.length > 0 && (
              <div className="mt-4 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                  {searchResults.map((album) => (
                    <div key={album.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlbumArt src={album.imageUrl} alt={album.name} size="small" />
                        <div className="min-w-0">
                          <div className="font-mono text-sm truncate">{album.name}</div>
                          <div className="font-mono text-xs text-gray-500 truncate">{album.artist}</div>
                        </div>
                      </div>

                      {/* ✅ This now opens Details instead of POSTing /api/reviews */}
                      <button
                        className="px-3 py-1 border border-black bg-white text-black font-mono text-xs rounded-none"
                        onClick={() => handleOpenDetailsForAlbum(album)}
                        type="button"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && addSearchQuery.trim() && (!searchResults || searchResults.length === 0) && (
              <div className="mt-4 font-mono text-sm text-black/60">No results yet — try another search.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* ✅ Details dialog (opens immediately after Add) */}
        {detailsAlbum && (
          <AlbumDetailsDialog
            isOpen={detailsOpen}
            onClose={() => {
              setDetailsOpen(false);
              setDetailsAlbum(null);
            }}
            album={detailsAlbum}
            onSave={handleSaveFromDetails}
          />
        )}

        {/* Review Popup (existing list items) */}
        <ReviewPopup
          review={activeReview}
          isOpen={!!activeReview}
          onClose={() => setActiveReview(null)}
          onSave={(reviewData: { id: number; rating: number; review: string; listenedAt?: Date }) => {
            updateReview(reviewData);
          }}
          onDelete={deleteReview}
          onGenreUpdate={async () => {}}
        />

        {/* Import Dialog */}
        <Dialog
          open={importDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetImportState();
            setImportDialogOpen(open);
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogTitle className="font-mono">import csv</DialogTitle>

            <div className="space-y-3 font-mono text-sm mt-2">
              <div className="text-black/70">{importFileName ? `File: ${importFileName}` : "No file selected"}</div>
              <div className="text-black/70">{importRows.length} rows detected</div>

              {importMissingHeaders.length > 0 && (
                <div className="text-red-600">Missing headers: {importMissingHeaders.join(", ")}</div>
              )}

              {importParseError && <div className="text-red-600">{importParseError}</div>}

              <div className="border border-black/10">
                <div className="px-3 py-2 border-b border-black/10 bg-gray-100">Preview (first 10 rows)</div>

                <div className="max-h-64 overflow-auto">
                  <div className="min-w-[980px]">
                    <table className="w-full text-left text-xs table-fixed">
                      <thead className="bg-white sticky top-0">
                        <tr className="border-b border-black/10">
                          <th className="px-2 py-2 w-[140px]">artist</th>
                          <th className="px-2 py-2 w-[180px]">album</th>
                          <th className="px-2 py-2 w-[70px]">year</th>
                          <th className="px-2 py-2 w-[140px]">genre</th>
                          <th className="px-2 py-2 w-[90px]">rating</th>
                          <th className="px-2 py-2 w-[140px]">listened_date</th>
                          <th className="px-2 py-2 w-[320px]">review</th>
                        </tr>
                      </thead>

                      <tbody>
                        {importPreview.length === 0 ? (
                          <tr>
                            <td className="px-2 py-3 text-black/70" colSpan={7}>
                              No rows to preview.
                            </td>
                          </tr>
                        ) : (
                          importPreview.map((row, index) => (
                            <tr key={index} className="border-b border-black/5 align-top">
                              <td className="px-2 py-2 truncate">{row?.artist || ""}</td>
                              <td className="px-2 py-2 truncate">{row?.album || ""}</td>
                              <td className="px-2 py-2">{row?.year || ""}</td>
                              <td className="px-2 py-2 truncate">{row?.genre || ""}</td>
                              <td className="px-2 py-2">{row?.rating || ""}</td>
                              <td className="px-2 py-2">
                                {row?.listened_date ? String(row.listened_date).slice(0, 10) : ""}
                              </td>
                              <td className="px-2 py-2 whitespace-normal break-normal text-black/80">
                                {row?.review || ""}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {importResult && (
                <div className="border border-black/10 p-3 bg-gray-50">
                  <div>Imported: {importResult.imported}</div>
                  <div>Skipped: {importResult.skipped} (already in your list)</div>
                  <div>Errors: {importResult.errors.length}</div>

                  {importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-auto text-xs text-red-700">
                      {importResult.errors.map((error) => (
                        <div key={`${error.row}-${error.message}`}>
                          Row {error.row}: {error.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  className="px-4 py-2 border border-black bg-white font-mono text-sm rounded-none"
                  onClick={() => setImportDialogOpen(false)}
                  disabled={isImporting}
                  type="button"
                >
                  close
                </button>

                <button
                  className="px-4 py-2 border border-black bg-black text-white font-mono text-sm rounded-none"
                  onClick={handleConfirmImport}
                  disabled={isImporting || importRows.length === 0 || importMissingHeaders.length > 0 || !!importParseError}
                  type="button"
                >
                  {isImporting ? "importing..." : "confirm import"}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
