import { useState, useEffect, useMemo } from "react";
import { useSpotifyAlbums } from "@/hooks/use-spotify";
import { useQueueAlbums, useNoSkipsAlbums, useAlbumReviews } from "@/hooks/use-albums";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { openInMusicService } from "@/lib/spotify";
import { UploadIcon, DownloadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { AlbumDetailsDialog } from "@/components/ui/album-details-dialog";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { SearchDialog } from "@/components/ui/search-dialog";
import { DuplicateAlbumDialog } from "@/components/ui/duplicate-album-dialog";
import {
  AlbumFilterSort,
  SortOption,
  FilterOption,
  sortAlbums,
  filterAlbums,
} from "@/components/ui/album-filter-sort";
import { exportAlbumsToCSV, parseCSVToAlbums } from "@/lib/csv-export";

export default function QueuePage() {
  const { searchAlbums } = useSpotifyAlbums();
  const { queueAlbums, addToQueue, removeFromQueue, isAlbumInQueue } = useQueueAlbums();
  const { addToNoSkips } = useNoSkipsAlbums();
  const { createReview } = useAlbumReviews();
  const { updateGenre } = useAlbumGenre();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [queueSearchQuery, setQueueSearchQuery] = useState("");

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);

  // FIX: SortOption must match AlbumFilterSort ("date-added" | "alphabetical" | "custom-order")
  const [sortOption, setSortOption] = useState<SortOption>("date-added");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});

  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [gridScale, setGridScale] = useState<number>(3);

  // Uniques for filters
  const uniqueArtists: string[] = [];
  const uniqueGenres: string[] = [];
  const uniqueYears: number[] = [];

  if (queueAlbums) {
    const artistsSet = new Set<string>();
    const genresSet = new Set<string>();
    const yearsSet = new Set<number>();

    queueAlbums.forEach((a) => {
      if (a.album.artist) artistsSet.add(a.album.artist);
      if (a.album.genre) genresSet.add(a.album.genre);
      if (a.album.releaseYear) yearsSet.add(a.album.releaseYear);
    });

    uniqueArtists.push(...Array.from(artistsSet));
    uniqueGenres.push(...Array.from(genresSet));
    uniqueYears.push(...Array.from(yearsSet));
  }

  // FIX: compute filtered+searched+sorted in a predictable order
  const filteredQueueAlbums = useMemo(() => {
    if (!queueAlbums) return [];

    // filter
    let processed: any[] = filterAlbums([...queueAlbums] as any, filterOptions) as any;

    // text search
    const q = queueSearchQuery.trim().toLowerCase();
    if (q) {
      processed = processed.filter((item) => {
        const name = item.album?.name?.toLowerCase() ?? "";
        const artist = item.album?.artist?.toLowerCase() ?? "";
        const genre = (item.album?.genre ?? "").toLowerCase();
        return name.includes(q) || artist.includes(q) || genre.includes(q);
      });
    }

    // sort (Queue does NOT use custom order, but keep it safe)
    const safeSort: SortOption = sortOption === "custom-order" ? "date-added" : sortOption;
    processed = sortAlbums(processed as any, safeSort) as any;

    return processed;
  }, [queueAlbums, filterOptions, queueSearchQuery, sortOption]);

  const handlePlayInMusicService = (album: { spotifyId?: string | null; appleMusicId?: string | null }) => {
    openInMusicService(album);
  };

  const handleOpenDetailsDialog = (albumId: number) => {
    const album = queueAlbums?.find((qa) => qa.albumId === albumId)?.album;
    if (album) {
      setSelectedAlbum(album);
      setDetailsDialogOpen(true);
    }
  };

  const handleSaveReview = async (data: {
    albumId: number;
    rating: number;
    review?: string;
    listenedAt?: Date;
    genre?: string;
  }) => {
    try {
      await createReview({
        albumId: data.albumId,
        rating: data.rating,
        review: data.review || "",
        listenedAt: data.listenedAt,
      });

      removeFromQueue(data.albumId);

      toast({
        title: "Review submitted",
        description: "Album has been added to your list and removed from your queue",
      });

      setSelectedAlbum(null);
      setDetailsDialogOpen(false);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Review failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGenre = async (albumId: number, genre: string) => {
    try {
      await updateGenre(albumId, genre);
    } catch (error) {
      console.error("Error updating genre:", error);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  if (!searchQuery.trim()) return;

  setIsSearching(true);
  try {
    const results = await searchAlbums(searchQuery);
    setSearchResults(results);
  } catch (error) {
    console.error("Search error:", error);
    toast({
      title: "Search failed",
      description: "Please try again",
      variant: "destructive",
    });
  } finally {
    setIsSearching(false);
  }
};

  const handleAddToQueue = (albumId: number, albumName?: string) => {
    if (isAlbumInQueue(albumId)) {
      const album = searchResults.find((a) => a.id === albumId);
      setPendingDuplicateAlbum({ id: albumId, name: albumName || album?.name || "This album" });
      setDuplicateDialogOpen(true);
      return;
    }

    addToQueue(albumId);

    toast({
      title: "Added to queue",
      description: "Album added to your queue",
    });

    setSearchQuery("");
    setSearchResults([]);
    setSearchDialogOpen(false);
    setMobileSearchDialogOpen(false);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCsvUploading(true);

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const albumsToAdd = parseCSVToAlbums(text);

      toast({
        title: "Processing CSV",
        description: `Found ${albumsToAdd.length} albums to import...`,
      });

      let addedCount = 0;
      let failedCount = 0;

      for (const albumData of albumsToAdd) {
        try {
          const q = `${albumData.artist} ${albumData.album}`;
          const results = await searchAlbums(q);

          if (results && results.length > 0) {
            await addToQueue(results[0].id);
            addedCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      toast({
        title: "CSV Import Complete",
        description: `Added ${addedCount} albums. ${failedCount} failed.`,
      });
    } catch (error) {
      toast({
        title: "CSV Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCsvUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleExportCSV = () => {
    if (!filteredQueueAlbums || filteredQueueAlbums.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Your queue is empty",
        variant: "destructive",
      });
      return;
    }
    exportAlbumsToCSV(filteredQueueAlbums, "queue-export.csv", true, false);
  };

  // Dialogs + duplicates
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [mobileSearchDialogOpen, setMobileSearchDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingDuplicateAlbum, setPendingDuplicateAlbum] = useState<{ id: number; name: string } | null>(null);

  const handleConfirmDuplicate = () => {
    if (!pendingDuplicateAlbum) return;
    addToQueue(pendingDuplicateAlbum.id);
    toast({ title: "Added to queue", description: "Album added to your queue" });
    setPendingDuplicateAlbum(null);
    setSearchDialogOpen(false);
    setMobileSearchDialogOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <Layout title="the queue" subtitle="">
      {/* FIX: make page a column and only scroll the grid */}
      <div className="p-3 pt-0 h-[100dvh] overflow-hidden flex flex-col">
        {/* TOP MENU (non-scrolling) */}
        <div className="shrink-0">
          <div className="flex flex-col mb-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-black/60">
                {filteredQueueAlbums.length} albums{" "}
                {queueSearchQuery && `(filtered from ${queueAlbums?.length || 0})`}
              </div>

              {/* Mobile controls */}
              <div className="flex items-center gap-2 sm:hidden">
                <AlbumFilterSort
                  onSortChange={setSortOption}
                  onFilterChange={setFilterOptions}
                  selectedSort={sortOption}
                  showFilterOptions={true}
                  totalCount={filteredQueueAlbums.length}
                  uniqueArtists={uniqueArtists}
                  uniqueGenres={uniqueGenres}
                  uniqueYears={uniqueYears}
                  hideCustomOrder={true}
                />

                <div className="relative flex-1 max-w-32">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    className="w-full px-2 py-1 border border-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <button
                  className="whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs"
                  onClick={() => setMobileSearchDialogOpen(true)}
                >
                  + add
                </button>
              </div>

              {/* Desktop controls */}
              <div className="hidden sm:flex items-center justify-between w-full">
                <div className="flex gap-2">
                  <AlbumFilterSort
                    onSortChange={setSortOption}
                    onFilterChange={setFilterOptions}
                    selectedSort={sortOption}
                    showFilterOptions={true}
                    totalCount={filteredQueueAlbums.length}
                    uniqueArtists={uniqueArtists}
                    uniqueGenres={uniqueGenres}
                    uniqueYears={uniqueYears}
                    hideCustomOrder={true}
                  />

                  <label
                    htmlFor="csv-upload"
                    className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm cursor-pointer flex items-center gap-1"
                    title="Import from CSV"
                  >
                    <UploadIcon className="h-4 w-4" />
                    import csv
                  </label>
                  <input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />

                  <button
                    onClick={handleExportCSV}
                    className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm flex items-center gap-1"
                    title="Export to CSV"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    export csv
                  </button>

                  <div className="px-2 border-l border-black ml-2">
                    <GridScaleSlider value={gridScale} onChange={setGridScale} min={1} max={12} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search queue..."
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    className="px-4 py-1 border border-black font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black w-40"
                  />
                  <button
                    className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm"
                    onClick={() => setSearchDialogOpen(true)}
                  >
                    + add album
                  </button>
                </div>
              </div>
            </div>

            {isMobile && (
              <div className="flex gap-2 justify-between mt-2 sm:hidden">
                <label
                  htmlFor="csv-upload-mobile"
                  className="flex-1 whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs cursor-pointer flex items-center justify-center gap-1"
                  title="Import from CSV"
                >
                  <UploadIcon className="h-3 w-3" />
                  import
                </label>
                <input id="csv-upload-mobile" type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />

                <button
                  onClick={handleExportCSV}
                  className="flex-1 whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs cursor-pointer flex items-center justify-center gap-1"
                  title="Export to CSV"
                >
                  <DownloadIcon className="h-3 w-3" />
                  export
                </button>

                <div className="flex-1 flex items-center justify-center px-2 border border-black">
                  <GridScaleSlider value={gridScale} onChange={setGridScale} min={1} max={12} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SCROLL AREA (only this scrolls) */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-24">
          <AlbumGrid columns={gridScale}>
            {filteredQueueAlbums.map((queueAlbum: any) => (
              <div key={queueAlbum.id} className="mb-2">
                <div className="relative group">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleOpenDetailsDialog(queueAlbum.albumId);
                    }}
                    className="block"
                  >
                    <AlbumArt src={queueAlbum.album.imageUrl} alt={queueAlbum.album.name} />
                  </a>

                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[5] pointer-events-none">
                    <button
                      className="absolute top-2 right-2 bg-transparent text-white hover:text-gray-300 text-sm font-bold pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeFromQueue(queueAlbum.albumId);
                      }}
                      title="Remove from Queue"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {gridScale < 5 && (
                  <div className="mt-1">
                    <div className="text-xs truncate">{queueAlbum.album.name}</div>
                    <div className="text-xs text-gray-500 truncate">{queueAlbum.album.artist}</div>
                    {queueAlbum.album.genre && (
                      <div className="text-xs text-gray-400 truncate font-mono">{queueAlbum.album.genre}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </AlbumGrid>
        </div>

        {/* Album Details Dialog */}
        {selectedAlbum && (
          <AlbumDetailsDialog
            isOpen={detailsDialogOpen}
            onClose={() => setDetailsDialogOpen(false)}
            album={selectedAlbum}
            onSave={handleSaveReview}
            onUpdateGenre={handleUpdateGenre}
          />
        )}

        {/* Search dialogs */}
       <SearchDialog
  open={searchDialogOpen}
  onOpenChange={setSearchDialogOpen}
  searchQuery={searchQuery}
  onSearchQueryChange={setSearchQuery}
  onSearch={handleSearch}
  searchResults={searchResults}
  isSearching={isSearching}
  onAddAlbum={(albumId) => handleAddToQueue(albumId)}
  dialogTitle="Add an album"
  addButtonText="Add"
/>

<SearchDialog
  open={mobileSearchDialogOpen}
  onOpenChange={setMobileSearchDialogOpen}
  searchQuery={searchQuery}
  onSearchQueryChange={setSearchQuery}
  onSearch={handleSearch}
  searchResults={searchResults}
  isSearching={isSearching}
  onAddAlbum={(albumId) => handleAddToQueue(albumId)}
  dialogTitle="Add an album"
  addButtonText="Add"
  mobile={true}
/>

        {/* Duplicate Album Dialog */}
        <DuplicateAlbumDialog
          isOpen={duplicateDialogOpen}
          onClose={() => {
            setDuplicateDialogOpen(false);
            setPendingDuplicateAlbum(null);
          }}
          onConfirm={handleConfirmDuplicate}
          albumName={pendingDuplicateAlbum?.name || ""}
          sectionName="Queue"
        />
      </div>
    </Layout>
  );
}
