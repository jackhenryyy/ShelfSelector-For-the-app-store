import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewPopup } from "@/components/ui/review-popup";
import { ListShareDialog } from "@/components/ui/list-share-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { openInMusicService } from "@/lib/spotify";
import { MenuIcon, DownloadIcon } from "lucide-react";
import { AlbumReview } from "@/hooks/use-albums";
import { exportAlbumsToCSV } from "@/lib/csv-export";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";

import { 
  AlbumFilterSort, 
  SortOption, 
  FilterOption, 
  sortAlbums, 
  filterAlbums, 
  groupAlbumsByMonth 
} from "@/components/ui/album-filter-sort";

export default function ListPage() {
  const { albumReviews, searchReviews, updateReview, deleteReview } = useAlbumReviews();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredReviews, setFilteredReviews] = useState<AlbumReview[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeReview, setActiveReview] = useState<AlbumReview | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-added-newest");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
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
    "listened_date"
  ];
  
  // Update filtered reviews when albums or search changes
  useEffect(() => {
    if (!albumReviews) return;
    
    if (!searchQuery.trim()) {
      let sortedReviews = [...albumReviews];
      
      // Apply sorting
      sortedReviews = sortAlbums(sortedReviews, sortOption);
      
      // Apply filtering
      sortedReviews = filterAlbums(sortedReviews, filterOptions);
      
      setFilteredReviews(sortedReviews);
    } else {
      handleSearch();
    }
  }, [albumReviews, searchQuery, sortOption, filterOptions]);
  
  // Function to handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      if (albumReviews) {
        const sortedReviews = sortAlbums(albumReviews, sortOption);
        setFilteredReviews(sortedReviews);
      }
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchReviews(searchQuery);
      const sortedResults = sortAlbums(results, sortOption);
      setFilteredReviews(sortedResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Function to open album in music service
  const handleOpenAlbumInMusicService = (album: { spotifyId?: string | null; appleMusicId?: string | null }) => {
    openInMusicService(album);
  };
  
  // Function to open review popup
  const handleOpenReview = (review: AlbumReview) => {
    setActiveReview(review);
  };
  
  // Function to close review popup
  const handleCloseReview = () => {
    setActiveReview(null);
  };
  
  // Function to save edited review
  const handleSaveReview = (reviewData: {
    id: number;
    rating: number;
    review: string;
    listenedAt?: Date;
  }) => {
    updateReview(reviewData);
  };

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
        setImportRows(result.data || []);
        setImportPreview((result.data || []).slice(0, 10));
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
      }
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
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
    } catch (error) {
      setImportParseError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  };

  // Get unique artists, genres, and years for filters
  const uniqueArtists = albumReviews 
    ? [...new Set(albumReviews.map(r => r.album.artist))]
    : [];
    
  const uniqueGenres = albumReviews
    ? [...new Set(albumReviews.map(r => r.album.genre).filter(Boolean))]
    : [];
    
  const uniqueYears = albumReviews
    ? [...new Set(albumReviews.map(r => r.album.releaseYear).filter(Boolean))]
    : [];

  // Group the reviews by month/year if not searching
  const groupedReviews = !searchQuery
    ? groupAlbumsByMonth(filteredReviews)
    : { "search results": filteredReviews };
    
  // Helper function to get day from date string
  // Use listenedAt if available, otherwise fall back to reviewedAt
  const getDay = (review: AlbumReview) => {
    try {
      // Use listenedAt if it exists, otherwise fall back to reviewedAt
      const dateStr = review.listenedAt || review.reviewedAt;
      const date = new Date(dateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "--";
      }
      
      return date.getDate();
    } catch (error) {
      console.error("Error parsing date for day extraction:", error);
      return "--";
    }
  };

  // Sort the month-year keys in reverse chronological order
  const sortedMonthYearKeys = Object.keys(groupedReviews).sort((a, b) => {
    // For search results, always show at the top
    if (a === "search results") return -1;
    if (b === "search results") return 1;
    
    // For unknown date, always show at the bottom
    if (a === "unknown date") return 1;
    if (b === "unknown date") return -1;
    
    console.log("Sorting months:", a, b);
    
    // Parse month names to numbers for proper sorting
    const monthsOrder: Record<string, number> = {
      "january": 0, "february": 1, "march": 2, "april": 3, "may": 4, "june": 5,
      "july": 6, "august": 7, "september": 8, "october": 9, "november": 10, "december": 11
    };
    
    try {
      // Extract month and year from the key (format: "month year")
      const [monthA, yearA] = a.split(" ");
      const [monthB, yearB] = b.split(" ");
      
      // Compare years first
      const yearDiff = parseInt(yearB) - parseInt(yearA);
      if (yearDiff !== 0) return yearDiff;
      
      // If same year, compare months
      return monthsOrder[monthB.toLowerCase()] - monthsOrder[monthA.toLowerCase()];
    } catch (error) {
      console.error("Error sorting month-year keys:", error);
      return 0;
    }
  });

  return (
    <Layout
      title="the list"
      subtitle=""
    >
      <div className="p-4 pt-0">
        <div className="mb-1 font-mono text-xs text-black/60">
          {filteredReviews.length} albums
        </div>
        <div className="flex justify-between items-center mb-4">
          {/* Filter and Sort Controls */}
          <AlbumFilterSort
            onSortChange={setSortOption}
            onFilterChange={setFilterOptions}
            selectedSort={sortOption}
            showFilterOptions={true}
            totalCount={filteredReviews.length}
            uniqueArtists={uniqueArtists}
            uniqueGenres={uniqueGenres}
            uniqueYears={uniqueYears}
          />
          
          {/* Share and Export Buttons */}
          <div className="flex gap-2">
            <ListShareDialog />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm flex items-center gap-1"
              title="Import from CSV"
              data-testid="button-import-csv"
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
              onClick={() => exportAlbumsToCSV(filteredReviews, 'the-shelf-export.csv', true)}
              className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm flex items-center gap-1"
              title="Export to CSV"
              data-testid="button-export-csv"
            >
              <DownloadIcon className="h-4 w-4" />
              export csv
            </button>
          </div>
        </div>
        
        <div className="space-y-6">
          {isSearching ? (
            <div className="text-center py-8 font-mono">Searching...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-8 font-mono">
              {searchQuery ? "No reviews match your search" : "No reviews yet"}
            </div>
          ) : (
            sortedMonthYearKeys.map(monthYear => (
              <div key={monthYear}>
                {/* Month-Year Header */}
                <div className="bg-gray-200 py-2 px-4 mb-4 font-mono text-sm">
                  {monthYear}
                </div>
                
                {/* Reviews for this month */}
                <div className="space-y-4">
                  {groupedReviews[monthYear].map((review, index) => (
                    <div key={review.id} className="flex gap-3">
                      {/* Day Number in Box */}
                      <div className="w-10 h-10 min-w-[40px] flex items-center justify-center border border-black aspect-square">
                        <div className="font-mono text-sm">{getDay(review)}</div>
                      </div>
                      
                      {/* Album Art */}
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleOpenAlbumInMusicService(review.album);
                        }}
                      >
                        <AlbumArt
                          src={review.album.imageUrl}
                          alt={review.album.name}
                          size="small"
                        />
                      </a>
                      
                      {/* Album Details */}
                      <div className="flex-grow">
                        <h3 className="font-mono text-sm">{review.album.name}</h3>
                        <p className="font-mono text-xs text-black/60 mt-0.5">{review.album.artist}</p>
                      </div>
                      
                      {/* Rating and Menu Button */}
                      <div className="flex items-center gap-3">
                        <StarRating value={parseFloat(review.rating.toString())} size="medium" readonly />
                        <button 
                          className="text-black/60 hover:text-black"
                          onClick={() => handleOpenReview(review)}
                        >
                          <MenuIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Review Popup */}
      <ReviewPopup
        review={activeReview}
        isOpen={!!activeReview}
        onClose={handleCloseReview}
        onSave={handleSaveReview}
        onDelete={deleteReview}
        onGenreUpdate={async (albumId: number, genre: string) => {
          // Handle genre update for list page if needed
          console.log('Genre update requested for album', albumId, 'to', genre);
        }}
      />

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetImportState();
          }
          setImportDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-mono">import csv</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 font-mono text-sm">
            <div className="text-black/70">
              {importFileName ? `File: ${importFileName}` : "No file selected"}
            </div>
            <div className="text-black/70">
              {importRows.length} rows detected
            </div>
            {importMissingHeaders.length > 0 && (
              <div className="text-red-600">
                Missing headers: {importMissingHeaders.join(", ")}
              </div>
            )}
            {importParseError && (
              <div className="text-red-600">
                {importParseError}
              </div>
            )}
            <div className="border border-black/10">
              <div className="px-3 py-2 border-b border-black/10 bg-gray-100">
                Preview (first 10 rows)
              </div>
              <div className="max-h-64 overflow-auto">
  <table className="w-full text-left text-xs table-fixed">
    <thead className="bg-white sticky top-0">
      <tr className="border-b border-black/10">
        <th className="px-2 py-2 w-[140px]">artist</th>
        <th className="px-2 py-2 w-[180px]">album</th>
        <th className="px-2 py-2 w-[70px]">year</th>
        <th className="px-2 py-2 w-[120px]">genre</th>
        <th className="px-2 py-2 w-[80px]">rating</th>
        <th className="px-2 py-2 w-[140px]">listened_date</th>
        <th className="px-2 py-2">review</th>
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
            <td className="px-2 py-2">{row?.listened_date || ""}</td>
            <td className="px-2 py-2 whitespace-pre-wrap break-words text-black/80">
              {row?.review || ""}
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
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
          </div>
          <DialogFooter className="gap-2">
            <button
              className="px-4 py-1 border border-black bg-white font-mono text-sm"
              onClick={() => setImportDialogOpen(false)}
              disabled={isImporting}
            >
              close
            </button>
            <button
              className="px-4 py-1 border border-black bg-black text-white font-mono text-sm"
              onClick={handleConfirmImport}
              disabled={
                isImporting ||
                importRows.length === 0 ||
                importMissingHeaders.length > 0 ||
                !!importParseError
              }
            >
              {isImporting ? "importing..." : "confirm import"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
