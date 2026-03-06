function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export default function SpotifySuccessPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center font-mono">
        <p className="text-base font-bold mb-4">Spotify connected successfully! ✓</p>
        <p className="text-sm mb-6">
          {isIOS()
            ? "Close this browser and reopen The Shelf to see the changes."
            : "You can now return to The Shelf."}
        </p>
        {!isIOS() && (
          <a
            href="/"
            className="inline-block px-4 py-2 border border-black bg-green-300 text-sm no-underline"
          >
            Go to The Shelf
          </a>
        )}
      </div>
    </div>
  );
}
