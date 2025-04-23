/**
 * Utility functions for CSV export
 */

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