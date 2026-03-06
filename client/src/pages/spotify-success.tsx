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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center font-mono">
        {checking ? (
          <p className="text-sm text-black/60">verifying connection...</p>
        ) : verified ? (
          <>
            <p className="text-base font-bold mb-4">Spotify connected successfully! ✓</p>
            <p className="text-sm mb-6">
              To complete setup, fully close The Shelf app and reopen it.
            </p>
            {!isIOS() && (
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
              onClick={(e) => {
                // Try to extract uid from current session for retry
                e.preventDefault();
                fetch("/api/user", { credentials: "include" })
                  .then(res => res.ok ? res.json() : null)
                  .then(u => {
                    window.location.href = `/api/spotify/auth${u?.id ? `?uid=${u.id}` : ""}`;
                  })
                  .catch(() => {
                    window.location.href = "/api/spotify/auth";
                  });
              }}
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
