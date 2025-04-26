// This file contains placeholder paths for album covers
// We'll use these for the rotating background on the landing page
// In production, these should be replaced with actual album covers

// For now, we'll use placeholder URLs that point to sample album art
// You can replace these with your own album covers in client/src/assets/album-covers/
export const albumCovers = [
  "https://i.scdn.co/image/ab67616d0000b273c93ff0d9913ca14ba3c54f12", // Sample album 1
  "https://i.scdn.co/image/ab67616d0000b273c634cd65ba525a56904e94bd", // Sample album 2
  "https://i.scdn.co/image/ab67616d0000b273a108e07c661f9fc54de9c43a", // Sample album 3
  "https://i.scdn.co/image/ab67616d0000b2732fee51d077222b593baf3744", // Sample album 4
  "https://i.scdn.co/image/ab67616d0000b2736feb6d9ed7891f40e9a524dd", // Sample album 5
];

// When the user provides actual album covers, we can update this list to use them
// For example:
// export const albumCovers = [
//   import.meta.url(new URL("../assets/album-covers/album1.jpg", import.meta.url)),
//   import.meta.url(new URL("../assets/album-covers/album2.jpg", import.meta.url)),
// ];