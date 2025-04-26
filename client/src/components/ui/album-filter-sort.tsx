import { format } from "date-fns";
import { Album } from "@shared/schema";

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

// Keep this for backward compatibility
export type FilterOption = {
  artist?: string;
  year?: number;
  genre?: string;
}

interface AlbumFilterSortProps {
  onSortChange: (sort: SortOption) => void;
  selectedSort: SortOption;
}

export function AlbumFilterSort({
  onSortChange,
  selectedSort = "date-added-newest"
}: AlbumFilterSortProps) {
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value as SortOption);
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
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Sort dropdown - simplified UI with only sorting */}
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
      </div>
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
      return sortedAlbums.sort((a, b) => {
        // Use full release date if available, fall back to release year
        if (a.album.releaseDate && b.album.releaseDate) {
          return new Date(b.album.releaseDate).getTime() - new Date(a.album.releaseDate).getTime();
        } else {
          return (b.album.releaseYear || 0) - (a.album.releaseYear || 0);
        }
      });
    
    case "release-oldest":
      return sortedAlbums.sort((a, b) => {
        // Use full release date if available, fall back to release year
        if (a.album.releaseDate && b.album.releaseDate) {
          return new Date(a.album.releaseDate).getTime() - new Date(b.album.releaseDate).getTime();
        } else {
          return (a.album.releaseYear || 0) - (b.album.releaseYear || 0);
        }
      });
    
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