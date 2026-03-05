import { useState, useRef, useEffect } from "react";
import { Album } from "@shared/schema";
import { format } from "date-fns";
import { Menu } from "lucide-react";

export type SortOption =
  | "date-added"
  | "alphabetical"
  | "artist"
  | "genre"
  | "custom-order";

export type FilterOption = {
  artist?: string;
  year?: number;
  genre?: string;
};

interface AlbumFilterSortProps {
  onSortChange?: (sort: SortOption) => void;
  onFilterChange?: (filter: FilterOption) => void;
  selectedSort?: SortOption;
  showFilterOptions?: boolean;
  showGenreOnly?: boolean;
  totalCount: number;
  uniqueArtists?: string[];
  uniqueGenres?: string[];
  uniqueYears?: number[];

  triggerStyle?: "boxed" | "text";
  triggerTextClassName?: string;

  hideCustomOrder?: boolean;
}

export function AlbumFilterSort({
  onSortChange,
  onFilterChange,
  selectedSort = "date-added",
  showFilterOptions = false,
  showGenreOnly = false,
  totalCount,
  uniqueArtists = [],
  uniqueGenres = [],
  uniqueYears = [],
  triggerStyle = "boxed",
  triggerTextClassName = "",
  hideCustomOrder = false,
}: AlbumFilterSortProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!isFilterOpen) return;
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isFilterOpen || !showGenreOnly) return;
    const btn = triggerButtonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();

    const popoverWidth = 288; // w-72
    const horizontalNudge = 145; // your tuned value
    const verticalNudge = -18; // your tuned value

    setPopoverPos({
      top: rect.bottom + verticalNudge,
      left: rect.left + rect.width / 2 - popoverWidth / 2 + horizontalNudge,
    });
  }, [isFilterOpen, showGenreOnly]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange?.(e.target.value as SortOption);
  };

  const handleFilterChange = (key: keyof FilterOption, value: any) => {
    const newFilter = { ...filterOptions, [key]: value };
    if (value === "" || value === undefined) delete newFilter[key];
    setFilterOptions(newFilter);
    onFilterChange?.(newFilter);
  };

  const isGenreTrigger =
    showGenreOnly || (uniqueArtists.length === 0 && uniqueYears.length === 0);

  const triggerClassName =
    triggerStyle === "text"
      ? [
          "px-0 py-0",
          "bg-transparent border-0",
          "font-mono text-sm",
          "tracking-wide",
          "active:opacity-80 transition-opacity",
          triggerTextClassName,
        ].join(" ")
      : [
          "whitespace-nowrap px-2 py-1 border border-black",
          isFilterOpen ? "bg-green-300" : "bg-white",
          "text-black font-mono text-xs",
        ].join(" ");

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2 items-center">
        {!showGenreOnly && (
          <select
            data-tutorial="sort-btn"
            value={selectedSort}
            onChange={handleSortChange}
            className="whitespace-nowrap px-3 py-2 border border-black bg-white text-black font-mono text-xs appearance-none rounded-none"
            style={{ borderRadius: 0 }}
          >
            <option value="date-added">date added</option>
            <option value="alphabetical">a-z</option>
            <option value="artist">artist</option>
            <option value="genre">genre</option>
            {!hideCustomOrder && <option value="custom-order">custom order</option>}
          </select>
        )}

        {showFilterOptions && (
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => setIsFilterOpen((v) => !v)}
            className={triggerClassName}
            aria-label={isGenreTrigger ? "genre menu" : "filter"}
            title={isGenreTrigger ? "genre" : "filter"}
          >
            {isGenreTrigger ? <Menu className="w-5 h-5" /> : "filter"}
          </button>
        )}
      </div>

      {/* GENRE-ONLY fixed popover */}
      {isFilterOpen && showFilterOptions && showGenreOnly && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsFilterOpen(false)}
          />
          <div
            className="fixed z-[9999] w-72 border border-black bg-white shadow-lg p-3 pointer-events-auto"
            style={{ top: popoverPos.top, left: popoverPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs">genre</span>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="px-2 py-1 border border-black font-mono text-xs"
              >
                close
              </button>
            </div>

            <div>
              <label className="block font-mono text-xs mb-1">filter</label>
              <select
                value={filterOptions.genre || ""}
                onChange={(e) =>
                  handleFilterChange("genre", e.target.value || undefined)
                }
                className="w-full px-2 py-1 border border-black font-mono text-xs"
              >
                <option value="">all genres</option>
                {uniqueGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] font-mono">
                {totalCount} {totalCount === 1 ? "album" : "albums"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterOptions({});
                  onFilterChange?.({});
                }}
                className="px-2 py-1 border border-black font-mono text-[11px] bg-black text-white"
                disabled={Object.keys(filterOptions).length === 0}
              >
                clear
              </button>
            </div>
          </div>
        </>
      )}

      {/* Full filter modal (non-genre-only) */}
      {isFilterOpen && showFilterOptions && !showGenreOnly && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-[3998]"
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed left-1/2 transform -translate-x-1/2 top-1/4 mt-2 p-4 border border-black bg-white shadow-lg z-[3999] w-80 md:w-[32rem] max-w-[calc(100vw-2rem)]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-mono text-sm">filter albums</h3>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="px-2 py-1 border border-black font-mono text-xs"
              >
                close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {uniqueArtists.length > 0 && (
                <div>
                  <label className="block font-mono text-xs mb-1">artist</label>
                  <select
                    value={filterOptions.artist || ""}
                    onChange={(e) => handleFilterChange("artist", e.target.value)}
                    className="w-full px-2 py-1 border border-black font-mono text-xs"
                  >
                    <option value="">all artists</option>
                    {uniqueArtists.map((artist) => (
                      <option key={artist} value={artist}>
                        {artist}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {uniqueGenres.length > 0 && (
                <div>
                  <label className="block font-mono text-xs mb-1">genre</label>
                  <select
                    value={filterOptions.genre || ""}
                    onChange={(e) =>
                      handleFilterChange("genre", e.target.value || undefined)
                    }
                    className="w-full px-2 py-1 border border-black font-mono text-xs"
                  >
                    <option value="">all genres</option>
                    {uniqueGenres.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {uniqueYears.length > 0 && (
                <div>
                  <label className="block font-mono text-xs mb-1">year</label>
                  <select
                    value={filterOptions.year || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "year",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="w-full px-2 py-1 border border-black font-mono text-xs"
                  >
                    <option value="">all years</option>
                    {uniqueYears
                      .sort((a, b) => b - a)
                      .map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-mono">
                showing {totalCount} {totalCount === 1 ? "album" : "albums"}
                {Object.keys(filterOptions).length > 0 ? " (filtered)" : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterOptions({});
                  onFilterChange?.({});
                }}
                className="px-3 py-1 border border-black font-mono text-xs bg-black text-white"
                disabled={Object.keys(filterOptions).length === 0}
              >
                clear filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function sortAlbums<T extends { album: Album; addedAt: string; rating?: number }>(
  albums: T[],
  sortOption: SortOption
): T[] {
  const sortedAlbums = [...albums];

  switch (sortOption) {
    case "date-added":
      // newest first
      return sortedAlbums.sort(
        (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );

    case "alphabetical":
      return sortedAlbums.sort((a, b) => a.album.name.localeCompare(b.album.name));

    case "artist":
      return sortedAlbums.sort((a, b) => {
        const aArtist = (a.album.artist || "").toLowerCase();
        const bArtist = (b.album.artist || "").toLowerCase();
        if (aArtist !== bArtist) return aArtist.localeCompare(bArtist);
        return a.album.name.localeCompare(b.album.name);
      });

    case "genre":
      return sortedAlbums.sort((a, b) => {
        const aGenre = (a.album.genre || "").toLowerCase();
        const bGenre = (b.album.genre || "").toLowerCase();
        if (aGenre !== bGenre) return aGenre.localeCompare(bGenre);
        // tie-breakers: artist then name
        const aArtist = (a.album.artist || "").toLowerCase();
        const bArtist = (b.album.artist || "").toLowerCase();
        if (aArtist !== bArtist) return aArtist.localeCompare(bArtist);
        return a.album.name.localeCompare(b.album.name);
      });

    case "custom-order":
      return sortedAlbums.sort((a, b) => {
        const aOrder = (a as any).customOrder ?? 999999;
        const bOrder = (b as any).customOrder ?? 999999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      });

    default:
      return sortedAlbums;
  }
}

export function filterAlbums<T extends { album: Album; rating?: number }>(
  albums: T[],
  filter: FilterOption
): T[] {
  return albums.filter((item) => {
    if (filter.artist && item.album.artist !== filter.artist) return false;
    if (filter.genre && item.album.genre !== filter.genre) return false;
    if (filter.year !== undefined && item.album.releaseYear !== filter.year) return false;
    return true;
  });
}

export function groupAlbumsByMonth<
  T extends { reviewedAt?: string; listenedAt?: string | null; addedAt?: string }
>(albums: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  albums.forEach((album) => {
    try {
      const dateStr = album.listenedAt || album.reviewedAt || album.addedAt || "";
      const date = dateStr ? new Date(dateStr) : new Date(0);

      if (!isNaN(date.getTime())) {
        const monthYear = format(date, "MMMM yyyy").toLowerCase();
        if (!grouped[monthYear]) grouped[monthYear] = [];
        grouped[monthYear].push(album);
      } else {
        if (!grouped["unknown date"]) grouped["unknown date"] = [];
        grouped["unknown date"].push(album);
      }
    } catch (error) {
      console.error("Error grouping by month:", error);
      if (!grouped["unknown date"]) grouped["unknown date"] = [];
      grouped["unknown date"].push(album);
    }
  });

  Object.keys(grouped).forEach((monthYear) => {
    grouped[monthYear].sort((a, b) => {
      const dateA = new Date(a.listenedAt || a.reviewedAt || a.addedAt || "");
      const dateB = new Date(b.listenedAt || b.reviewedAt || b.addedAt || "");
      return dateB.getTime() - dateA.getTime();
    });
  });

  return grouped;
}
