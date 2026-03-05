import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/ui/layout";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
}

interface SpotifyTrackItem {
  track: {
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    preview_url: string | null;
    external_urls: { spotify: string };
  } | null;
}

interface Track {
  name: string;
  artist: string;
  album: string;
  artwork: string;
  preview: string;
  spotifyUrl: string;
}

interface AlbumSlot {
  name: string;
  artist: string;
  artwork: string;
}

// ─── iTunes helpers ─────────────────────────────────────────────────────────

let jsonpCounter = 0;
function jsonpFetch(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const name = `cb_${jsonpCounter++}_${Date.now()}`;
    const s = document.createElement("script");
    const cleanup = () => { delete (window as any)[name]; s.remove(); };
    (window as any)[name] = (d: any) => { cleanup(); resolve(d); };
    s.onerror = () => { cleanup(); reject(new Error("failed")); };
    s.src = `${url}&callback=${name}`;
    document.head.appendChild(s);
    setTimeout(() => { if ((window as any)[name]) { cleanup(); reject(new Error("timeout")); } }, 10000);
  });
}
async function itunesSearch(query: string, entity = "song", limit = 5): Promise<any[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=${entity}&limit=${limit}`;
  try { const d = await jsonpFetch(url); return d.results || []; }
  catch { try { const r = await fetch(url); const d = await r.json(); return d.results || []; } catch { return []; } }
}
async function itunesLookup(id: string): Promise<any> {
  const url = `https://itunes.apple.com/lookup?id=${id}`;
  try { const d = await jsonpFetch(url); return d.results?.[0] || null; }
  catch { try { const r = await fetch(url); const d = await r.json(); return d.results?.[0] || null; } catch { return null; } }
}
function parseItunesId(link: string) {
  const m = link.match(/[?&]i=(\d+)/); if (m) return { type: "song", id: m[1] };
  const a = link.match(/\/album\/[^/]+\/(\d+)/); if (a) return { type: "album", id: a[1] };
  const b = link.match(/id(\d+)/); if (b) return { type: "unknown", id: b[1] };
  return null;
}

// ─── Pyramid row calculator ───────────────────────────────────────────────────
function calcRows(count: number): number[] {
  const rows: number[] = [];
  let total = 0, size = 1;
  while (total < count) { const n = Math.min(size, count - total); rows.push(n); total += n; size += 2; }
  return rows;
}

// ─── Responsive tile size calculator ─────────────────────────────────────────
function calcTileSize(containerWidth: number, rows: number[], desiredBase: number, desiredFirst: number): { base: number; first: number } {
  if (!containerWidth || rows.length === 0) return { base: desiredBase, first: desiredFirst };
  const maxItems = Math.max(...rows);
  const gap = 4; // gap-1 = 4px
  const maxBase = Math.floor((containerWidth - (maxItems - 1) * gap) / maxItems);
  const base = Math.min(desiredBase, maxBase);
  const first = Math.min(desiredFirst, Math.floor(base * 1.5));
  return { base, first };
}

// ─── API helper ───────────────────────────────────────────────────────────────
async function apiRequest(method: string, path: string, body?: any) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── iTunes preview cache ─────────────────────────────────────────────────────
const previewCache = new Map<string, string>();

async function getItunesPreview(name: string, artist: string): Promise<string> {
  const key = `${name}|||${artist}`;
  if (previewCache.has(key)) return previewCache.get(key)!;

  const results = await itunesSearch(`${name} ${artist}`, "song", 3);
  const preview = results[0]?.previewUrl || "";
  previewCache.set(key, preview);
  return preview;
}

