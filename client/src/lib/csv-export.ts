/**
 * Utility functions for CSV export and import
 */

/**
 * Interface for album data when importing from CSV
 */
export interface CSVAlbumData {
  artist: string;
  album: string;
  year?: number;
  genre?: string;
}

/**
 * Parses CSV data and returns an array of album objects
 * 
 * @param csvText The CSV text content to parse
 * @returns Array of album objects with artist, album, year, and genre
 */
export function parseCSVToAlbums(csvText: string): CSVAlbumData[] {
  const albums: CSVAlbumData[] = [];
  
  // Split by lines
  const lines = csvText.split(/\r?\n/);
  
  // Get headers from first line
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  
  // Check for required fields
  const artistIndex = headers.indexOf('artist');
  const albumIndex = headers.indexOf('album');
  
  if (artistIndex === -1 || albumIndex === -1) {
    throw new Error('CSV must include "artist" and "album" columns');
  }
  
  // Get indices for optional fields
  const yearIndex = headers.indexOf('year');
  const genreIndex = headers.indexOf('genre');
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    // Parse the CSV line accounting for quoted values with commas
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        // Toggle quote state or add escaped quote
        if (j < line.length - 1 && line[j + 1] === '"') {
          currentValue += '"';
          j++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(currentValue);
        currentValue = '';
      } else {
        // Add character to current value
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    // Create album object
    const album: CSVAlbumData = {
      artist: values[artistIndex]?.replace(/^"|"$/g, '') || '',
      album: values[albumIndex]?.replace(/^"|"$/g, '') || ''
    };
    
    // Add optional fields if present
    if (yearIndex !== -1 && values[yearIndex]) {
      const year = parseInt(values[yearIndex]);
      if (!isNaN(year)) {
        album.year = year;
      }
    }
    
    if (genreIndex !== -1 && values[genreIndex]) {
      album.genre = values[genreIndex]?.replace(/^"|"$/g, '') || '';
    }
    
    // Only add albums with both artist and album name
    if (album.artist && album.album) {
      albums.push(album);
    }
  }
  
  return albums;
}

/**
 * Exports album data to a CSV file and triggers a download
 * 
 * @param albums Array of albums to export
 * @param filename Name of the downloaded file
 * @param includeRatings Whether to include rating information (for the list page)
 * @param includeTopFour Whether to include top four information (for no skips page)
 */
export function exportAlbumsToCSV(
  albums: any[], 
  filename: string = 'albums-export.csv',
  includeRatings: boolean = false,
  includeTopFour: boolean = false
): void {
  // Define headers based on what data to include
  const headers = ['artist', 'album', 'year', 'genre'];
  
  if (includeRatings) {
    headers.push('rating', 'review', 'listened_date');
  }
  
  if (includeTopFour) {
    headers.push('is_top_four', 'top_four_position');
  }
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Process each album
  albums.forEach(album => {
    // Get album data (handle both types of album structures)
    const albumData = album.album || album;
    const releaseYear = albumData.releaseYear || '';
    const genre = albumData.genre || '';
    
    // Basic data for all exports
    let row = [
      // Escape quotes in string fields
      `"${albumData.artist.replace(/"/g, '""')}"`,
      `"${albumData.name.replace(/"/g, '""')}"`,
      releaseYear,
      `"${genre.replace(/"/g, '""')}"`
    ];
    
    // Add rating info if requested
    if (includeRatings) {
      const rating = album.rating || '';
      const review = album.review ? `"${album.review.replace(/"/g, '""')}"` : '';
      const listenedDate = album.listenedAt ? new Date(album.listenedAt).toISOString().split('T')[0] : '';
      
      row.push(rating.toString(), review, listenedDate);
    }
    
    // Add top four info if requested
    if (includeTopFour) {
      const isTopFour = album.isTopFour ? 'true' : 'false';
      const position = album.topFourPosition || '';
      
      row.push(isTopFour, position.toString());
    }
    
    // Add row to CSV content
    csvContent += row.join(',') + '\n';
  });
  
  // Create a download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Set up and trigger download
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}