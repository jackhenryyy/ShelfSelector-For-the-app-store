import { useEffect } from "react";

export default function SpotifySuccessPage() {
  useEffect(() => {
    // Attempt deep link back into the native app
    window.location.href = "theshelf://spotify-connected";
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center font-mono">
        <p className="text-sm font-bold mb-4">Spotify connected successfully!</p>
        <a
          href="theshelf://spotify-connected"
          className="inline-block px-4 py-2 border border-black bg-green-300 text-sm no-underline mb-4"
        >
          Return to app
        </a>
        <p className="text-xs text-black/50">
          You can close this tab and return to The Shelf app
        </p>
      </div>
    </div>
  );
}
