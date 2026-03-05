import { useEffect, useState } from "react";

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export default function SpotifySuccessPage() {
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Verify the connection actually worked by refreshing the session
    fetch("/api/user", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((user) => {
        setVerified(!!user?.accessToken);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    // Only attempt deep link on iOS
    if (!checking && verified && isIOS()) {
      window.location.href = "theshelf://spotify-connected";
    }
  }, [checking, verified]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center font-mono">
        {checking ? (
          <p className="text-sm text-black/60">verifying connection...</p>
        ) : verified ? (
          <>
            <p className="text-2xl mb-2">&#10003;</p>
            <p className="text-sm font-bold mb-4">Spotify connected successfully!</p>
            {isIOS() ? (
              <>
                <a
                  href="theshelf://spotify-connected"
                  className="inline-block px-4 py-2 border border-black bg-green-300 text-sm no-underline mb-4"
                >
                  Return to app
                </a>
                <p className="text-xs text-black/50">
                  You can close this tab and return to The Shelf app
                </p>
              </>
            ) : (
              <a
                href="/"
                className="inline-block px-4 py-2 border border-black bg-green-300 text-sm no-underline"
              >
                Go to The Shelf
              </a>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-bold mb-4">Something went wrong connecting Spotify.</p>
            <a
              href="/api/spotify/auth"
              className="inline-block px-4 py-2 border border-black bg-green-300 text-sm no-underline mb-2"
            >
              Try again
            </a>
          </>
        )}
      </div>
    </div>
  );
}
