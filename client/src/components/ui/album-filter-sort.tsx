import { useState, useRef, useEffect } from "react";
import { Album } from "@shared/schema";
import { format } from "date-fns";

export type SortOption = 
  | "date-added-newest" 
  | "date-added-oldest" 
  | "listened-newest" 
  | "listened-oldest" 
  | "reviewed-newest" 
  | "reviewed-oldest" 
  | "release-newest"
  | "release-oldest"
  | "title-asc" 
  | "title-desc" 
  | "artist-asc" 
  | "artist-desc"
  | "year-newest"
  | "year-oldest"
  | "rating-highest"
  | "rating-lowest"
  | "energy-highest"
  | "energy-lowest";

export type FilterOption = {
  artist?: string;
  year?: number;
  genre?: string;
}

interface AlbumFilterSortProps {
  onSortChange: (sort: SortOption) => void;
  onFilterChange?: (filter: FilterOption) => void;
  selectedSort: SortOption;
  showFilterOptions?: boolean;
  totalCount: number;
  uniqueArtists?: string[];
  uniqueGenres?: string[];
  uniqueYears?: number[];
}

export function AlbumFilterSort({
  onSortChange,
  onFilterChange,
  selectedSort = "date-added-newest",
  showFilterOptions = false,
  totalCount,
  uniqueArtists = [],
  uniqueGenres = [],
  uniqueYears = []
}: AlbumFilterSortProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOption>({});
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value as SortOption);
  };

  const handleFilterChange = (key: keyof FilterOption, value: any) => {
    const newFilter = { ...filterOptions, [key]: value };
    
    // If value is empty, remove the filter
    if (value === "" || value === undefined) {
      delete newFilter[key];
    }
    
    setFilterOptions(newFilter);
    onFilterChange?.(newFilter);
  };

  // Build sort options with readable labels
  const sortOptions = [
    { value: "listened-newest", label: "listened date (newest)" },
    { value: "listened-oldest", label: "listened date (oldest)" },
    { value: "release-newest", label: "release date (newest)" },
    { value: "release-oldest", label: "release date (oldest)" },
    { value: "date-added-newest", label: "date added (newest)" },
    { value: "date-added-oldest", label: "date added (oldest)" },
    { value: "reviewed-newest", label: "reviewed date (newest)" },
    { value: "reviewed-oldest", label: "reviewed date (oldest)" },
    { value: "title-asc", label: "title (a-z)" },
    { value: "title-desc", label: "title (z-a)" },
    { value: "artist-asc", label: "artist (a-z)" },
    { value: "artist-desc", label: "artist (z-a)" },
    { value: "rating-highest", label: "rating (highest)" },
    { value: "rating-lowest", label: "rating (lowest)" }
  ];

  return (
    <div className="relative" ref={filterRef}>
      <div className="flex items-center gap-2">
        {/* Sort dropdown */}
        <select
          value={selectedSort}
          onChange={handleSortChange}
          className="px-2 py-1 border border-black font-mono text-sm"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Filter button */}
        {showFilterOptions && (
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`whitespace-nowrap px-4 py-1 border border-black ${isFilterOpen ? 'bg-green-300' : 'bg-white'} text-black font-mono text-sm`}
          >
            {uniqueArtists.length === 0 && uniqueYears.length === 0 ? 'genre' : 'filter'}{isFilterOpen ? 'ing' : ''}
          </button>
        )}
      </div>
      
      {isFilterOpen && showFilterOptions && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsFilterOpen(false)}
          />
          <div className="fixed left-1/2 transform -translate-x-1/2 top-1/4 mt-2 p-4 border border-black bg-white shadow-lg z-50 w-80 md:w-[32rem] max-w-[calc(100vw-2rem)]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-mono text-sm">filter albums</h3>
              <button 
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
                    {uniqueArtists.map(artist => (
                      <option key={artist} value={artist}>{artist}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {uniqueGenres.length > 0 && (
                <div>
                  <label className="block font-mono text-xs mb-1">genre</label>
                  <select 
                    value={filterOptions.genre || ""}
                    onChange={(e) => handleFilterChange("genre", e.target.value || undefined)}
                    className="w-full px-2 py-1 border border-black font-mono text-xs"
                  >
                    <option value="">all genres</option>
                    {uniqueGenres.map(genre => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {uniqueYears.length > 0 && (
                <div>
                  <label className="block font-mono text-xs mb-1">year</label>
                  <select 
                    value={filterOptions.year || ""}
                    onChange={(e) => handleFilterChange("year", e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-2 py-1 border border-black font-mono text-xs"
                  >
                    <option value="">all years</option>
                    {uniqueYears
                      .sort((a, b) => b - a)
                      .map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-mono">
                showing {totalCount} {totalCount === 1 ? 'album' : 'albums'}
                {Object.keys(filterOptions).length > 0 ? ' (filtered)' : ''}
              </span>
              <button 
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

// Utility functions for sorting and filtering
export function sortAlbums<T extends { album: Album; addedAt?: string; reviewedAt?: string; listenedAt?: string | null; rating?: number }>(
  albums: T[], 
  sortOption: SortOption
): T[] {
  const sortedAlbums = [...albums];
  
  // Helper function to safely compare dates
  const compareDates = (dateA: string | undefined | null, dateB: string | undefined | null): number => {
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1; // null dates go last when sorting newest to oldest
    if (!dateB) return -1;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  };
  
  switch (sortOption) {
    case "date-added-newest":
      return sortedAlbums.sort((a, b) => compareDates(a.addedAt, b.addedAt) * -1);
    
    case "date-added-oldest":
      return sortedAlbums.sort((a, b) => compareDates(a.addedAt, b.addedAt));
    
    case "listened-newest":
      return sortedAlbums.sort((a, b) => compareDates(a.listenedAt, b.listenedAt) * -1);
    
    case "listened-oldest":
      return sortedAlbums.sort((a, b) => compareDates(a.listenedAt, b.listenedAt));
    
    case "reviewed-newest":
      return sortedAlbums.sort((a, b) => compareDates(a.reviewedAt, b.reviewedAt) * -1);
    
    case "reviewed-oldest":
      return sortedAlbums.sort((a, b) => compareDates(a.reviewedAt, b.reviewedAt));
    
    case "release-newest":
      return sortedAlbums.sort((a, b) => (b.album.releaseYear || 0) - (a.album.releaseYear || 0));
    
    case "release-oldest":
      return sortedAlbums.sort((a, b) => (a.album.releaseYear || 0) - (b.album.releaseYear || 0));
    
    case "title-asc":
      return sortedAlbums.sort((a, b) => a.album.name.localeCompare(b.album.name));
    
    case "title-desc":
      return sortedAlbums.sort((a, b) => b.album.name.localeCompare(a.album.name));
    
    case "artist-asc":
      return sortedAlbums.sort((a, b) => a.album.artist.localeCompare(b.album.artist));
    
    case "artist-desc":
      return sortedAlbums.sort((a, b) => b.album.artist.localeCompare(a.album.artist));
    
    case "year-newest":
      return sortedAlbums.sort((a, b) => (b.album.releaseYear || 0) - (a.album.releaseYear || 0));
    
    case "year-oldest":
      return sortedAlbums.sort((a, b) => (a.album.releaseYear || 0) - (b.album.releaseYear || 0));
    
    case "rating-highest":
      return sortedAlbums.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    case "rating-lowest":
      return sortedAlbums.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    
    case "energy-highest":
      return sortedAlbums.sort((a, b) => {
        const energyMap = { 'high': 3, 'medium': 2, 'low': 1 };
        const aEnergy = a.album.energyLevel ? energyMap[a.album.energyLevel as 'high' | 'medium' | 'low'] || 0 : 0;
        const bEnergy = b.album.energyLevel ? energyMap[b.album.energyLevel as 'high' | 'medium' | 'low'] || 0 : 0;
        return bEnergy - aEnergy;
      });
    
    case "energy-lowest":
      return sortedAlbums.sort((a, b) => {
        const energyMap = { 'high': 3, 'medium': 2, 'low': 1 };
        const aEnergy = a.album.energyLevel ? energyMap[a.album.energyLevel as 'high' | 'medium' | 'low'] || 0 : 0;
        const bEnergy = b.album.energyLevel ? energyMap[b.album.energyLevel as 'high' | 'medium' | 'low'] || 0 : 0;
        return aEnergy - bEnergy;
      });
    
    default:
      return sortedAlbums;
  }
}

export function filterAlbums<T extends { album: Album; rating?: number }>(
  albums: T[],
  filter: FilterOption
): T[] {
  return albums.filter(item => {
    // Filter by artist if specified
    if (filter.artist && item.album.artist !== filter.artist) {
      return false;
    }
    
    // Filter by genre if specified
    if (filter.genre && item.album.genre !== filter.genre) {
      return false;
    }
    
    // Filter by year if specified
    if (filter.year !== undefined && item.album.releaseYear !== filter.year) {
      return false;
    }
    
    return true;
  });
}

// Helper for grouping albums by listened date (month and year) for reviews
export function groupAlbumsByMonth<T extends { listenedAt?: string | null, addedAt?: string, reviewedAt?: string }>(
  albums: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  albums.forEach(album => {
    try {
      // Try to use dates in order of preference: listenedAt, reviewedAt, addedAt
      const dateStr = album.listenedAt || album.reviewedAt || album.addedAt || '';
      const date = new Date(dateStr);
      
      // Check if date is valid before formatting
      if (dateStr && !isNaN(date.getTime())) {
        const monthYear = format(date, "MMMM yyyy").toLowerCase(); // e.g., "april 2025"
        
        if (!grouped[monthYear]) {
          grouped[monthYear] = [];
        }
        
        grouped[monthYear].push(album);
      } else {
        // For invalid dates, place in "recently added" group instead of "unknown date"
        if (!grouped["recently added"]) {
          grouped["recently added"] = [];
        }
        
        grouped["recently added"].push(album);
      }
    } catch (error) {
      // In case of date parsing errors, place in "recently added" group
      if (!grouped["recently added"]) {
        grouped["recently added"] = [];
      }
      
      grouped["recently added"].push(album);
    }
  });
  
  return grouped;
}