// ─── Splash Page (year picker) ────────────────────────────────────────────────
export default function Top25Page() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAppleMusic = user?.musicService === "apple_music";

  const { data: showcases } = useQuery({
    queryKey: ["/api/top25"],
    queryFn: () => apiRequest("GET", "/api/top25"),
    enabled: !isAppleMusic,
  });

  // Spotify-only gate
  if (isAppleMusic) {
    return (
      <Layout hideNav={false}>
        <div className="h-full flex items-center justify-center px-4">
          <div className="text-center">
            <p className="font-mono text-sm mb-4">top 25 is only available for spotify users</p>
            <button
              onClick={() => setLocation("/")}
              className="px-4 py-2 border border-black bg-white font-mono text-sm hover:opacity-80"
            >
              ← back to shelf
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const [addYearInput, setAddYearInput] = useState("");

  const currentYear = new Date().getFullYear();
  const list = Array.isArray(showcases) ? showcases : [];
  const savedYears: number[] = list.map((s: any) => s.year);
  const [extraYears, setExtraYears] = useState<number[]>([]);
  const allYears = Array.from(new Set([currentYear, ...savedYears, ...extraYears])).sort((a, b) => b - a);

  function handleAddYear() {
    const yr = parseInt(addYearInput);
    if (yr && yr >= 1950 && yr <= currentYear && !allYears.includes(yr)) {
      setExtraYears(prev => [...prev, yr]);
    }
    setAddYearInput("");
  }

  return (
    <Layout hideNav={false}>
      <div className="h-full overflow-y-auto px-4 pb-24">
        <div className="max-w-md mx-auto pt-4">
          <h1 className="text-base font-bold tracking-widest text-center mb-6">TOP 25</h1>
          <div className="grid grid-cols-2 gap-3">
            {allYears.map(year => {
              const saved = savedYears.includes(year);
              return (
                <button
                  key={year}
                  onClick={() => setLocation(`/top25/${year}`)}
                  className={`py-6 border font-mono text-lg tracking-wider transition-colors ${
                    saved
                      ? "border-black bg-green-300 hover:bg-green-400"
                      : "border-black bg-white hover:bg-gray-50"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4">
            <input
              type="number"
              value={addYearInput}
              onChange={e => setAddYearInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddYear()}
              placeholder="add a year..."
              min={1950}
              max={currentYear}
              className="flex-1 px-3 py-2 border border-black font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              onClick={handleAddYear}
              className="px-4 py-2 border border-black bg-white font-mono text-sm hover:opacity-80"
            >
              + add
            </button>
          </div>

          <p className="text-center text-xs text-black/50 mt-3 font-mono">
            {savedYears.length > 0
              ? "green = saved · click any year to edit"
              : "click a year to start building"}
          </p>
        </div>
      </div>
    </Layout>
  );
}

// ─── Year Editor Page ─────────────────────────────────────────────────────────
export function Top25YearPage({ params }: { params: { year: string } }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const year = parseInt(params.year) || new Date().getFullYear();

  // Spotify-only gate
  if (user?.musicService === "apple_music") {
    return (
      <Layout hideNav={false}>
        <div className="h-full flex items-center justify-center px-4">
          <div className="text-center">
            <p className="font-mono text-sm mb-4">top 25 is only available for spotify users</p>
            <button
              onClick={() => setLocation("/")}
              className="px-4 py-2 border border-black bg-white font-mono text-sm hover:opacity-80"
            >
              ← back to shelf
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const [view, setView] = useState<"pick" | "building" | "showcase">("pick");
  const [buildStatus, setBuildStatus] = useState("");

  const [titleInput, setTitleInput] = useState("");
  const [showcaseTitle, setShowcaseTitle] = useState("my top 25");
  const [showSongs, setShowSongs] = useState(true);
  const [showAlbums, setShowAlbums] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<(AlbumSlot | null)[]>(Array(10).fill(null));
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState<string | null>(null);
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const pyramidRef = useRef<HTMLDivElement>(null);
  const pyramidWrapRef = useRef<HTMLDivElement>(null);
  const [pyramidHeight, setPyramidHeight] = useState(0);
  const [pyramidWidth, setPyramidWidth] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentPlaying, setCurrentPlaying] = useState<number | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{ name: string; artist: string } | null>(null);

  const [fixModal, setFixModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [fixQuery, setFixQuery] = useState("");
  const [fixResults, setFixResults] = useState<any[]>([]);
  const [fixLink, setFixLink] = useState("");
  const [fixHint, setFixHint] = useState("");
  const fixTimer = useRef<ReturnType<typeof setTimeout>>();

  const [albumModal, setAlbumModal] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
  const [albumQuery, setAlbumQuery] = useState("");
  const [albumResults, setAlbumResults] = useState<any[]>([]);
  const [albumHint, setAlbumHint] = useState("");
  const albumTimer = useRef<ReturnType<typeof setTimeout>>();

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // ── Fetch playlists ───────────────────────────────────────────────────────
  const { data: playlistsData, isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ["/api/spotify/playlists"],
    queryFn: () => apiRequest("GET", "/api/spotify/playlists"),
    enabled: !!user?.accessToken,
    retry: false,
  });

  // ── Load existing showcase for this year on mount ────────────────────────
  useEffect(() => {
    apiRequest("GET", `/api/top25/${year}`)
      .then((showcase) => {
        setSavedToken(showcase.token);
        setShowcaseTitle(showcase.title);
        setTitleInput(showcase.title);
        setShowSongs(showcase.showSongs);
        setShowAlbums(showcase.showAlbums);
        setTracks(JSON.parse(showcase.tracksJson || "[]"));
        setAlbums(JSON.parse(showcase.albumsJson || "[]"));
        setSpotifyPlaylistUrl(showcase.spotifyPlaylistUrl || null);
        setView("showcase");
      })
      .catch(() => {});
  }, [year]);

  // ── Measure pyramid height to sync album strip ──────────────────────────
  useEffect(() => {
    if (!pyramidRef.current) return;
    const obs = new ResizeObserver(([entry]) => setPyramidHeight(entry.contentRect.height));
    obs.observe(pyramidRef.current);
    return () => obs.disconnect();
  }, [view, showSongs, tracks.length]);

  // ── Measure pyramid container width for responsive tile sizing ─────────
  useEffect(() => {
    if (!pyramidWrapRef.current) return;
    const obs = new ResizeObserver(([entry]) => setPyramidWidth(entry.contentRect.width));
    obs.observe(pyramidWrapRef.current);
    return () => obs.disconnect();
  }, [view, showSongs, tracks.length]);

  // ── Context menu dismiss ──────────────────────────────────────────────────
  useEffect(() => {
    const h = () => setCtxMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // ── Audio ─────────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    setCurrentPlaying(null);
    setNowPlaying(null);
  }, []);

  const playTrack = useCallback(async (i: number, list: Track[]) => {
    const t = list[i];
    if (!t) return;
    if (currentPlaying === i) { stopAudio(); return; }
    stopAudio();
    setCurrentPlaying(i);
    setNowPlaying({ name: t.name, artist: t.artist });

    // Use stored preview if available, otherwise fetch from iTunes
    const preview = t.preview || await getItunesPreview(t.name, t.artist);
    if (!preview) {
      showToast("no preview available");
      setCurrentPlaying(null);
      setNowPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = preview;
      audioRef.current.play().catch(() => {});
    }
  }, [currentPlaying, stopAudio, showToast]);

  // ── Build from playlist ───────────────────────────────────────────────────
  async function buildFromPlaylist(playlist: SpotifyPlaylist) {
    setView("building");
    const title = titleInput.trim() || playlist.name;
    setShowcaseTitle(title);
    setBuildStatus(`loading tracks from "${playlist.name}"...`);

    let data: { items: SpotifyTrackItem[] };
    try {
      data = await apiRequest("GET", `/api/spotify/playlists/${playlist.id}/tracks`);
    } catch {
      setBuildStatus("failed to load playlist — try again");
      setTimeout(() => setView("pick"), 2000);
      return;
    }

    const raw = data.items
      .filter(i => i.track !== null)
      .slice(0, 50)
      .reverse()
      .slice(0, 25);

    if (!raw.length) { setBuildStatus("no tracks found in this playlist"); setTimeout(() => setView("pick"), 2000); return; }

    const initialTracks: Track[] = raw.map(item => ({
      name: item.track!.name,
      artist: item.track!.artists.map(a => a.name).join(", "),
      album: item.track!.album.name,
      artwork: item.track!.album.images[0]?.url || "",
      preview: item.track!.preview_url || "",
      spotifyUrl: item.track!.external_urls.spotify,
    }));

    setTracks(initialTracks);
    setAlbums(Array(10).fill(null));
    setSpotifyPlaylistUrl(`https://open.spotify.com/playlist/${playlist.id}`);
    setSavedToken(null);
    setView("showcase");
    showToast("showcase ready!");
  }

  // ── Save showcase ─────────────────────────────────────────────────────────
  async function handleSave() {
    setIsSaving(true);
    try {
      const showcase = await apiRequest("POST", "/api/top25", {
        year,
        title: showcaseTitle,
        tracksJson: tracks,
        albumsJson: albums,
        showSongs,
        showAlbums,
        spotifyPlaylistUrl,
      });
      setSavedToken(showcase.token);
      const url = `${window.location.origin}/shared/top25/${showcase.token}`;
      setShareUrl(url);
      queryClient.invalidateQueries({ queryKey: ["/api/top25"] });
    } catch {
      showToast("save failed — try again");
    }
    setIsSaving(false);
  }

  // ── Fix song modal ────────────────────────────────────────────────────────
  function openFixModal(index: number) {
    const t = tracks[index];
    setFixModal({ open: true, index });
    setFixQuery(`${t.name} ${t.artist}`);
    setFixResults([]);
    setFixLink("");
    setFixHint("searching...");
    setCtxMenu(null);
    itunesSearch(`${t.name} ${t.artist}`, "song", 8).then(res => {
      setFixResults(res);
      setFixHint(res.length ? "" : "no results found");
    });
  }

  function handleFixQueryChange(q: string) {
    setFixQuery(q);
    clearTimeout(fixTimer.current);
    if (!q.trim()) { setFixResults([]); setFixHint("type to search"); return; }
    setFixHint("searching...");
    fixTimer.current = setTimeout(async () => {
      const res = await itunesSearch(q, "song", 8);
      setFixResults(res);
      setFixHint(res.length ? "" : "no results found");
    }, 400);
  }

  function selectFixResult(r: any) {
    if (fixModal.index === null) return;
    setTracks(prev => prev.map((t, i) => i === fixModal.index ? {
      ...t,
      artwork: (r.artworkUrl100 || "").replace("100x100bb", "300x300bb"),
      preview: r.previewUrl || "",
    } : t));
    // Update cache with new preview
    const t = tracks[fixModal.index];
    if (t && r.previewUrl) previewCache.set(`${t.name}|||${t.artist}`, r.previewUrl);
    else if (t) previewCache.delete(`${t.name}|||${t.artist}`);
    showToast(`updated #${fixModal.index + 1}`);
    setFixModal({ open: false, index: null });
  }

  async function applyFixLink() {
    const parsed = parseItunesId(fixLink.trim());
    if (!parsed) { showToast("invalid link"); return; }
    setFixHint("loading...");
    const result = await itunesLookup(parsed.id);
    if (result?.wrapperType === "track") selectFixResult(result);
    else { showToast("couldn't find song"); setFixHint("try searching instead"); }
  }

  // ── Album modal ───────────────────────────────────────────────────────────
  function openAlbumModal(index: number) {
    setAlbumModal({ open: true, index });
    setAlbumQuery(""); setAlbumResults([]);
    setAlbumHint("type to search");
  }

  function handleAlbumQueryChange(q: string) {
    setAlbumQuery(q);
    clearTimeout(albumTimer.current);
    if (!q.trim()) { setAlbumResults([]); setAlbumHint("type to search"); return; }
    setAlbumHint("searching...");
    albumTimer.current = setTimeout(async () => {
      try {
        const results = await apiRequest("GET", `/api/spotify/albums/search?query=${encodeURIComponent(q)}`);
        setAlbumResults(Array.isArray(results) ? results.slice(0, 10) : []);
        setAlbumHint(results.length ? "" : "no albums found");
      } catch {
        setAlbumResults([]);
        setAlbumHint("search failed — try again");
      }
    }, 400);
  }

  function selectAlbumResult(r: any) {
    if (albumModal.index === null) return;
    setAlbums(prev => prev.map((a, i) => i === albumModal.index ? {
      name: r.name,
      artist: r.artist,
      artwork: r.imageUrl || "",
    } : a));
    showToast(`added #${albumModal.index + 1}`);
    setAlbumModal({ open: false, index: null });
  }

  const hasSpotify = !!user?.accessToken;
  const playlists: SpotifyPlaylist[] = playlistsData?.items || [];
  const pyramidRows = calcRows(tracks.length);
  const tileSize = calcTileSize(pyramidWidth, pyramidRows, 80, 120);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <Layout hideNav={false}>
      <div className="h-full overflow-y-auto px-3 pb-24">

        {/* ══ PICK VIEW ══ */}
        {view === "pick" && (
          <div className="max-w-lg mx-auto pt-2">
            <div className="mb-4">
              <label className="text-xs text-black/60 block mb-1">showcase title (optional)</label>
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                placeholder="my top 25, summer 2025, etc."
                className="w-full px-3 py-2 border border-black font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <div className="flex gap-4 mb-5">
              <label className="flex items-center gap-2 cursor-pointer font-mono text-sm">
                <input type="checkbox" checked={showSongs} onChange={e => setShowSongs(e.target.checked)} /> show songs
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-mono text-sm">
                <input type="checkbox" checked={showAlbums} onChange={e => setShowAlbums(e.target.checked)} /> show albums
              </label>
            </div>

            {!hasSpotify ? (
              <div className="border border-black p-5 bg-white text-center">
                <p className="mb-3 text-sm">connect spotify to pick from your playlists</p>
                <a href="/api/spotify/auth" className="inline-block px-4 py-2 border border-black bg-green-300 font-mono text-sm no-underline">
                  connect spotify
                </a>
              </div>
            ) : playlistsLoading ? (
              <p className="text-black/60 text-sm">loading your playlists...</p>
            ) : playlistsError ? (
              <div className="border border-black p-5 bg-white text-center">
                <p className="text-sm mb-3">couldn't load playlists — spotify may need reconnecting</p>
                <a href="/api/spotify/auth" className="inline-block px-4 py-2 border border-black bg-green-300 font-mono text-sm no-underline">
                  reconnect spotify
                </a>
              </div>
            ) : playlists.length === 0 ? (
              <p className="text-black/60 text-sm">no playlists found on your spotify account</p>
            ) : (
              <>
                <label className="text-xs text-black/60 block mb-2">choose a playlist</label>
                <div className="flex flex-col gap-2">
                  {playlists.map(pl => (
                    <div
                      key={pl.id}
                      onClick={() => buildFromPlaylist(pl)}
                      className="flex items-center gap-3 px-3 py-2 border border-black bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      {pl.images[0]?.url
                        ? <img src={pl.images[0].url} alt="" className="w-10 h-10 object-cover flex-shrink-0" />
                        : <div className="w-10 h-10 bg-gray-200 flex-shrink-0" />}
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-bold truncate">{pl.name}</div>
                        <div className="text-xs text-black/60">{pl.tracks.total} tracks</div>
                      </div>
                      <span className="text-xs text-black/40">→</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ BUILDING VIEW ══ */}
        {view === "building" && (
          <div className="text-center mt-20">
            <p className="text-base tracking-widest">BUILDING...</p>
            <p className="mt-3 text-black/60 text-sm">{buildStatus}</p>
          </div>
        )}

        {/* ══ SHOWCASE VIEW ══ */}
        {view === "showcase" && (
          <>
            <div className="text-center pt-1 pb-3">
              <div className="text-base font-bold tracking-widest mb-3">
                {showcaseTitle.toUpperCase()}
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                <button
                  onClick={() => { stopAudio(); setView("pick"); }}
                  className="px-3 py-1.5 border border-black bg-white font-mono text-xs hover:opacity-80"
                >
                  ← change playlist
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 border border-black bg-green-300 font-mono text-xs hover:opacity-80 disabled:opacity-50"
                >
                  {isSaving ? "saving..." : savedToken ? "update & share" : "save & share"}
                </button>
                {savedToken && (
                  <button
                    onClick={() => setShareUrl(`${window.location.origin}/shared/top25/${savedToken}`)}
                    className="px-3 py-1.5 border border-black bg-white font-mono text-xs hover:opacity-80"
                  >
                    copy link
                  </button>
                )}
              </div>
            </div>

            {/* Songs + Albums — side by side on desktop, stacked on mobile */}
            <div className="flex flex-col items-center lg:items-start lg:inline-flex lg:flex-row gap-5 mx-auto w-full" style={{ display: "flex", justifyContent: "center" }}>

              {/* Songs pyramid */}
              {showSongs && tracks.length > 0 && (
                <div className="flex-shrink-0 w-full lg:w-auto" ref={pyramidWrapRef}>
                  <h2 className="text-xs tracking-widest text-center mb-2">SONGS</h2>
                  <div ref={pyramidRef}>
                  {(() => {
                    let idx = 0;
                    return pyramidRows.map((count, rowIdx) => (
                      <div key={rowIdx} className="flex justify-center gap-1 mb-1">
                        {Array.from({ length: count }).map(() => {
                          const i = idx++;
                          const t = tracks[i];
                          const sz = rowIdx === 0 ? tileSize.first : tileSize.base;
                          const isPlaying = currentPlaying === i;
                          return (
                            <div
                              key={i}
                              draggable
                              onDragStart={e => { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "copy"; }}
                              onClick={() => playTrack(i, tracks)}
                              onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.pageX, y: e.pageY, index: i }); }}
                              className={`relative cursor-pointer flex-shrink-0 border ${isPlaying ? "border-green-400 outline outline-2 outline-green-500" : "border-black/20"}`}
                              style={{ width: sz, height: sz, background: t?.artwork ? "transparent" : "#ddd" }}
                            >
                              {t?.artwork && <img src={t.artwork} alt={t.name} className="w-full h-full object-cover block" />}
                              <span className="absolute bottom-0.5 right-1 text-white font-mono px-1" style={{ fontSize: rowIdx === 0 ? 11 : 9, background: "rgba(0,0,0,0.55)" }}>
                                #{i + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                  </div>
                  <div className="text-center mt-3 min-h-[36px] text-xs">
                    {nowPlaying
                      ? <><div className="font-bold">{nowPlaying.name}</div><div className="text-black/60">{nowPlaying.artist}</div></>
                      : <span className="text-black/60">click to play · right-click to fix</span>}
                  </div>
                </div>
              )}

              {/* Albums strip — wide rectangular bars, height matches pyramid */}
              {showAlbums && (
                <div className="flex-shrink-0">
                  <h2 className="text-xs tracking-widest text-center mb-2">ALBUMS</h2>
                  <div className="flex flex-col" style={{ width: 250, height: pyramidHeight || "auto" }}>
                    {Array.from({ length: 10 }).map((_, i) => {
                      const idx = 9 - i;
                      const a = albums[idx];
                      const slotH = pyramidHeight ? pyramidHeight / 10 : 56;
                      return (
                        <div
                          key={idx}
                          onClick={() => openAlbumModal(idx)}
                          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
                          onDrop={e => {
                            e.preventDefault();
                            const trackIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                            const t = tracks[trackIdx];
                            if (t) {
                              setAlbums(prev => prev.map((a, j) => j === idx ? { name: t.album, artist: t.artist, artwork: t.artwork } : a));
                              showToast(`added "${t.album}" to #${idx + 1}`);
                            }
                          }}
                          className="relative cursor-pointer group overflow-hidden"
                          style={{ width: 250, height: slotH }}
                        >
                          {a?.artwork
                            ? <img src={a.artwork} alt={a.name} className="w-full h-full object-cover block" draggable={false} />
                            : <div className="w-full h-full bg-gray-200" />}
                          {/* Number label */}
                          <span className="absolute top-1 left-1 bg-white text-black font-mono text-[10px] font-bold px-1 leading-normal">
                            #{idx + 1}
                          </span>
                          {/* Hover overlay with album name */}
                          {a && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center px-2">
                              <span className="text-white text-[11px] font-mono text-center leading-tight">
                                {a.name}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center mt-3 text-xs text-black/60">
                    drag song art here · click to search
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ MODALS ══ */}

        {/* Fix Song Modal */}
        <Dialog open={fixModal.open} onOpenChange={(open) => { if (!open) setFixModal({ open: false, index: null }); }}>
          <DialogContent className="max-w-sm">
            <DialogTitle>Fix Song</DialogTitle>
            <input
              autoFocus
              type="text"
              value={fixQuery}
              onChange={e => handleFixQueryChange(e.target.value)}
              placeholder="search for song..."
              className="w-full px-3 py-2 border border-black font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black mb-2"
            />
            <div className="text-center text-xs text-black/60 border-t border-gray-200 pt-2 mb-2">or paste a link</div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={fixLink}
                onChange={e => setFixLink(e.target.value)}
                placeholder="paste spotify or apple music link..."
                className="flex-1 px-3 py-2 border border-black font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button onClick={applyFixLink} className="px-3 py-2 border border-black bg-green-300 font-mono text-xs">apply</button>
            </div>
            <ResultsList results={fixResults} type="song" onSelect={selectFixResult} />
            {fixHint && <p className="text-xs text-black/60 text-center mt-2">{fixHint}</p>}
          </DialogContent>
        </Dialog>

        {/* Add Album Modal */}
        <Dialog open={albumModal.open} onOpenChange={(open) => { if (!open) setAlbumModal({ open: false, index: null }); }}>
          <DialogContent className="max-w-sm">
            <DialogTitle>Add Album</DialogTitle>
            <input
              autoFocus
              type="text"
              value={albumQuery}
              onChange={e => handleAlbumQueryChange(e.target.value)}
              placeholder="search for album..."
              className="w-full px-3 py-2 border border-black font-mono text-sm focus:outline-none focus:ring-1 focus:ring-black mb-2"
            />
            <ResultsList results={albumResults} type="album" onSelect={selectAlbumResult} />
            {albumHint && <p className="text-xs text-black/60 text-center mt-2">{albumHint}</p>}
          </DialogContent>
        </Dialog>

        {/* Share URL Modal */}
        <Dialog open={!!shareUrl} onOpenChange={(open) => { if (!open) setShareUrl(null); }}>
          <DialogContent className="max-w-sm">
            <DialogTitle>Saved!</DialogTitle>
            <p className="text-xs text-green-600 mb-2">share this link:</p>
            <input
              type="text"
              readOnly
              value={shareUrl || ""}
              className="w-full px-3 py-2 border border-black font-mono text-xs focus:outline-none"
              onFocus={e => e.target.select()}
            />
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(shareUrl!); showToast("copied!"); }
                catch { showToast("select the link and copy manually"); }
              }}
              className="w-full mt-2 px-3 py-2 border border-black bg-green-300 font-mono text-sm"
            >
              copy link
            </button>
          </DialogContent>
        </Dialog>

        {/* Context menu */}
        {ctxMenu && (
          <div
            onClick={e => e.stopPropagation()}
            className="fixed z-[1000] bg-white border border-black font-mono"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <div
              onClick={() => openFixModal(ctxMenu.index)}
              className="px-4 py-2 cursor-pointer text-xs hover:bg-green-300 transition-colors"
            >
              fix this song
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-2 text-xs font-mono z-[2000] pointer-events-none">
            {toast}
          </div>
        )}

        <audio ref={audioRef} preload="none" onEnded={stopAudio} />
      </div>
    </Layout>
  );
}

// ─── Shared (public, read-only) page ─────────────────────────────────────────
export function SharedTop25Page({ params }: { params: { token: string } }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<(AlbumSlot | null)[]>(Array(10).fill(null));
  const [title, setTitle] = useState("");
  const [showSongs, setShowSongs] = useState(true);
  const [showAlbums, setShowAlbums] = useState(true);
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [openAlbum, setOpenAlbum] = useState<AlbumSlot | null>(null);

  const sharedPyramidRef = useRef<HTMLDivElement>(null);
  const sharedPyramidWrapRef = useRef<HTMLDivElement>(null);
  const [sharedPyramidHeight, setSharedPyramidHeight] = useState(0);
  const [sharedPyramidWidth, setSharedPyramidWidth] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentPlaying, setCurrentPlaying] = useState<number | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{ name: string; artist: string } | null>(null);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    setCurrentPlaying(null); setNowPlaying(null);
  }, []);

  const playTrack = useCallback(async (i: number, list: Track[]) => {
    const t = list[i];
    if (!t) return;
    if (currentPlaying === i) { stopAudio(); return; }
    stopAudio();
    setCurrentPlaying(i);
    setNowPlaying({ name: t.name, artist: t.artist });

    const preview = t.preview || await getItunesPreview(t.name, t.artist);
    if (!preview) {
      setCurrentPlaying(null);
      setNowPlaying(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = preview;
      audioRef.current.play().catch(() => {});
    }
  }, [currentPlaying, stopAudio]);

  useEffect(() => {
    apiRequest("GET", `/api/shared/top25/${params.token}`)
      .then(s => {
        setTitle(s.title);
        setShowSongs(s.showSongs);
        setShowAlbums(s.showAlbums);
        setSpotifyPlaylistUrl(s.spotifyPlaylistUrl || null);
        setTracks(JSON.parse(s.tracksJson || "[]"));
        setAlbums(JSON.parse(s.albumsJson || "[]"));
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [params.token]);

  useEffect(() => {
    if (!sharedPyramidRef.current) return;
    const obs = new ResizeObserver(([entry]) => setSharedPyramidHeight(entry.contentRect.height));
    obs.observe(sharedPyramidRef.current);
    return () => obs.disconnect();
  }, [loading, showSongs, tracks.length]);

  useEffect(() => {
    if (!sharedPyramidWrapRef.current) return;
    const obs = new ResizeObserver(([entry]) => setSharedPyramidWidth(entry.contentRect.width));
    obs.observe(sharedPyramidWrapRef.current);
    return () => obs.disconnect();
  }, [loading, showSongs, tracks.length]);

  const pyramidRows = calcRows(tracks.length);
  const sharedTileSize = calcTileSize(sharedPyramidWidth, pyramidRows, 64, 100);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-black/60 font-mono text-sm">loading...</p>
    </div>
  );
  if (notFound) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="font-mono text-sm">showcase not found</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-mono pb-20">
      <div className="text-center px-4 pt-5 pb-4">
        {spotifyPlaylistUrl ? (
          <a
            href={spotifyPlaylistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-bold tracking-widest no-underline text-black hover:text-green-600 transition-colors"
          >
            {title.toUpperCase()}
          </a>
        ) : (
          <div className="text-base font-bold tracking-widest">{title.toUpperCase()}</div>
        )}
      </div>

      <div className="flex flex-col items-center lg:flex-row lg:justify-center lg:items-start gap-5 px-4 w-full">
        {showSongs && tracks.length > 0 && (
          <div className="flex-shrink-0 w-full lg:w-auto" ref={sharedPyramidWrapRef}>
            <h2 className="text-xs tracking-widest text-center mb-2">SONGS</h2>
            <div ref={sharedPyramidRef}>
            {(() => {
              let idx = 0;
              return pyramidRows.map((count, rowIdx) => (
                <div key={rowIdx} className="flex justify-center gap-1 mb-1">
                  {Array.from({ length: count }).map(() => {
                    const i = idx++;
                    const t = tracks[i];
                    const sz = rowIdx === 0 ? sharedTileSize.first : sharedTileSize.base;
                    return (
                      <div
                        key={i}
                        onClick={() => playTrack(i, tracks)}
                        className={`relative flex-shrink-0 border ${currentPlaying === i ? "border-green-400 outline outline-2 outline-green-500" : "border-black/20"}`}
                        style={{ width: sz, height: sz, cursor: "pointer", background: t?.artwork ? "transparent" : "#ddd" }}
                      >
                        {t?.artwork && <img src={t.artwork} alt={t.name} className="w-full h-full object-cover block" />}
                        <span className="absolute bottom-0.5 right-1 text-white font-mono px-1" style={{ fontSize: rowIdx === 0 ? 10 : 8, background: "rgba(0,0,0,0.55)" }}>
                          #{i + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
            </div>
            <div className="text-center mt-3 min-h-[36px] text-xs">
              {nowPlaying
                ? <><div className="font-bold">{nowPlaying.name}</div><div className="text-black/60">{nowPlaying.artist}</div></>
                : <span className="text-black/60">click to play</span>}
            </div>
          </div>
        )}

        {showAlbums && (
          <div className="flex-shrink-0">
            <h2 className="text-xs tracking-widest text-center mb-2">ALBUMS</h2>
            <div className="flex flex-col" style={{ width: 200, height: sharedPyramidHeight || "auto" }}>
              {Array.from({ length: 10 }).map((_, i) => {
                const idx = 9 - i;
                const a = albums[idx];
                const slotH = sharedPyramidHeight ? sharedPyramidHeight / 10 : 56;
                return (
                  <div
                    key={idx}
                    onClick={() => a && setOpenAlbum(a)}
                    className={`relative overflow-hidden group ${a ? "cursor-pointer" : ""}`}
                    style={{ width: 200, height: slotH }}
                  >
                    {a?.artwork
                      ? <img src={a.artwork} alt={a.name} className="w-full h-full object-cover block" />
                      : <div className="w-full h-full bg-gray-200" />}
                    <span className="absolute top-1 left-1 bg-white text-black font-mono text-[10px] font-bold px-1 leading-normal">
                      #{idx + 1}
                    </span>
                    {a && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center px-2">
                        <span className="text-white text-[10px] font-mono text-center leading-tight">
                          {a.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Album detail dialog */}
      <Dialog open={!!openAlbum} onOpenChange={(open) => { if (!open) setOpenAlbum(null); }}>
        <DialogContent className="max-w-xs">
          <DialogTitle className="sr-only">Album Details</DialogTitle>
          {openAlbum && (
            <>
              {openAlbum.artwork && (
                <img src={openAlbum.artwork} alt={openAlbum.name} className="w-full aspect-square object-cover mb-3" />
              )}
              <p className="text-center text-sm font-bold">{openAlbum.name}</p>
              <p className="text-center text-xs text-black/60 mb-4">{openAlbum.artist}</p>
              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(`${openAlbum.name} ${openAlbum.artist}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center no-underline px-4 py-2.5 border border-black bg-green-300 font-mono text-sm"
              >
                open in spotify
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>

      <audio ref={audioRef} preload="none" onEnded={stopAudio} />
    </div>
  );
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

function ResultsList({ results, type, onSelect }: { results: any[]; type: "song" | "album"; onSelect: (r: any) => void }) {
  return (
    <div className="max-h-60 overflow-y-auto">
      {results.map((r, i) => {
        const artwork = type === "song" ? (r.artworkUrl100 || "") : (r.imageUrl || "");
        const title = type === "song" ? r.trackName : r.name;
        const artist = type === "song" ? r.artistName : r.artist;
        return (
          <div
            key={i}
            onClick={() => onSelect(r)}
            className="flex gap-2 items-center py-2 px-1 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <img src={artwork} alt="" className="w-10 h-10 object-cover flex-shrink-0" />
            <div>
              <div className="text-xs font-bold">{title}</div>
              <div className="text-xs text-black/60">{artist}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
