import { useState } from "react";
import { Album } from "@shared/schema";
import { format } from "date-fns";

export type SortOption = 
  | "date-added-newest" 
  | "date-added-oldest" 
  | "title-asc" 
  | "title-desc" 
  | "artist-asc" 
  | "artist-desc"
  | "year-newest"
  | "year-oldest"
  | "rating-highest"
  | "rating-lowest";

export type FilterOption = {
  artist?: string;
  year?: number | null;
  genre?: string | null;
  rating?: number;
}

interface AlbumFilterSortProps {
  onSortChange: (sort: SortOption) => void;
  onFilterChange?: (filter: FilterOption) => void;
  selectedSort: SortOption;
  showFilterOptions?: boolean;
  totalCount: number;
  uniqueArtists?: string[];
  uniqueGenres?: (string | null)[];
  uniqueYears?: (number | null)[];
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

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center">
        <div className="font-mono text-xs text-black/60">
          {totalCount} album{totalCount !== 1 ? 's' : ''}
        </div>
        
        <div className="flex gap-2">
          {showFilterOptions && (
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-3 py-1 border border-black font-mono text-xs"
            >
              filter
            </button>
          )}
          
          <select 
            value={selectedSort}
            onChange={handleSortChange}
            className="px-3 py-1 border border-black font-mono text-xs appearance-none bg-white"
          >
            <option value="date-added-newest">newest first</option>
            <option value="date-added-oldest">oldest first</option>
            <option value="title-asc">title a-z</option>
            <option value="title-desc">title z-a</option>
            <option value="artist-asc">artist a-z</option>
            <option value="artist-desc">artist z-a</option>
            <option value="year-newest">year (newest)</option>
            <option value="year-oldest">year (oldest)</option>
            <option value="rating-highest">rating (highest)</option>
            <option value="rating-lowest">rating (lowest)</option>
          </select>
        </div>
      </div>
      
      {isFilterOpen && showFilterOptions && (
        <div className="mt-3 p-3 border border-black bg-white/90">
          <h3 className="font-mono text-sm mb-2">filter albums</h3>
          
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
                  onChange={(e) => handleFilterChange("genre", e.target.value || null)}
                  className="w-full px-2 py-1 border border-black font-mono text-xs"
                >
                  <option value="">all genres</option>
                  {uniqueGenres
                    .filter(genre => genre !== null)
                    .map(genre => (
                      <option key={genre} value={genre || ""}>{genre}</option>
                    ))
                  }
                </select>
              </div>
            )}
            
            {uniqueYears.length > 0 && (
              <div>
                <label className="block font-mono text-xs mb-1">year</label>
                <select 
                  value={filterOptions.year || ""}
                  onChange={(e) => handleFilterChange("year", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-1 border border-black font-mono text-xs"
                >
                  <option value="">all years</option>
                  {uniqueYears
                    .filter(year => year !== null)
                    .sort((a, b) => (b || 0) - (a || 0))
                    .map(year => (
                      <option key={year} value={year || ""}>{year}</option>
                    ))
                  }
                </select>
              </div>
            )}
            
            <div>
              <label className="block font-mono text-xs mb-1">rating</label>
              <select 
                value={filterOptions.rating || ""}
                onChange={(e) => handleFilterChange("rating", e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-2 py-1 border border-black font-mono text-xs"
              >
                <option value="">all ratings</option>
                <option value="5">★★★★★</option>
                <option value="4">★★★★☆ or higher</option>
                <option value="3">★★★☆☆ or higher</option>
                <option value="2">★★☆☆☆ or higher</option>
                <option value="1">★☆☆☆☆ or higher</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setFilterOptions({});
              onFilterChange?.({});
            }}
            className="mt-3 px-3 py-1 border border-black font-mono text-xs bg-black text-white"
          >
            clear filters
          </button>
        </div>
      )}
    </div>
  );
}

// Utility functions for sorting and filtering
export function sortAlbums<T extends { album: Album; addedAt: string; rating?: number }>(
  albums: T[], 
  sortOption: SortOption
): T[] {
  const sortedAlbums = [...albums];
  
  switch (sortOption) {
    case "date-added-newest":
      return sortedAlbums.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    
    case "date-added-oldest":
      return sortedAlbums.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
    
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
    
    // Filter by minimum rating if specified
    if (filter.rating !== undefined && (item.rating === undefined || item.rating < filter.rating)) {
      return false;
    }
    
    return true;
  });
}

// Helper for grouping albums by date added (month and year)
export function groupAlbumsByMonth<T extends { addedAt: string }>(
  albums: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  
  albums.forEach(album => {
    try {
      // Safely parse the date - using try/catch to handle invalid dates
      const date = new Date(album.addedAt);
      
      // Check if date is valid before formatting
      if (!isNaN(date.getTime())) {
        const monthYear = format(date, "MMMM yyyy"); // e.g., "April 2025"
        
        if (!grouped[monthYear]) {
          grouped[monthYear] = [];
        }
        
        grouped[monthYear].push(album);
      } else {
        // For invalid dates, place in "Unknown date" group
        if (!grouped["Unknown date"]) {
          grouped["Unknown date"] = [];
        }
        
        grouped["Unknown date"].push(album);
      }
    } catch (error) {
      // In case of date parsing errors, place in "Unknown date" group
      if (!grouped["Unknown date"]) {
        grouped["Unknown date"] = [];
      }
      
      grouped["Unknown date"].push(album);
    }
  });
  
  return grouped;
}