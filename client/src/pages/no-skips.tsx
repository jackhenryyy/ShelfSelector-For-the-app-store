import { useState, useMemo } from "react";
import { useNoSkipsAlbums } from "@/hooks/use-albums";
import {
  useNoSkipsReviews,
  useCreateNoSkipsReview,
  useUpdateNoSkipsReview,
  useDeleteNoSkipsReview,
  NoSkipsReviewWithAlbum,
} from "@/hooks/use-no-skips-reviews";
import { Layout } from "@/components/ui/layout";
import { AlbumArt } from "@/components/ui/album-art";
import { AlbumGrid } from "@/components/ui/album-grid";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchIcon, DownloadIcon, UploadIcon, NotebookPen } from "lucide-react";
import { SimpleReviewPopup } from "@/components/ui/simple-review-popup";
import { exportAlbumsToCSV, parseCSVToAlbums } from "@/lib/csv-export";
import { openInMusicService, generateShareableLink } from "@/lib/spotify";
import { useSpotifyAlbums } from "@/hooks/use-spotify";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useAlbumGenre } from "@/hooks/use-album-genre";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopFourDialog } from "@/components/ui/top-four-dialog";
import { GridScaleSlider } from "@/components/ui/grid-scale-slider";
import {
  AlbumFilterSort,
  SortOption,
  FilterOption,
  filterAlbums,
  sortAlbums,
} from "@/components/ui/album-filter-sort";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableAlbumCard } from "@/components/ui/sortable-album-card";
import { DuplicateAlbumDialog } from "@/components/ui/duplicate-album-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function NoSkipsPage() {
  // Hooks
  const { user } = useAuth();
  const {
    noSkipsAlbums,
    topFourAlbums,
    updateTopFour,
    addToNoSkips,
    removeFromNoSkips,
    isAlbumInNoSkips,
  } = useNoSkipsAlbums();

  const { searchAlbums, searchResults, isSearching } = useSpotifyAlbums();
  const { data: noSkipsReviews } = useNoSkipsReviews();
  const { mutateAsync: createNoSkipsReview } = useCreateNoSkipsReview();
  const { mutateAsync: updateNoSkipsReview } = useUpdateNoSkipsReview();
  const { mutateAsync: deleteNoSkipsReview } = useDeleteNoSkipsReview();

  const queryClient = useQueryClient();
  const updateCustomOrderMutation = useMutation({
    mutationFn: async (albumOrders: { albumId: number; customOrder: number }[]) => {
      return apiRequest("/api/no-skips/custom-order", {
        method: "POST",
        body: JSON.stringify(albumOrders),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/no-skips"] });
    },
  });

  const { updateGenre: updateAlbumGenre } = useAlbumGenre();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const userId = user?.id;

  // State
  const [sortOption, setSortOption] = useState<SortOption>("date-added");
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const [isEditingTopFour, setIsEditingTopFour] = useState(false);
  const [selectedForTopFour, setSelectedForTopFour] = useState<{ albumId: number; position: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topFourDialogOpen, setTopFourDialogOpen] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [gridScale, setGridScale] = useState<number>(3);
  const [activeReview, setActiveReview] = useState<NoSkipsReviewWithAlbum | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [pendingDuplicateAlbum, setPendingDuplicateAlbum] = useState<{ id: number; name: string } | null>(null);

  // Local text search (mirrors Queue page menu)
  const [noSkipsSearchQuery, setNoSkipsSearchQuery] = useState("");

  // Add dialog open states (mirrors Queue behavior: separate mobile/desktop triggers)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [mobileSearchDialogOpen, setMobileSearchDialogOpen] = useState(false);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSortChange = (sort: SortOption) => setSortOption(sort);
  const handleFilterChange = (filter: FilterOption) => setFilterOptions(filter);

  // Unique lists for filters
  const uniqueArtists: string[] = [];
  const uniqueGenres: string[] = [];
  const uniqueYears: number[] = [];

  if (noSkipsAlbums) {
    const artistsSet = new Set<string>();
    const genresSet = new Set<string>();
    const yearsSet = new Set<number>();

    noSkipsAlbums.forEach((a) => {
      if (a.album.artist) artistsSet.add(a.album.artist);
      if (a.album.genre) genresSet.add(a.album.genre);
      if (a.album.releaseYear) yearsSet.add(a.album.releaseYear);
    });

    uniqueArtists.push(...Array.from(artistsSet));
    uniqueGenres.push(...Array.from(genresSet));
    uniqueYears.push(...Array.from(yearsSet));
  }

  // Filter out Top Four + apply filters
  const baseFilteredNoSkipsAlbums = noSkipsAlbums
    ? filterAlbums([...noSkipsAlbums].filter((a) => !a.isTopFour) as any, filterOptions)
    : [];

  // Apply local text search (mirrors Queue page)
  const searchedNoSkipsAlbums = useMemo(() => {
    if (!noSkipsSearchQuery.trim()) return baseFilteredNoSkipsAlbums;

    const q = noSkipsSearchQuery.toLowerCase().trim();
    return baseFilteredNoSkipsAlbums.filter((item: any) => {
      const name = item.album?.name?.toLowerCase() ?? "";
      const artist = item.album?.artist?.toLowerCase() ?? "";
      const genre = (item.album?.genre ?? "").toLowerCase();
      return name.includes(q) || artist.includes(q) || genre.includes(q);
    });
  }, [baseFilteredNoSkipsAlbums, noSkipsSearchQuery]);

  // Sort after filtering/searching
  const sortedNoSkipsAlbums =
    searchedNoSkipsAlbums.length > 0 ? sortAlbums(searchedNoSkipsAlbums as any, sortOption) : [];

  // Drag-and-drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = sortedNoSkipsAlbums.findIndex((a: any) => a.id.toString() === active.id);
      const newIndex = sortedNoSkipsAlbums.findIndex((a: any) => a.id.toString() === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newAlbums = arrayMove(sortedNoSkipsAlbums as any, oldIndex, newIndex);
        const albumOrders = newAlbums.map((album: any, index: number) => ({
          albumId: album.album.id,
          customOrder: index,
        }));
        updateCustomOrderMutation.mutate(albumOrders);
      }
    }
  };

  const handleOpenAlbumInMusicService = (album: { spotifyId?: string | null; appleMusicId?: string | null }) => {
    openInMusicService(album);
  };

  const hasReview = (albumId: number): boolean => {
    return noSkipsReviews?.some((review) => review.albumId === albumId) || false;
  };

  const handleOpenReview = async (albumId: number) => {
    try {
      const response = await fetch(`/api/no-skips-reviews/${albumId}`, { credentials: "include" });

      if (response.ok) {
        const existingReview = await response.json();
        setActiveReview(existingReview);
      } else if (response.status === 404) {
        const albumData = noSkipsAlbums?.find((a) => a.album.id === albumId);
        if (albumData) {
          const newReview: NoSkipsReviewWithAlbum = {
            id: 0,
            userId: user?.id || 0,
            albumId,
            review: "",
            reviewedAt: new Date(),
            album: albumData.album,
          };
          setActiveReview(newReview);
        }
      } else {
        throw new Error(`Failed to check for existing review: ${response.status}`);
      }
    } catch (error) {
      const albumData = noSkipsAlbums?.find((a) => a.album.id === albumId);
      if (albumData) {
        const newReview: NoSkipsReviewWithAlbum = {
          id: 0,
          userId: user?.id || 0,
          albumId,
          review: "",
          reviewedAt: new Date(),
          album: albumData.album,
        };
        setActiveReview(newReview);
      }
    }
  };

  const handleCloseReview = () => setActiveReview(null);

  const handleSaveReview = async (data: { id: number; review: string; genre?: string }) => {
    try {
      if (data.id === 0) {
        await createNoSkipsReview({
          albumId: activeReview?.albumId || 0,
          review: data.review,
        });
      } else {
        await updateNoSkipsReview({
          id: data.id,
          review: data.review,
        });
      }

      setActiveReview(null);
      toast({
        title: "Review saved",
        description: "Your No Skips review has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save review",
        variant: "destructive",
      });
    }
  };

  const handleGenreUpdate = async (albumId: number, genre: string) => {
    try {
      await updateAlbumGenre(albumId, genre);
    } catch (error) {
      console.error("Error updating genre:", error);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      if (!activeReview) return;

      await deleteNoSkipsReview(reviewId);
      await removeFromNoSkips(activeReview.albumId);
      setActiveReview(null);

      toast({
        title: "Review deleted",
        description: "Album has been removed from No Skips.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    if (!userId) {
      toast({
        title: "Sharing error",
        description: "Unable to generate a share link. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    const shareableLink = generateShareableLink(userId);

    if (navigator.share) {
      navigator
        .share({
          title: "My No Skips Collection",
          text: "Check out my No Skips album collection",
          url: shareableLink,
        })
        .catch(() => copyToClipboard(shareableLink));
    } else {
      copyToClipboard(shareableLink);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Link copied to clipboard",
          description: "Share this link with friends to show them your No Skips collection",
        });
      })
      .catch(() => {
        toast({
          title: "Couldn't copy automatically",
          description: `Your shareable link is: ${text}`,
          variant: "destructive",
        });
      });
  };

  const handleTopFourDialogSave = (selections: { albumId: number; position: number }[]) => {
    updateTopFour(selections);
    toast({
      title: "Top 4 updated",
      description: "Your Top 4 albums have been updated",
    });
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) searchAlbums(searchQuery);
  };

  const handleAddToNoSkips = (albumId: number, albumName?: string) => {
    if (isAlbumInNoSkips(albumId)) {
      const album = searchResults.find((a) => a.id === albumId);
      setPendingDuplicateAlbum({ id: albumId, name: albumName || album?.name || "This album" });
      setDuplicateDialogOpen(true);
      return;
    }

    addToNoSkips({ albumId, isTopFour: false });
    toast({
      title: "Album added",
      description: "Album has been added to your No Skips collection",
    });

    setSearchDialogOpen(false);
    setMobileSearchDialogOpen(false);
    setSearchQuery("");
  };

  const handleConfirmDuplicate = () => {
    if (!pendingDuplicateAlbum) return;

    addToNoSkips({ albumId: pendingDuplicateAlbum.id, isTopFour: false });
    toast({
      title: "Album added",
      description: "Album has been added to your No Skips collection",
    });

    setPendingDuplicateAlbum(null);
    setSearchDialogOpen(false);
    setMobileSearchDialogOpen(false);
    setSearchQuery("");
  };

  const handleRemoveFromNoSkips = (albumId: number) => {
    removeFromNoSkips(albumId);
    toast({
      title: "Album removed",
      description: "Album has been removed from your No Skips collection",
    });
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
            await addToNoSkips({ albumId: results[0].id, isTopFour: false });
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
        description: `Successfully added ${addedCount} albums to your No Skips collection. ${failedCount} albums failed.`,
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

  // Mobile/desktop add buttons (mirrors Queue styling)
  const MobileAlbumSearchButton = () => (
    <button
      className="whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs"
      onClick={() => setMobileSearchDialogOpen(true)}
      type="button"
    >
      + add
    </button>
  );

  const DesktopAlbumSearchButton = () => (
    <button
      className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm"
      onClick={() => setSearchDialogOpen(true)}
      type="button"
    >
      + add album
    </button>
  );

  return (
    <Layout title="no skips" subtitle="">
      {/* IMPORTANT: match Queue pattern: fixed header area + scrollable content area */}
      <div className="p-3 pt-0 h-full overflow-hidden flex flex-col">
        {/* Header / menu (non-scrolling) */}
        <div className="shrink-0">
          {/* TOP MENU (mirrors Queue) */}
          <div className="flex flex-col mb-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-black/60">
                {sortedNoSkipsAlbums.length} albums{" "}
                {noSkipsSearchQuery && `(filtered from ${baseFilteredNoSkipsAlbums.length})`}
              </div>

              {/* Mobile controls */}
              <div className="flex items-center gap-2 sm:hidden">
                <AlbumFilterSort
                  onSortChange={handleSortChange}
                  onFilterChange={handleFilterChange}
                  selectedSort={sortOption}
                  showFilterOptions={true}
                  totalCount={sortedNoSkipsAlbums.length}
                  uniqueArtists={uniqueArtists}
                  uniqueGenres={uniqueGenres}
                  uniqueYears={uniqueYears}
                />

                <div className="relative flex-1 max-w-32">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={noSkipsSearchQuery}
                    onChange={(e) => setNoSkipsSearchQuery(e.target.value)}
                    className="w-full px-2 py-1 border border-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <MobileAlbumSearchButton />
              </div>

              {/* Desktop controls */}
              <div className="hidden sm:flex items-center justify-between w-full">
                <div className="flex gap-2">
                  <AlbumFilterSort
                    onSortChange={handleSortChange}
                    onFilterChange={handleFilterChange}
                    selectedSort={sortOption}
                    showFilterOptions={true}
                    totalCount={sortedNoSkipsAlbums.length}
                    uniqueArtists={uniqueArtists}
                    uniqueGenres={uniqueGenres}
                    uniqueYears={uniqueYears}
                  />

                  <label
                    htmlFor="csv-upload-no-skips"
                    className="whitespace-nowrap px-4 py-1 border border-black bg-white font-mono text-sm cursor-pointer flex items-center gap-1"
                    title="Import from CSV"
                  >
                    <UploadIcon className="h-4 w-4" />
                    import csv
                  </label>
                  <input
                    id="csv-upload-no-skips"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => exportAlbumsToCSV(noSkipsAlbums || [], "no-skips-export.csv", false, true)}
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
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search no skips..."
                      value={noSkipsSearchQuery}
                      onChange={(e) => setNoSkipsSearchQuery(e.target.value)}
                      className="px-4 py-1 border border-black font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black w-40"
                    />
                  </div>
                  <DesktopAlbumSearchButton />
                </div>
              </div>
            </div>

            {/* Mobile secondary controls */}
            {isMobile && (
              <div className="flex gap-2 justify-between mt-2 sm:hidden">
                <label
                  htmlFor="csv-upload-no-skips-mobile"
                  className="flex-1 whitespace-nowrap px-2 py-1 border border-black bg-white font-mono text-xs cursor-pointer flex items-center justify-center gap-1"
                  title="Import from CSV"
                >
                  <UploadIcon className="h-3 w-3" />
                  import
                </label>
                <input
                  id="csv-upload-no-skips-mobile"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => exportAlbumsToCSV(noSkipsAlbums || [], "no-skips-export.csv", false, true)}
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

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-24">
          {/* TOP 4 widget */}
          <div className="flex justify-center mb-4">
            <div className="bg-white border border-black">
              <div className="flex items-center justify-center gap-3 px-4 py-3">
                <span className="font-mono text-sm text-black/70 whitespace-nowrap">top 4</span>
                <div className="flex gap-2">
                  {topFourAlbums && topFourAlbums.length > 0
                    ? topFourAlbums
                        .sort((a, b) => (a.topFourPosition || 0) - (b.topFourPosition || 0))
                        .slice(0, 4)
                        .map((album) => (
                          <button
                            key={album.id}
                            onClick={() => handleOpenReview(album.album.id)}
                            className="hover:opacity-80 transition-opacity"
                            title={`${album.album.name} by ${album.album.artist}`}
                            type="button"
                          >
                            <AlbumArt
                              src={album.album.imageUrl}
                              alt={album.album.name}
                              size="small"
                              className="w-10 h-10 rounded"
                            />
                          </button>
                        ))
                    : null}

                  {topFourAlbums &&
                    Array.from({ length: 4 - Math.min(topFourAlbums.length, 4) }).map((_, index) => (
                      <div key={`empty-${index}`} className="w-10 h-10 bg-gray-100 rounded border border-gray-200" />
                    ))}
                </div>
                <button
                  className="text-xs text-gray-500 hover:text-black ml-2"
                  onClick={() => setTopFourDialogOpen(true)}
                  title="Edit top 4"
                  type="button"
                >
                  edit
                </button>
              </div>
            </div>
          </div>

          {/* Share */}
          <div className={`flex items-center justify-center gap-2 ${isMobile ? "mt-3" : "mt-4"} mb-4`}>
            <button
              onClick={handleShare}
              className="text-xs text-gray-500 hover:text-black flex items-center gap-1"
              title="Share your collection with others"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3"
              >
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              share collection
            </button>
          </div>

          <h2 className={`${isMobile ? "text-xs" : "text-sm"} font-medium mb-2 text-black`}>albums</h2>

          {/* Albums grid */}
          {sortOption === "custom-order" ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={sortedNoSkipsAlbums.map((a: any) => a.id.toString())}
                strategy={rectSortingStrategy}
              >
                <AlbumGrid columns={gridScale}>
                  {sortedNoSkipsAlbums.map((album: any) => (
                    <SortableAlbumCard
                      key={album.id}
                      id={album.id.toString()}
                      album={album.album}
                      gridScale={gridScale}
                      isDragMode={true}
                      hasReview={hasReview(album.album.id)}
                      onRemove={() => handleRemoveFromNoSkips(album.albumId)}
                      onReview={() => handleOpenReview(album.album.id)}
                      isEditingTopFour={isEditingTopFour}
                      isSelectedForTopFour={selectedForTopFour.some((item) => item.albumId === album.albumId)}
                      onSelectForTopFour={() => {}}
                    />
                  ))}
                </AlbumGrid>
              </SortableContext>
            </DndContext>
          ) : (
            <AlbumGrid columns={gridScale}>
              {sortedNoSkipsAlbums.map((album: any) => (
                <div key={album.id} className="mb-2">
                  <div className="relative group">
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenReview(album.album.id);
                      }}
                      className="block cursor-pointer"
                    >
                      <AlbumArt src={album.album.imageUrl} alt={album.album.name} />
                    </div>

                    {hasReview(album.album.id) && (
                      <div className="absolute top-2 left-2 bg-black w-5 h-5 flex items-center justify-center">
                        <NotebookPen className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <button
                      className="absolute top-2 right-2 bg-black bg-opacity-75 w-6 h-6 flex items-center justify-center text-white hover:bg-opacity-90 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveFromNoSkips(album.albumId);
                      }}
                      title="Remove from No Skips"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>

                  {gridScale < 5 && (
                    <>
                      <div className="mt-1 text-xs truncate">{album.album.name}</div>
                      <div className="text-xs text-gray-500 truncate">{album.album.artist}</div>
                      <div className="mt-1 text-xs text-gray-500">{album.album.genre || "no genre"}</div>
                    </>
                  )}
                </div>
              ))}
            </AlbumGrid>
          )}
        </div>

        {/* Dialogs/popups OUTSIDE the scroll container for stability */}
        <TopFourDialog
          open={topFourDialogOpen}
          onOpenChange={setTopFourDialogOpen}
          allAlbums={noSkipsAlbums || []}
          currentTopFour={topFourAlbums || []}
          onSave={handleTopFourDialogSave}
        />

        {/* Add Album dialogs */}
        <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
          <DialogContent className="md:max-w-md w-[calc(100%-2rem)]">
            <DialogTitle className="font-mono">Add an album</DialogTitle>

            <div className="flex items-center gap-2 mt-4">
              <input
                placeholder="Search albums..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
                className="w-full p-2 border border-black font-mono text-sm"
              />
              <button
                className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
                onClick={handleSearchSubmit}
                disabled={isSearching}
                type="button"
              >
                <SearchIcon className="h-4 w-4 mr-1" />
                {isSearching ? "..." : "Search"}
              </button>
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="mt-4 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                  {searchResults.map((album) => (
                    <div key={album.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div className="flex items-center gap-2">
                        <AlbumArt src={album.imageUrl} alt={album.name} size="small" />
                        <div>
                          <div className="font-mono text-sm">{album.name}</div>
                          <div className="font-mono text-xs text-gray-500">{album.artist}</div>
                        </div>
                      </div>
                      <button
                        className="px-3 py-1 border border-black bg-white text-black font-mono text-xs"
                        onClick={() => handleAddToNoSkips(album.id, album.name)}
                        type="button"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={mobileSearchDialogOpen} onOpenChange={setMobileSearchDialogOpen}>
          <DialogContent className="md:max-w-md w-[calc(100%-2rem)]">
            <DialogTitle className="font-mono">Add an album</DialogTitle>

            <div className="flex items-center gap-2 mt-4">
              <input
                placeholder="Search albums..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit(e)}
                className="w-full p-2 border border-black font-mono text-sm"
              />
              <button
                className="whitespace-nowrap px-4 py-2 border border-black bg-black text-white font-mono text-sm flex items-center"
                onClick={handleSearchSubmit}
                disabled={isSearching}
                type="button"
              >
                <SearchIcon className="h-4 w-4 mr-1" />
                {isSearching ? "..." : "Search"}
              </button>
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="mt-4 max-h-80 overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                  {searchResults.map((album) => (
                    <div key={album.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div className="flex items-center gap-2">
                        <AlbumArt src={album.imageUrl} alt={album.name} size="small" />
                        <div>
                          <div className="font-mono text-sm">{album.name}</div>
                          <div className="font-mono text-xs text-gray-500">{album.artist}</div>
                        </div>
                      </div>
                      <button
                        className="px-3 py-1 border border-black bg-white text-black font-mono text-xs"
                        onClick={() => handleAddToNoSkips(album.id, album.name)}
                        type="button"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Review Popup */}
        <SimpleReviewPopup
          review={activeReview}
          isOpen={!!activeReview}
          onClose={handleCloseReview}
          onSave={handleSaveReview}
          onDelete={handleDeleteReview}
          onGenreUpdate={handleGenreUpdate}
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
          sectionName="No Skips"
        />
      </div>
    </Layout>
  );
}
